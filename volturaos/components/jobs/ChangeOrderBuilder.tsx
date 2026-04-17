'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { PricebookEntry, LineItem, ChangeOrder } from '@/types'
import { updateChangeOrderItems } from '@/lib/actions/change-orders'
import { QuickAddSheet } from '@/components/estimate-builder/QuickAddSheet'
import { LineItemList } from '@/components/estimate-builder/LineItemList'
import { calculateTotal } from '@/components/estimate-builder/LiveTotal'

interface ChangeOrderBuilderProps {
  changeOrder: ChangeOrder
  originalEstimateName: string
  originalTotal: number
  pricebook: PricebookEntry[]
  initialRecents: PricebookEntry[]
  jobId: string
}

export function ChangeOrderBuilder({
  changeOrder,
  originalEstimateName,
  originalTotal,
  pricebook,
  initialRecents,
  jobId,
}: ChangeOrderBuilderProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [lineItems, setLineItems] = useState<LineItem[]>(
    (changeOrder.line_items ?? []) as LineItem[]
  )
  const [qaOpen, setQaOpen] = useState(false)

  const handleAdd = useCallback((items: LineItem[]) => {
    setLineItems((prev) => [...prev, ...items])
  }, [])

  const handleRemove = useCallback((index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const coTotal = calculateTotal([], lineItems, [], [])
  const combinedTotal = originalTotal + coTotal

  async function handlePresent() {
    startTransition(async () => {
      await updateChangeOrderItems(changeOrder.id, lineItems, coTotal)
      router.push(`/change-orders/${changeOrder.id}/view`)
    })
  }

  return (
    <div className="px-4 pb-8 space-y-4">
      {/* Context banner */}
      <div className="bg-volturaGold/6 border border-volturaGold/15 rounded-xl px-4 py-3">
        <p className="text-gray-400 text-xs">Adding to:</p>
        <p className="text-white font-semibold text-sm">{originalEstimateName}</p>
        <p className="text-gray-500 text-xs mt-0.5">Original: ${originalTotal.toLocaleString()} · Signed</p>
      </div>

      {/* Additional items */}
      <div>
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Additional Work</p>
        {lineItems.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-3">No items added yet</p>
        ) : (
          <LineItemList
            items={lineItems}
            pricebook={pricebook}
            onFootageChange={() => {}}
            onRemove={handleRemove}
          />
        )}
      </div>

      {/* Quick add */}
      <button
        onClick={() => setQaOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-volturaGold/10 border border-volturaGold/30 text-volturaGold font-semibold rounded-xl py-3 text-sm"
      >
        <span>⚡</span> Quick Add Item
      </button>

      <QuickAddSheet
        open={qaOpen}
        onClose={() => setQaOpen(false)}
        onAdd={handleAdd}
        pricebook={pricebook}
        initialRecents={initialRecents}
      />

      {/* Totals */}
      {lineItems.length > 0 && (
        <div className="bg-volturaNavy/50 rounded-xl p-4 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Change order</span>
            <span className="text-volturaGold font-semibold">${coTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-white/10 pt-1.5">
            <span className="text-gray-400">New job total</span>
            <span className="text-white font-bold">${combinedTotal.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Present button */}
      <button
        onClick={handlePresent}
        disabled={isPending || lineItems.length === 0}
        className="w-full bg-green-600 text-white font-bold py-3 rounded-xl text-base disabled:opacity-40"
      >
        {isPending ? 'Saving…' : 'Present to Customer →'}
      </button>
    </div>
  )
}
