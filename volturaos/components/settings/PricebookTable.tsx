'use client'

import { useState, useTransition } from 'react'
import type { PricebookEntry } from '@/types'
import { EditablePrice } from '@/components/ui/EditablePrice'
import { updatePricebookPrice } from '@/lib/actions/pricebook'

export function PricebookTable({ entries }: { entries: PricebookEntry[] }) {
  const [saved, setSaved] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handlePriceChange(id: string, field: 'price_good' | 'price_better' | 'price_best', value: number) {
    startTransition(async () => {
      await updatePricebookPrice(id, field, value)
      setSaved(id + field)
      setTimeout(() => setSaved(null), 1500)
    })
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="bg-volturaNavy/50 rounded-xl p-4">
          <p className="text-white font-semibold text-sm mb-3">{entry.job_type}</p>
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
  )
}
