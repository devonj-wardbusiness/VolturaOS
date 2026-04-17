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
import { saveEstimate, duplicateEstimate, deleteEstimate, saveAsTemplate, dismissFollowUp } from '@/lib/actions/estimates'
import { QuickAddSheet } from './QuickAddSheet'
import { InPersonSignature } from '@/components/estimates/InPersonSignature'
import { MaterialList } from '@/components/estimates/MaterialList'
import { SavingsCalculator } from '@/components/estimates/SavingsCalculator'
import { PhotoEstimate } from './PhotoEstimate'
import { createInvoiceFromEstimate } from '@/lib/actions/invoices'
import { DiscountsSection } from './DiscountsSection'

interface EstimateBuilderProps {
  estimateId: string
  pricebook: PricebookEntry[]
  initialRecents: PricebookEntry[]
  initialCustomerId?: string
  initialCustomerName?: string
  initialCustomerPhone?: string | null
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
    follow_up_days?: number
    follow_up_sent_at?: string | null
    follow_up_dismissed?: boolean
    signed_at?: string | null
    signer_name?: string | null
  }
}

export function EstimateBuilder({
  estimateId,
  pricebook,
  initialRecents,
  initialCustomerId,
  initialCustomerName,
  initialCustomerPhone,
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

  const [followUpDays, setFollowUpDays] = useState(initialEstimate?.follow_up_days ?? 3)

  // Margin calculator (local only, not saved)
  const [myCost, setMyCost] = useState('')
  const [showMargin, setShowMargin] = useState(false)

  // UI state
  const [sendOpen, setSendOpen] = useState(false)
  const [qaOpen, setQaOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [presenting, setPresenting] = useState(false)
  const [signingInPerson, setSigningInPerson] = useState(false)
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

  // Quick add handler (from QuickAddSheet — voice / search / recents)
  const handleQuickAdd = useCallback((items: LineItem[]) => {
    setLineItems((prev) => [...prev, ...items])
  }, [])

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

  // Price override from line item tap (optionally also saves to pricebook)
  const handlePriceUpdate = useCallback((index: number, price: number) => {
    setLineItems((prev) => prev.map((item, i) =>
      i === index ? { ...item, price, is_override: true, original_price: item.original_price ?? item.price } : item
    ))
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

  const addDiscount = useCallback((description: string, amount: number) => {
    setCustomItems((prev) => [...prev, { description, price: amount, is_override: false, original_price: null }])
  }, [])

  const allLineItems = [...lineItems, ...customItems]
  const total = calculateTotal([], lineItems, addons, customItems)
  // Subtotal of positive items only — used as base for discount calculations
  const positiveSubtotal = calculateTotal([], lineItems, addons, customItems.filter((i) => i.price > 0))

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
        followUpDays,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAsTemplate() {
    const templateName = window.prompt('Template name:', estimateName)
    if (!templateName?.trim()) return
    try {
      await saveAsTemplate(estimateId, templateName.trim())
      alert('Template saved!')
    } catch {
      alert('Failed to save template.')
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
      // Auto-save current state first so the duplicate gets the latest data
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
        followUpDays,
      })
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
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={estimateName}
              onChange={(e) => setEstimateName(e.target.value)}
              onBlur={() => { if (!estimateName.trim()) setEstimateName('Estimate') }}
              maxLength={100}
              placeholder="Name this estimate…"
              className="bg-transparent text-white font-semibold text-lg w-full focus:outline-none placeholder:text-gray-600"
            />
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-500 text-xs">Follow up in</span>
              <input
                type="number"
                min={1}
                max={30}
                value={followUpDays}
                onChange={e => setFollowUpDays(Number(e.target.value))}
                className="w-12 bg-volturaNavy text-white text-xs rounded px-2 py-1 text-center"
              />
              <span className="text-gray-500 text-xs">days</span>
            </div>
          </div>
          <button
            onClick={handleSaveAsTemplate}
            title="Save as template"
            className="text-gray-500 hover:text-volturaGold text-lg px-2 flex-shrink-0"
          >
            🔖
          </button>
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

        {initialEstimate?.follow_up_sent_at && !initialEstimate?.follow_up_dismissed && (
          <div className="flex items-center justify-between bg-volturaNavy/80 rounded-xl px-4 py-2">
            <span className="text-yellow-400 text-xs">
              🔔 Follow-up sent {new Date(initialEstimate.follow_up_sent_at!).toLocaleDateString()}
            </span>
            <button
              onClick={async () => {
                await dismissFollowUp(estimateId)
                router.refresh()
              }}
              className="text-gray-500 text-xs ml-3"
            >
              Dismiss
            </button>
          </div>
        )}

        <CustomerSelector
          selectedId={customerId}
          selectedName={customerName}
          onSelect={(id, name) => { setCustomerId(id); setCustomerName(name) }}
        />
        {customerId && (
          <div className="flex gap-2 -mt-4">
            <button
              type="button"
              onClick={() => router.push(`/jobs/new?customerId=${customerId}`)}
              className="text-volturaGold text-xs border border-volturaGold/30 px-3 py-1.5 rounded-lg"
            >
              + Schedule Job
            </button>
            <button
              type="button"
              onClick={() => router.push(`/customers/${customerId}`)}
              className="text-gray-400 text-xs border border-white/10 px-3 py-1.5 rounded-lg"
            >
              View Customer
            </button>
          </div>
        )}

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

        {/* Quick Add — primary entry point */}
        <button
          onClick={() => setQaOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-volturaGold/10 border border-volturaGold/30 text-volturaGold font-semibold rounded-xl py-3 text-sm active:scale-[0.98] transition-transform"
        >
          <span>⚡</span> Quick Add Item
        </button>

        <QuickAddSheet
          open={qaOpen}
          onClose={() => setQaOpen(false)}
          onAdd={handleQuickAdd}
          pricebook={pricebook}
          initialRecents={initialRecents}
        />

        {/* Category grid — still available as secondary */}
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
          onPriceUpdate={handlePriceUpdate}
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
        <DiscountsSection subtotal={positiveSubtotal} onAddDiscount={addDiscount} />

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
        {/* Margin calculator */}
        {showMargin ? (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-400 text-xs">My cost $</span>
            <input
              type="number"
              min={0}
              value={myCost}
              onChange={e => setMyCost(e.target.value)}
              placeholder="0"
              className="w-24 bg-volturaNavy text-white rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-volturaGold/50"
            />
            {myCost && Number(myCost) > 0 && total > 0 && (
              <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                ((total - Number(myCost)) / total) >= 0.35
                  ? 'text-green-400 bg-green-900/30'
                  : ((total - Number(myCost)) / total) >= 0.20
                  ? 'text-yellow-400 bg-yellow-900/20'
                  : 'text-red-400 bg-red-900/20'
              }`}>
                {Math.round(((total - Number(myCost)) / total) * 100)}% margin
              </span>
            )}
            <button onClick={() => setShowMargin(false)} className="ml-auto text-gray-500 text-xs">Done</button>
          </div>
        ) : (
          <button onClick={() => setShowMargin(true)} className="text-gray-500 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
            <span>📊</span> Margin
          </button>
        )}
        <div className="flex items-center justify-between mb-1">
          <LiveTotal primaryItems={[]} additionalItems={lineItems} addons={addons} customItems={customItems} />
          <div className="flex items-center gap-3">
            <SavingsCalculator lineItems={lineItems} addons={addons} />
            <PhotoEstimate
              onAddItems={(items) => {
                items.forEach((item) => {
                  setCustomItems((prev) => [
                    ...prev,
                    { description: item.description, price: item.price, is_override: false, original_price: item.price },
                  ])
                })
              }}
            />
            <MaterialList lineItems={lineItems} />
          </div>
        </div>
        {/* Signed badge */}
        {initialEstimate?.signed_at && (
          <div className="flex items-center gap-2 bg-green-900/30 border border-green-500/30 rounded-xl px-4 py-2 mb-2">
            <span className="text-green-400 text-sm">✍️ Signed</span>
            {initialEstimate.signer_name && (
              <span className="text-green-300 text-sm font-semibold">{initialEstimate.signer_name}</span>
            )}
            <span className="text-green-600 text-xs ml-auto">
              {new Date(initialEstimate.signed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        )}

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
          {!initialEstimate?.signed_at && hasItems ? (
            <button
              onClick={() => { handleSave(); setSigningInPerson(true) }}
              disabled={!hasItems}
              className="flex-1 bg-volturaGold text-volturaBlue py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
            >
              ✍️ Sign
            </button>
          ) : (
            <button onClick={() => { handleSave(); setSendOpen(true) }} disabled={!hasItems} className="flex-1 bg-volturaGold text-volturaBlue py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
              Send
            </button>
          )}
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

      <SendSheet open={sendOpen} onClose={() => setSendOpen(false)} estimateId={estimateId} total={total} customerPhone={initialCustomerPhone ?? null} customerName={customerName ?? 'Customer'} />

      {signingInPerson && (
        <InPersonSignature
          estimateId={estimateId}
          customerName={customerName}
          total={total}
          estimateName={estimateName}
          onClose={() => setSigningInPerson(false)}
          onSigned={() => {
            setSigningInPerson(false)
            window.location.reload()
          }}
        />
      )}

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
