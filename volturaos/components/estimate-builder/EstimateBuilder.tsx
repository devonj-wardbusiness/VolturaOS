'use client'

import { useState, useCallback } from 'react'
import type { PricebookEntry, LineItem, Addon, TierName, AIPageContext } from '@/types'
import { DEFAULT_ADDONS } from '@/types'
import { CustomerSelector } from './CustomerSelector'
import { PrimaryJobSelector } from './PrimaryJobSelector'
import { TierCards } from './TierCards'
import { CategoryGrid } from './CategoryGrid'
import { LineItemList } from './LineItemList'
import { AddOnsPanel } from './AddOnsPanel'
import { CustomLineItems } from './CustomLineItems'
import { LiveTotal, calculateTotal } from './LiveTotal'
import { SendSheet } from './SendSheet'
import { AIContextProvider } from './AIContextProvider'
import { saveEstimate } from '@/lib/actions/estimates'

interface EstimateBuilderProps {
  estimateId: string
  pricebook: PricebookEntry[]
  initialCustomerId?: string
  initialCustomerName?: string
  initialEstimate?: {
    tier_selected: TierName | null
    line_items: LineItem[] | null
    addons: Addon[] | null
    notes: string | null
    jobType?: string
  }
}

function buildTierLineItem(entry: PricebookEntry, tier: TierName): LineItem {
  const price = tier === 'good' ? entry.price_good : tier === 'better' ? entry.price_better : entry.price_best
  const desc = tier === 'good' ? entry.description_good : tier === 'better' ? entry.description_better : entry.description_best
  return {
    description: desc ?? entry.job_type,
    price: price ?? 0,
    is_override: false,
    original_price: price ?? 0,
    tier,
    category: entry.category,
    is_primary: true,
  }
}

