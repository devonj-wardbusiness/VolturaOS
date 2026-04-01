'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { PricebookEntry, LineItem, Addon, AIPageContext, Estimate } from '@/types'
import { DEFAULT_ADDONS } from '@/types'
import { CustomerSelector } from './CustomerSelector'
import { PresentMode } from '@/components/estimates/PresentMode'
import { SuggestedItems } from './SuggestedItems'

const EstimateDownloadButton = dynamic(
  () => import('@/components/pdf/EstimateDownloadButton').then((m) => m.EstimateDownloadButton),
  { ssr: false, loading: () => null }
)
import { PrimaryJobSelector } from './PrimaryJobSelector'
import { CategoryGrid } from './CategoryGrid'
import { LineItemList } from './LineItemList'
import { AddOnsPanel } from './AddOnsPanel'
import { CustomLineItems } from './CustomLineItems'
import { LiveTotal, calculateTotal } from './LiveTotal'
import { SendSheet } from './SendSheet'
import { AIContextProvider } from './AIContextProvider'
import { saveEstimate, duplicateEstimate, deleteEstimate } from '@/lib/actions/estimates'
import { createInvoiceFromEstimate } from '@/lib/actions/invoices'

interface EstimateBuilderProps {
  estimateId: string
  pricebook: PricebookEntry[]
  initialCustomerId?: string
  initialCustomerName?: string
  estimateCreatedAt?: string
  proposalCount: number
  proposalEstimates: Estimate[]
  linkedInvoiceId?: string | null
  initialEstimate?: {
    name: string
    status?: string
    line_items: LineItem[] | null
    addons: Addon[] | null
    notes: string | null
    includes_permit: boolean
    includes_cleanup: boolean
    includes_warranty: boolean
  }
}

