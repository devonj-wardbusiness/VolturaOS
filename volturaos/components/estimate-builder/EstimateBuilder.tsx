'use client'

import { useState, useCallback } from 'react'
import type { PricebookEntry, LineItem, Addon, TierName, AIPageContext } from '@/types'
import { DEFAULT_ADDONS } from '@/types'
import { CustomerSelector } from './CustomerSelector'
import { JobTypeSelector } from './JobTypeSelector'
import { TierCards } from './TierCards'
import { AddOnsPanel } from './AddOnsPanel'
import { CustomLineItems } from './CustomLineItems'
import { LiveTotal } from './LiveTotal'
import { SendSheet } from './SendSheet'
import { AIContextProvider } from './AIContextProvider'
import { saveEstimate } from '@/lib/actions/estimates'

export function calculateTotal(lineItems: LineItem[], addons: Addon[]): number {
  const lineTotal = lineItems.reduce((sum, item) => sum + item.price, 0)
  const addonTotal = addons.filter((a) => a.selected).reduce((sum, a) => sum + a.price, 0)
  return lineTotal + addonTotal
}

interface EstimateState {
  customerId: string | null
  customerName: string | null
  jobType: string | null
  selectedTier: TierName | null
  tierLineItems: Record<TierName, LineItem>
  addons: Addon[]
  customItems: LineItem[]
  notes: string
}

function buildTierLineItem(entry: PricebookEntry, tier: TierName): LineItem {
  const price = tier === 'good' ? entry.price_good : tier === 'better' ? entry.price_better : entry.price_best
  const desc = tier === 'good' ? entry.description_good : tier === 'better' ? entry.description_better : entry.description_best
  return { description: desc ?? entry.job_type, price: price ?? 0, is_override: false, original_price: price ?? 0, tier }
}

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

export function EstimateBuilder({ estimateId, pricebook, initialCustomerId, initialCustomerName, initialEstimate }: EstimateBuilderProps) {
  const [state, setState] = useState<EstimateState>({
    customerId: initialCustomerId ?? null,
    customerName: initialCustomerName ?? null,
    jobType: initialEstimate?.jobType ?? null,
    selectedTier: initialEstimate?.tier_selected ?? null,
    tierLineItems: {
      good: { description: '', price: 0, is_override: false, original_price: 0, tier: 'good' },
      better: { description: '', price: 0, is_override: false, original_price: 0, tier: 'better' },
      best: { description: '', price: 0, is_override: false, original_price: 0, tier: 'best' },
    },
    addons: initialEstimate?.addons ?? DEFAULT_ADDONS.map((a) => ({ ...a, selected: false })),
    customItems: [],
    notes: initialEstimate?.notes ?? '',
  })
  const [sendOpen, setSendOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleJobTypeSelect = useCallback((jobType: string) => {
    const entry = pricebook.find((p) => p.job_type === jobType)
    if (!entry) return
    setState((prev) => ({
      ...prev, jobType, selectedTier: null,
      tierLineItems: { good: buildTierLineItem(entry, 'good'), better: buildTierLineItem(entry, 'better'), best: buildTierLineItem(entry, 'best') },
    }))
  }, [pricebook])

  const handleTierSelect = useCallback((tier: TierName) => {
    setState((prev) => ({ ...prev, selectedTier: tier }))
  }, [])

  const handleTierPriceChange = useCallback((tier: TierName, newPrice: number) => {
    setState((prev) => ({
      ...prev,
      tierLineItems: {
        ...prev.tierLineItems,
        [tier]: { ...prev.tierLineItems[tier], price: newPrice, is_override: newPrice !== prev.tierLineItems[tier].original_price },
      },
    }))
  }, [])

  const handleTierDescChange = useCallback((tier: TierName, desc: string) => {
    setState((prev) => ({
      ...prev,
      tierLineItems: { ...prev.tierLineItems, [tier]: { ...prev.tierLineItems[tier], description: desc } },
    }))
  }, [])

  const handleAddonToggle = useCallback((index: number) => {
    setState((prev) => ({
      ...prev, addons: prev.addons.map((a, i) => i === index ? { ...a, selected: !a.selected } : a),
    }))
  }, [])

  const handleAddonPriceChange = useCallback((index: number, price: number) => {
    setState((prev) => ({
      ...prev, addons: prev.addons.map((a, i) => i === index ? { ...a, price } : a),
    }))
  }, [])

  const addCustomItem = useCallback(() => {
    setState((prev) => ({
      ...prev, customItems: [...prev.customItems, { description: 'Custom item', price: 0, is_override: false, original_price: null }],
    }))
  }, [])

  const updateCustomItem = useCallback((index: number, updates: Partial<LineItem>) => {
    setState((prev) => ({
      ...prev, customItems: prev.customItems.map((item, i) => i === index ? { ...item, ...updates } : item),
    }))
  }, [])

  const removeCustomItem = useCallback((index: number) => {
    setState((prev) => ({ ...prev, customItems: prev.customItems.filter((_, i) => i !== index) }))
  }, [])

  const activeLineItems: LineItem[] = state.selectedTier
    ? [state.tierLineItems[state.selectedTier], ...state.customItems]
    : [...state.customItems]

  const total = calculateTotal(activeLineItems, state.addons)

  async function handleSave() {
    setSaving(true)
    try {
      await saveEstimate(estimateId, {
        tierSelected: state.selectedTier ?? undefined,
        lineItems: activeLineItems,
        addons: state.addons,
        subtotal: total,
        total,
        notes: state.notes,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const aiContext: AIPageContext = {
    mode: 'estimate',
    jobType: state.jobType ?? undefined,
    currentLineItems: activeLineItems,
  }

  return (
    <AIContextProvider context={aiContext}>
      <div className="px-4 pt-4 pb-40 space-y-6">
        <CustomerSelector
          selectedId={state.customerId}
          selectedName={state.customerName}
          onSelect={(id, name) => setState((prev) => ({ ...prev, customerId: id, customerName: name }))}
        />

        <JobTypeSelector pricebook={pricebook} selected={state.jobType} onSelect={handleJobTypeSelect} />

        {state.jobType && (
          <TierCards
            items={state.tierLineItems}
            selectedTier={state.selectedTier}
            onTierSelect={handleTierSelect}
            onPriceChange={handleTierPriceChange}
            onDescChange={handleTierDescChange}
          />
        )}

        <AddOnsPanel addons={state.addons} onToggle={handleAddonToggle} onPriceChange={handleAddonPriceChange} />
        <CustomLineItems items={state.customItems} onAdd={addCustomItem} onUpdate={updateCustomItem} onRemove={removeCustomItem} />

        <div>
          <label className="block text-gray-400 text-sm mb-1">Notes</label>
          <textarea value={state.notes} onChange={(e) => setState((prev) => ({ ...prev, notes: e.target.value }))} rows={3}
            className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold" placeholder="Notes for this estimate..." />
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-volturaBlue border-t border-volturaNavy z-30 px-4 py-3">
        <LiveTotal lineItems={activeLineItems} addons={state.addons} />
        <div className="flex gap-2 mt-2">
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-volturaNavy text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50">
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Draft'}
          </button>
          <button onClick={() => { handleSave(); setSendOpen(true) }} className="flex-1 bg-volturaGold text-volturaBlue py-2.5 rounded-xl font-bold text-sm">
            Send
          </button>
        </div>
      </div>

      <SendSheet open={sendOpen} onClose={() => setSendOpen(false)} estimateId={estimateId} total={total} />
    </AIContextProvider>
  )
}
