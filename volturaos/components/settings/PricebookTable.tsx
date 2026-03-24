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

  function handlePriceChange(id: string, field: 'price_good' | 'price_better' | 'price_best', value: number) {
    startTransition(async () => {
      await updatePricebookPrice(id, field, value)
      setSaved(id + field)
      setTimeout(() => setSaved(null), 1500)
    })
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h2 className="text-white font-semibold text-sm mb-2 sticky top-0 bg-volturaBlue py-1">{category}</h2>
          <div className="space-y-2">
            {items.map((entry) => (
              <div key={entry.id} className="bg-volturaNavy/50 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-white font-semibold text-sm">{entry.job_type}</p>
                  {entry.is_footage_item && (
                    <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">
                      ${entry.per_foot_rate}/ft
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(['price_good', 'price_better', 'price_best'] as const).map((field) => {
                    const label = field === 'price_good' ? 'Good' : field === 'price_better' ? 'Better' : 'Best'
                    const val = entry[field]
                    if (val === null) return <div key={field} className="text-gray-600 text-xs">—</div>
                    return (
                      <div key={field}>
                        <p className="text-gray-500 text-xs mb-1">{label}</p>
                        <EditablePrice
                          value={val}
                          onChange={(v) => handlePriceChange(entry.id, field, v)}
                          size="sm"
                        />
                        {saved === entry.id + field && (
                          <span className="text-green-400 text-xs">✓ Saved</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
