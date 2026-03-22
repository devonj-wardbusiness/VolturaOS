'use client'

import type { TierName, LineItem } from '@/types'
import { TierCard } from './TierCard'

interface TierCardsProps {
  items: Record<TierName, LineItem>
  selectedTier: TierName | null
  onTierSelect: (tier: TierName) => void
  onPriceChange: (tier: TierName, price: number) => void
  onDescChange: (tier: TierName, desc: string) => void
}

const TIERS: { key: TierName; label: string }[] = [
  { key: 'good', label: 'Good' },
  { key: 'better', label: 'Better' },
  { key: 'best', label: 'Best' },
]

export function TierCards({ items, selectedTier, onTierSelect, onPriceChange, onDescChange }: TierCardsProps) {
  return (
    <div>
      <label className="block text-gray-400 text-sm mb-2">Select Tier</label>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {TIERS.map(({ key, label }) => (
          <TierCard
            key={key}
            tier={key}
            label={label}
            item={items[key]}
            isSelected={selectedTier === key}
            isRecommended={key === 'better'}
            onSelect={() => onTierSelect(key)}
            onPriceChange={(p) => onPriceChange(key, p)}
            onDescChange={(d) => onDescChange(key, d)}
          />
        ))}
      </div>
    </div>
  )
}
