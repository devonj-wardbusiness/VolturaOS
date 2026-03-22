'use client'

import type { Addon } from '@/types'
import { EditablePrice } from '@/components/ui/EditablePrice'

interface AddOnsPanelProps {
  addons: Addon[]
  onToggle: (index: number) => void
  onPriceChange: (index: number, price: number) => void
}

export function AddOnsPanel({ addons, onToggle, onPriceChange }: AddOnsPanelProps) {
  return (
    <div>
      <label className="block text-gray-400 text-sm mb-2">Add-Ons</label>
      <div className="space-y-2">
        {addons.map((addon, i) => (
          <div key={addon.name} className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${addon.selected ? 'bg-volturaNavy' : 'bg-volturaNavy/30'}`}>
            <input type="checkbox" checked={addon.selected} onChange={() => onToggle(i)}
              className="w-5 h-5 rounded accent-volturaGold shrink-0" />
            <span className={`flex-1 text-sm ${addon.selected ? 'text-white' : 'text-gray-500'}`}>{addon.name}</span>
            <EditablePrice value={addon.price} onChange={(p) => onPriceChange(i, p)} originalValue={addon.original_price} size="sm" />
          </div>
        ))}
      </div>
    </div>
  )
}
