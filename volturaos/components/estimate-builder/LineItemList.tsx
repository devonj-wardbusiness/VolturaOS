'use client'

import type { TierName, LineItem, PricebookEntry } from '@/types'
import { LineItemRow } from './LineItemRow'

interface LineItemListProps {
  items: LineItem[]
  pricebook: PricebookEntry[]
  onTierChange: (index: number, tier: TierName) => void
  onFootageChange: (index: number, footage: number | null, price: number) => void
  onRemove: (index: number) => void
}

export function LineItemList({ items, pricebook, onTierChange, onFootageChange, onRemove }: LineItemListProps) {
  if (items.length === 0) return null

  function findEntry(item: LineItem): PricebookEntry | undefined {
    // Try exact match on description first
    const exact = pricebook.find((p) =>
      p.description_good === item.description ||
      p.description_better === item.description ||
      p.description_best === item.description ||
      p.job_type === item.description
    )
    if (exact) return exact
    // Try matching by footage group from the item's category
    if (item.category) {
      return pricebook.find((p) => p.category === item.category && p.is_footage_item && p.footage_group)
    }
    return undefined
  }

  return (
    <div>
      <label className="block text-gray-400 text-sm mb-2">
        Line Items ({items.length})
      </label>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <LineItemRow
            key={`${item.description}-${i}`}
            item={item}
            pricebookEntry={findEntry(item)}
            onTierChange={(tier) => onTierChange(i, tier)}
            onFootageChange={(ft, price) => onFootageChange(i, ft, price)}
            onRemove={() => onRemove(i)}
          />
        ))}
      </div>
    </div>
  )
}
