'use client'

import { useState } from 'react'
import type { Addon } from '@/types'
import { EditablePrice } from '@/components/ui/EditablePrice'

interface AddOnsPanelProps {
  addons: Addon[]
  onToggle: (index: number) => void
  onPriceChange: (index: number, price: number) => void
  onAddCustom: (name: string, price: number) => void
}

export function AddOnsPanel({ addons, onToggle, onPriceChange, onAddCustom }: AddOnsPanelProps) {
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')

  function handleAddCustom() {
    const p = parseFloat(customPrice)
    if (!customName.trim() || !p || p <= 0) return
    onAddCustom(customName.trim(), p)
    setCustomName('')
    setCustomPrice('')
  }

  return (
    <div>
      <label className="block text-gray-400 text-sm mb-2">Add-Ons</label>
      <div className="space-y-2">
        {addons.map((addon, i) => (
          <div key={`${addon.name}-${i}`} className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${addon.selected ? 'bg-volturaNavy' : 'bg-volturaNavy/30'}`}>
            <input type="checkbox" checked={addon.selected} onChange={() => onToggle(i)}
              className="w-5 h-5 rounded accent-volturaGold shrink-0" />
            <span className={`flex-1 text-sm ${addon.selected ? 'text-white' : 'text-gray-500'}`}>{addon.name}</span>
            <EditablePrice value={addon.price} onChange={(p) => onPriceChange(i, p)} originalValue={addon.original_price} size="sm" />
          </div>
        ))}
      </div>

      {/* Custom add-on */}
      <div className="mt-3 border-t border-white/5 pt-3">
        <p className="text-gray-500 text-xs mb-2">Add custom add-on</p>
        <div className="flex gap-2">
          <input
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
            placeholder="Name"
            className="flex-1 bg-volturaNavy text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold"
          />
          <input
            value={customPrice}
            onChange={e => setCustomPrice(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
            inputMode="decimal"
            placeholder="$"
            className="w-20 bg-volturaNavy text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold"
          />
          <button
            onClick={handleAddCustom}
            className="bg-volturaNavy text-volturaGold px-3 py-2 rounded-lg text-sm font-semibold active:opacity-70"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