export function EstimateBuilder({
  estimateId,
  pricebook,
  initialCustomerId,
  initialCustomerName,
  estimateCreatedAt,
  proposalCount,
  proposalEstimates,
  linkedInvoiceId,
  initialEstimate,
}: EstimateBuilderProps) {
  const router = useRouter()

  // Customer
  const [customerId, setCustomerId] = useState(initialCustomerId ?? null)
  const [customerName, setCustomerName] = useState(initialCustomerName ?? null)

  // Estimate name
  const [estimateName, setEstimateName] = useState(initialEstimate?.name ?? 'Estimate')

  // Primary job type (for AI context only, no tier)
  const [primaryJobType, setPrimaryJobType] = useState<string | null>(null)
  const [primarySkipped, setPrimarySkipped] = useState(
    () => (initialEstimate?.line_items ?? []).length > 0
  )

  // Line items (flat, no tiers)
  const [lineItems, setLineItems] = useState<LineItem[]>(
    () => initialEstimate?.line_items ?? []
  )

  // Add-ons and custom items
  const [addons, setAddons] = useState<Addon[]>(
    initialEstimate?.addons ?? DEFAULT_ADDONS.map((a) => ({ ...a, selected: false }))
  )
  const [customItems, setCustomItems] = useState<LineItem[]>([])
  const [notes, setNotes] = useState(initialEstimate?.notes ?? '')

  // Badge toggles
  const [includesPermit, setIncludesPermit] = useState(initialEstimate?.includes_permit ?? false)
  const [includesCleanup, setIncludesCleanup] = useState(initialEstimate?.includes_cleanup ?? true)
  const [includesWarranty, setIncludesWarranty] = useState(initialEstimate?.includes_warranty ?? true)

  // UI state
  const [sendOpen, setSendOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [presenting, setPresenting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [invoicing, setInvoicing] = useState(false)

  // Primary job handler (adds as flat line item, no tier)
  const handlePrimaryJobSelect = useCallback((jobType: string) => {
    setPrimaryJobType(jobType || null)
    setPrimarySkipped(true)
    const entry = pricebook.find((p) => p.job_type === jobType)
    if (!entry) return
    const price = entry.price_good ?? 0
    setLineItems((prev) => [
      { description: entry.job_type, price, is_override: false, original_price: price, pricebook_description: entry.description_good ?? entry.description_better ?? entry.description_best ?? undefined, category: entry.category },
      ...prev,
    ])
  }, [pricebook])

  // Additional item from category grid
  const handleAddItem = useCallback((entry: PricebookEntry) => {
    const price = entry.price_good ?? 0
    setLineItems((prev) => [...prev, {
      description: entry.job_type,
      price,
      is_override: false,
      original_price: price,
      pricebook_description: entry.description_good ?? entry.description_better ?? entry.description_best ?? undefined,
      category: entry.category,
      footage: entry.is_footage_item ? null : undefined,
    }])
  }, [])

  const handleFootageChange = useCallback((index: number, footage: number | null, price: number) => {
    setLineItems((prev) => prev.map((item, i) =>
      i === index ? { ...item, footage, price, is_override: footage !== null } : item
    ))
  }, [])

  const handleRemoveItem = useCallback((index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Add AI suggestion as custom line item
  const handleAddSuggestion = useCallback((name: string, price: number) => {
    setCustomItems((prev) => [...prev, { description: name, price, is_override: false, original_price: price }])
  }, [])

  // Addon handlers
  const handleAddonToggle = useCallback((index: number) => {
    setAddons((prev) => prev.map((a, i) => i === index ? { ...a, selected: !a.selected } : a))
  }, [])

  const handleAddonPriceChange = useCallback((index: number, price: number) => {
    setAddons((prev) => prev.map((a, i) => i === index ? { ...a, price } : a))
  }, [])

  // Custom item handlers
  const addCustomItem = useCallback(() => {
    setCustomItems((prev) => [...prev, { description: 'Custom item', price: 0, is_override: false, original_price: null }])
  }, [])

  const updateCustomItem = useCallback((index: number, updates: Partial<LineItem>) => {
    setCustomItems((prev) => prev.map((item, i) => i === index ? { ...item, ...updates } : item))
  }, [])

  const removeCustomItem = useCallback((index: number) => {
    setCustomItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const allLineItems = [...lineItems, ...customItems]
  const total = calculateTotal([], lineItems, addons, customItems)

  async function handleSave() {
    setSaving(true)
    try {
      await saveEstimate(estimateId, {
        name: estimateName,
        lineItems: allLineItems,
        addons,
        subtotal: total,
        total,
        notes,
        includesPermit,
        includesCleanup,
        includesWarranty,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this estimate? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteEstimate(estimateId)
      router.push('/estimates')
    } catch {
      alert('Failed to delete estimate.')
      setDeleting(false)
    }
  }

  async function handleDuplicate() {
    if (duplicating || proposalCount >= 3) return
    setDuplicating(true)
    try {
      const newEst = await duplicateEstimate(estimateId)
      router.push(`/estimates/${newEst.id}`)
    } catch (e) {
      alert((e as Error).message)
      setDuplicating(false)
    }
  }

  async function handleCreateInvoice() {
    if (invoicing) return
    setInvoicing(true)
    try {
      const inv = await createInvoiceFromEstimate(estimateId)
      router.push(`/invoices/${inv.id}`)
    } catch {
      alert('Failed to create invoice. Please try again.')
    } finally {
      setInvoicing(false)
    }
  }

  const aiContext: AIPageContext = {
    mode: 'estimate',
    jobType: primaryJobType ?? undefined,
    currentLineItems: allLineItems,
  }

  const hasItems = allLineItems.length > 0

  return (
    <AIContextProvider context={aiContext}>
      <div className="px-4 pt-4 pb-40 space-y-6">

        {/* Estimate name + duplicate button */}
        <div className="flex items-center justify-between">
          <input
            type="text"
            value={estimateName}
            onChange={(e) => setEstimateName(e.target.value)}
            onBlur={() => { if (!estimateName.trim()) setEstimateName('Estimate') }}
            maxLength={100}
            placeholder="Name this estimate…"
            className="bg-transparent text-white font-semibold text-lg flex-1 focus:outline-none placeholder:text-gray-600"
          />
          <button
            onClick={handleDuplicate}
            disabled={duplicating || proposalCount >= 3 || saving}
            title={proposalCount >= 3 ? 'Max 3 per proposal' : 'Duplicate this estimate'}
            className="text-volturaGold text-xs font-semibold border border-volturaGold/40 px-2.5 py-1 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed ml-3 shrink-0"
          >
            {duplicating ? 'Copying…' : 'Duplicate'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-400 text-xs font-semibold border border-red-400/30 px-2.5 py-1 rounded-lg disabled:opacity-40 ml-1 shrink-0"
          >
            {deleting ? '…' : 'Delete'}
          </button>
        </div>

        <CustomerSelector
          selectedId={customerId}
          selectedName={customerName}
          onSelect={(id, name) => { setCustomerId(id); setCustomerName(name) }}
        />

        {/* Primary job (optional) */}
        {!primarySkipped && (
          <PrimaryJobSelector
            pricebook={pricebook}
            selected={primaryJobType}
            onSelect={handlePrimaryJobSelect}
            onSkip={() => setPrimarySkipped(true)}
          />
        )}

        {primarySkipped && !primaryJobType && (
          <div className="bg-volturaNavy/30 rounded-xl p-3 flex items-center justify-between">
            <p className="text-gray-500 text-sm">No primary job selected</p>
            <button onClick={() => setPrimarySkipped(false)} className="text-volturaGold text-xs">Add one</button>
          </div>
        )}

        {/* Category grid */}
        <CategoryGrid pricebook={pricebook} onAddItem={handleAddItem} />

        {/* AI suggested items */}
        <SuggestedItems
          currentLineItems={allLineItems}
          onAdd={handleAddSuggestion}
        />

        {/* Line items */}
        <LineItemList
          items={lineItems}
          pricebook={pricebook}
          onFootageChange={handleFootageChange}
          onRemove={handleRemoveItem}
        />

        {/* Badge toggles */}
        <div className="flex gap-2 flex-wrap mt-3 mb-2">
          {([
            { key: 'permit', label: '📋 Permit', value: includesPermit, set: setIncludesPermit },
            { key: 'cleanup', label: '🧹 Cleanup', value: includesCleanup, set: setIncludesCleanup },
            { key: 'warranty', label: '🛡 Warranty', value: includesWarranty, set: setIncludesWarranty },
          ] as const).map(({ key, label, value, set }) => (
            <button
              key={key}
              onClick={() => set(v => !v)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                value
                  ? 'bg-volturaGold text-volturaBlue border-volturaGold'
                  : 'bg-transparent text-gray-500 border-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <AddOnsPanel addons={addons} onToggle={handleAddonToggle} onPriceChange={handleAddonPriceChange} />
        <CustomLineItems items={customItems} onAdd={addCustomItem} onUpdate={updateCustomItem} onRemove={removeCustomItem} />

        <div>
          <label className="block text-gray-400 text-sm mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold"
            placeholder="Notes for this estimate..."
          />
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-volturaBlue border-t border-volturaNavy z-30 px-4 py-3">
        <LiveTotal primaryItems={[]} additionalItems={lineItems} addons={addons} customItems={customItems} />
        <div className="flex gap-2 mt-2">
          <button onClick={handleSave} disabled={saving || !hasItems} className="flex-1 bg-volturaNavy text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50">
            {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Draft'}
          </button>
          <button
            onClick={() => setPresenting(true)}
            disabled={!hasItems}
            className="flex-1 bg-white/10 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 border border-white/20"
          >
            Present
          </button>
          <button onClick={() => { handleSave(); setSendOpen(true) }} disabled={!hasItems} className="flex-1 bg-volturaGold text-volturaBlue py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
            Send
          </button>
        </div>
        {initialEstimate?.status === 'Approved' && (
          linkedInvoiceId ? (
            <button
              onClick={() => router.push(`/invoices/${linkedInvoiceId}`)}
              className="w-full bg-green-700 text-white font-bold py-3 rounded-xl mt-2"
            >
              View Invoice
            </button>
          ) : (
            <button
              onClick={handleCreateInvoice}
              disabled={invoicing}
              className="w-full bg-green-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 mt-2"
            >
              {invoicing ? 'Creating...' : '💰 Create Invoice'}
            </button>
          )
        )}
        {hasItems && estimateCreatedAt && (
          <div className="mt-2">
            <EstimateDownloadButton
              estimateId={estimateId}
              customerName={customerName ?? 'Customer'}
              lineItems={allLineItems}
              addons={addons}
              total={total}
              notes={notes}
              createdAt={estimateCreatedAt}
            />
          </div>
        )}
      </div>

      <SendSheet open={sendOpen} onClose={() => setSendOpen(false)} estimateId={estimateId} total={total} />

      {presenting && (
        <PresentMode
          estimateId={estimateId}
          customerName={customerName}
          proposalEstimates={proposalEstimates.map((e) =>
            e.id === estimateId
              ? { ...e, name: estimateName, line_items: allLineItems, addons, total, includes_permit: includesPermit, includes_cleanup: includesCleanup, includes_warranty: includesWarranty }
              : e
          )}
          lineItems={lineItems}
          addons={addons}
          customItems={customItems}
          includesPermit={includesPermit}
          includesCleanup={includesCleanup}
          includesWarranty={includesWarranty}
          onClose={() => setPresenting(false)}
          onApproved={() => {
            setPresenting(false)
            window.location.reload()
          }}
        />
      )}
    </AIContextProvider>
  )
}
