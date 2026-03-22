'use client'

import type { TierName, LineItem } from '@/types'
import { EditablePrice } from '@/components/ui/EditablePrice'

interface TierCardProps {
  tier: TierName
  label: string
  item: LineItem
  isSelected: boolean
  isRecommended: boolean
  onSelect: () => void
  onPriceChange: (price: number) => void
  onDescChange: (desc: string) => void
}

export function TierCard({ tier, label, item, isSelected, isRecommended, onSelect, onPriceChange, onDescChange }: TierCardProps) {
  if (item.price === 0 && !item.description) return null

  return (
    <div className={`min-w-[260px] snap-center rounded-2xl p-4 border-2 transition-colors flex flex-col ${
      isSelected ? 'border-volturaGold bg-volturaNavy' : 'border-volturaNavy/50 bg-volturaNavy/30'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`font-bold ${isSelected ? 'text-volturaGold' : 'text-white'}`}>{label}</span>
        {isRecommended && <span className="bg-volturaGold text-volturaBlue text-xs font-bold px-2 py-0.5 rounded-full">RECOMMENDED</span>}
      </div>
      <textarea value={item.description} onChange={(e) => onDescChange(e.target.value)} rows={2}
        className="w-full bg-transparent text-gray-300 text-sm mb-3 resize-none focus:outline-none focus:ring-1 focus:ring-volturaGold/50 rounded px-1" />
      <div className="mt-auto">
        <EditablePrice value={item.price} onChange={onPriceChange} originalValue={item.original_price ?? undefined} size="lg" />
        <button onClick={onSelect} className={`w-full mt-3 py-2.5 rounded-xl font-bold text-sm transition-colors ${
          isSelected ? 'bg-volturaGold text-volturaBlue' : 'bg-volturaNavy text-white'
        }`}>
          {isSelected ? 'Selected' : 'Select'}
        </button>
      </div>
    </div>
  )
}
