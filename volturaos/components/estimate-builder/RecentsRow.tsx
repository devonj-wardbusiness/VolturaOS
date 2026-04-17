'use client'

import type { PricebookEntry, LineItem } from '@/types'

interface RecentsRowProps {
  items: PricebookEntry[]
  onAdd: (items: LineItem[]) => void
}

export function RecentsRow({ items, onAdd }: RecentsRowProps) {
  if (!items.length) {
    return (
      <p className="text-gray-500 text-xs text-center py-4">
        No recent items yet — they'll appear here as you build estimates.
      </p>
    )
  }

  function toLineItem(entry: PricebookEntry): LineItem {
    const price = entry.price_better ?? 0
    return {
      description: entry.job_type,
      price,
      is_override: false,
      original_price: price,
      tier: 'better',
      category: entry.category,
    }
  }

  return (
    <div className="flex gap-2 flex-wrap py-2">
      {items.map((entry) => {
        const price = entry.price_better ?? 0
        return (
          <button
            key={entry.id}
            onClick={() => onAdd([toLineItem(entry)])}
            className="flex items-center gap-1.5 bg-volturaGold/10 border border-volturaGold/30 rounded-full px-3 py-2 text-volturaGold text-xs font-medium active:scale-95 transition-transform"
          >
            <span className="text-volturaGold/50">+</span>
            {entry.job_type}
            <span className="text-volturaGold/60 font-normal">
              · ${price > 0 ? price.toLocaleString() : '—'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