export function EstimateBuilder({ estimateId, pricebook, initialCustomerId, initialCustomerName, initialEstimate }: EstimateBuilderProps) {
  // Customer
  const [customerId, setCustomerId] = useState(initialCustomerId ?? null)
  const [customerName, setCustomerName] = useState(initialCustomerName ?? null)

  // Primary job
  const [primaryJobType, setPrimaryJobType] = useState<string | null>(initialEstimate?.jobType ?? null)
  const [primaryTier, setPrimaryTier] = useState<TierName | null>(initialEstimate?.tier_selected ?? null)
  const [primarySkipped, setPrimarySkipped] = useState(false)
  const [tierLineItems, setTierLineItems] = useState<Record<TierName, LineItem>>({
    good: { description: '', price: 0, is_override: false, original_price: 0, tier: 'good' },
    better: { description: '', price: 0, is_override: false, original_price: 0, tier: 'better' },
    best: { description: '', price: 0, is_override: false, original_price: 0, tier: 'best' },
  })

  // Additional items
  const [additionalItems, setAdditionalItems] = useState<LineItem[]>(
    () => (initialEstimate?.line_items ?? []).filter((li) => !li.is_primary)
  )

  // Add-ons and custom items
  const [addons, setAddons] = useState<Addon[]>(
    initialEstimate?.addons ?? DEFAULT_ADDONS.map((a) => ({ ...a, selected: false }))
  )
  const [customItems, setCustomItems] = useState<LineItem[]>([])
  const [notes, setNotes] = useState(initialEstimate?.notes ?? '')

  // UI state
  const [sendOpen, setSendOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Primary job handlers
  const handlePrimaryJobSelect = useCallback((jobType: string) => {
    if (!jobType) {
      setPrimaryJobType(null)
      setPrimaryTier(null)
      return
    }
    const entry = pricebook.find((p) => p.job_type === jobType)
    if (!entry) return
    setPrimaryJobType(jobType)
    setPrimaryTier(null)
    setPrimarySkipped(false)
    setTierLineItems({
      good: buildTierLineItem(entry, 'good'),
      better: buildTierLineItem(entry, 'better'),
      best: buildTierLineItem(entry, 'best'),
    })
  }, [pricebook])

  const handleTierSelect = useCallback((tier: TierName) => {
    setPrimaryTier(tier)
  }, [])

  const handleTierPriceChange = useCallback((tier: TierName, newPrice: number) => {
    setTierLineItems((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], price: newPrice, is_override: newPrice !== prev[tier].original_price },
    }))
  }, [])

  const handleTierDescChange = useCallback((tier: TierName, desc: string) => {
    setTierLineItems((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], description: desc },
    }))
  }, [])

  // Additional item handlers
  const handleAddItem = useCallback((entry: PricebookEntry, tier: TierName) => {
    const price = tier === 'good' ? entry.price_good : tier === 'better' ? entry.price_better : entry.price_best
    const desc = tier === 'good' ? entry.description_good : tier === 'better' ? entry.description_better : entry.description_best
    const newItem: LineItem = {
      description: desc ?? entry.job_type,
      price: price ?? 0,
      is_override: false,
      original_price: price ?? 0,
      tier,
      category: entry.category,
      is_primary: false,
      footage: entry.is_footage_item ? null : undefined,
    }
    setAdditionalItems((prev) => [...prev, newItem])
  }, [])

  const handleAdditionalTierChange = useCallback((index: number, tier: TierName) => {
    setAdditionalItems((prev) => prev.map((item, i) => {
      if (i !== index) return item
      const entry = pricebook.find((p) =>
        p.job_type === item.description ||
        p.description_good === item.description ||
        p.description_better === item.description ||
        p.description_best === item.description
      )
      if (!entry) return { ...item, tier }
      const price = tier === 'good' ? entry.price_good : tier === 'better' ? entry.price_better : entry.price_best
      const desc = tier === 'good' ? entry.description_good : tier === 'better' ? entry.description_better : entry.description_best
      return {
        ...item,
        tier,
        price: item.footage ? Math.round((entry.per_foot_rate ?? 0) * item.footage) : (price ?? item.price),
        description: desc ?? entry.job_type,
        original_price: price ?? item.original_price,
      }
    }))
  }, [pricebook])

  const handleFootageChange = useCallback((index: number, footage: number | null, price: number) => {
    setAdditionalItems((prev) => prev.map((item, i) =>
      i === index ? { ...item, footage, price, is_override: footage !== null } : item
    ))
  }, [])

  const handleRemoveAdditional = useCallback((index: number) => {
    setAdditionalItems((prev) => prev.filter((_, i) => i !== index))
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

  // Build all line items for saving
  const primaryItems: LineItem[] = primaryTier ? [tierLineItems[primaryTier]] : []
  const allLineItems = [...primaryItems.map((li) => ({ ...li, is_primary: true })), ...additionalItems]
  const total = calculateTotal(primaryItems, additionalItems, addons, customItems)

  async function handleSave() {
    setSaving(true)
    try {
      await saveEstimate(estimateId, {
        tierSelected: primaryTier ?? undefined,
        lineItems: [...allLineItems, ...customItems],
        addons,
        subtotal: total,
        total,
        notes,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const aiContext: AIPageContext = {
    mode: 'estimate',
    jobType: primaryJobType ?? undefined,
    currentLineItems: allLineItems,
  }

  const hasItems = allLineItems.length > 0 || customItems.length > 0

  return (
    <AIContextProvider context={aiContext}>
      <div className="px-4 pt-4 pb-40 space-y-6">
        <CustomerSelector
          selectedId={customerId}
          selectedName={customerName}
          onSelect={(id, name) => { setCustomerId(id); setCustomerName(name) }}
        />

        {/* Primary job */}
        {!primarySkipped && (
          <>
            <PrimaryJobSelector
              pricebook={pricebook}
              selected={primaryJobType}
              onSelect={handlePrimaryJobSelect}
              onSkip={() => setPrimarySkipped(true)}
            />

            {primaryJobType && (
              <TierCards
                items={tierLineItems}
                selectedTier={primaryTier}
                onTierSelect={handleTierSelect}
                onPriceChange={handleTierPriceChange}
                onDescChange={handleTierDescChange}
              />
            )}
          </>
        )}

        {primarySkipped && (
          <div className="bg-volturaNavy/30 rounded-xl p-3 flex items-center justify-between">
            <p className="text-gray-500 text-sm">No primary job selected</p>
            <button onClick={() => setPrimarySkipped(false)} className="text-volturaGold text-xs">Add one</button>
          </div>
        )}

        {/* Category grid for additional items */}
        <CategoryGrid pricebook={pricebook} onAddItem={handleAddItem} />

        {/* Added line items */}
        <LineItemList
          items={additionalItems}
          pricebook={pricebook}
          onTierChange={handleAdditionalTierChange}
          onFootageChange={handleFootageChange}
          onRemove={handleRemoveAdditional}
        />

        <AddOnsPanel addons={addons} onToggle={handleAddonToggle} onPriceChange={handleAddonPriceChange} />
        <CustomLineItems items={customItems} onAdd={addCustomItem} onUpdate={updateCustomItem} onRemove={removeCustomItem} />

        <div>
          <label className="block text-gray-400 text-sm mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold" placeholder="Notes for this estimate..." />
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-volturaBlue border-t border-volturaNavy z-30 px-4 py-3">
        <LiveTotal primaryItems={primaryItems} additionalItems={additionalItems} addons={addons} customItems={customItems} />
        <div className="flex gap-2 mt-2">
          <button onClick={handleSave} disabled={saving || !hasItems} className="flex-1 bg-volturaNavy text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50">
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Draft'}
          </button>
          <button onClick={() => { handleSave(); setSendOpen(true) }} disabled={!hasItems} className="flex-1 bg-volturaGold text-volturaBlue py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
            Send
          </button>
        </div>
      </div>

      <SendSheet open={sendOpen} onClose={() => setSendOpen(false)} estimateId={estimateId} total={total} />
    </AIContextProvider>
  )
}
