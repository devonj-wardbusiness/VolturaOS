'use client'

import type { LineItem } from '@/types'
import { EditablePrice } from '@/components/ui/EditablePrice'

interface CustomLineItemsProps {
  items: LineItem[]
  onAdd: () => void
  onUpdate: (index: number, updates: Partial<LineItem>) => void
  onRemove: (index: number) => void
}

export function CustomLineItems({ items, onAdd, onUpdate, onRemove }: CustomLineItemsProps) {
  return (
    <div>
      <label className="block text-gray-400 text-sm mb-2">Custom Line Items</label>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 mb-2">
          <input type="text" value={item.description} onChange={(e) => onUpdate(i, { description: e.target.value })}
            className="flex-1 bg-volturaNavy text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold" />
          <EditablePrice value={item.price} onChange={(p) => onUpdate(i, { price: p })} size="sm" />
          <button onClick={() => onRemove(i)} className="text-red-400 text-lg px-1">&times;</button>
        </div>
      ))}
      <button onClick={onAdd} className="w-full border border-dashed border-volturaNavy text-gray-500 py-2.5 rounded-xl text-sm hover:border-volturaGold hover:text-volturaGold transition-colors">
        + Add Custom Item
      </button>
    </div>
  )
}
