'use client'

import type { LineItem, PricebookEntry } from '@/types'
import { LineItemRow } from './LineItemRow'

interface LineItemListProps {
  items: LineItem[]
  pricebook: PricebookEntry[]
  onFootageChange: (index: number, footage: number | null, price: number) => void
  onRemove: (index: number) => void
  onPriceUpdate?: (index: number, price: number, pricebookId?: string) => void
  onDescriptionUpdate?: (index: number, desc: string) => void
  onQuantityChange?: (index: number, quantity: number, newTotal: number, unitPrice: number) => void
}

export function LineItemList({ items, pricebook, onFootageChange, onRemove, onPriceUpdate, onDescriptionUpdate, onQuantityChange }: LineItemListProps) {
  if (items.length === 0) return null

  function findEntry(item: LineItem): PricebookEntry | undefined {
    const exact = pricebook.find((p) =>
      p.description_good === item.description ||
      p.description_better === item.description ||
      p.description_best === item.description ||
      p.job_type === item.description
    )
    if (exact) return exact
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
            onFootageChange={(ft, price) => onFootageChange(i, ft, price)}
            onRemove={() => onRemove(i)}
            onPriceUpdate={onPriceUpdate ? (price, pbId) => onPriceUpdate(i, price, pbId) : undefined}
            onDescriptionUpdate={onDescriptionUpdate ? (desc) => onDescriptionUpdate(i, desc) : undefined}
            onQuantityChange={onQuantityChange ? (qty, total, up) => onQuantityChange(i, qty, total, up) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
