'use client'

import { useState, useTransition } from 'react'
import type { PricebookEntry } from '@/types'
import { EditablePrice } from '@/components/ui/EditablePrice'
import { updatePricebookPrice } from '@/lib/actions/pricebook'

export function PricebookTable({ entries }: { entries: PricebookEntry[] }) {
  const [saved, setSaved] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Group by category
  const grouped: Record<string, PricebookEntry[]> = {}
  for (const entry of entries) {
    const cat = entry.category || 'Uncategorized'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(entry)
  }

  function handlePriceChange(id: string, value: number) {
    startTransition(async () => {
      await updatePricebookPrice(id, 'price_better', value)
      setSaved(id)
      setTimeout(() => setSaved(null), 1500)
    })
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h2 className="text-white font-semibold text-sm mb-2 sticky top-0 bg-volturaBlue py-1">{category}</h2>
          <div className="space-y-2">
            {items.map((entry) => {
              const price = entry.price_better ?? entry.price_good ?? 0
              return (
                <div key={entry.id} className="bg-volturaNavy/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-semibold text-sm flex-1 mr-4">{entry.job_type}</p>
                    <div className="flex items-center gap-3">
                      {entry.is_footage_item && (
                        <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">
                          ${entry.per_foot_rate}/ft
                        </span>
                      )}
                      <div>
                        <EditablePrice
                          value={price}
                          onChange={(v) => handlePriceChange(entry.id, v)}
                          size="sm"
                        />
                        {saved === entry.id && (
                          <span className="text-green-400 text-xs ml-1">✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
