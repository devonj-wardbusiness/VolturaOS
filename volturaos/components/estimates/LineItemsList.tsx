'use client'
import { useState } from 'react'
import type { LineItem } from '@/types'

export function ExpandableLineItem({ item }: { item: LineItem }) {
  const [open, setOpen] = useState(false)
  const isDiscount = item.price < 0
  const hasDesc = !!item.pricebook_description && !isDiscount

  if (isDiscount) {
    return (
      <div className="border-b border-white/5 last:border-0 py-2 flex items-center justify-between min-h-[44px]">
        <span className="flex items-center gap-2">
          <span className="text-[10px] bg-green-900/40 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">
            Discount
          </span>
          <span className="text-gray-400 text-sm">{item.description}</span>
        </span>
        <span className="text-green-400 text-sm font-semibold shrink-0 ml-2">
          −${Math.abs(item.price).toLocaleString()}
        </span>
      </div>
    )
  }

  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        className="w-full flex items-center justify-between py-2 text-left min-h-[44px]"
        onClick={() => hasDesc && setOpen(o => !o)}
        style={{ cursor: hasDesc ? 'pointer' : 'default' }}
      >
        <span className="text-white/80 text-sm">
          {item.description}{item.footage ? ` (${item.footage}ft)` : ''}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="text-volturaGold text-sm">${item.price.toLocaleString()}</span>
          {hasDesc && (
            <span className={`text-gray-500 text-xs inline-block transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
          )}
        </span>
      </button>
      {open && item.pricebook_description && (
        <p className="text-gray-400 text-xs pb-2 pr-6 leading-relaxed">{item.pricebook_description}</p>
      )}
    </div>
  )
}

export function LineItemsList({ items }: { items: LineItem[] }) {
  const regular = items.filter(i => i.price >= 0)
  const discounts = items.filter(i => i.price < 0)
  const savings = Math.abs(discounts.reduce((s, i) => s + i.price, 0))

  // Group regular items by category
  const groups = new Map<string, LineItem[]>()
  for (const item of regular) {
    const cat = item.category ?? ''
    if (!groups.has(cat)) groups.set(cat, [])
    groups.get(cat)!.push(item)
  }

  return (
    <div>
      {Array.from(groups.entries()).map(([cat, groupItems]) => (
        <div key={cat}>
          {cat && (
            <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-widest pt-3 pb-0.5 first:pt-1">
              {cat.split(' / ').pop()}
            </p>
          )}
          {groupItems.map((item, i) => <ExpandableLineItem key={`${cat}-${i}`} item={item} />)}
        </div>
      ))}
      {discounts.map((item, i) => <ExpandableLineItem key={`d-${i}`} item={item} />)}
      {discounts.length > 0 && (
        <div className="flex justify-between items-center pt-2 mt-1 border-t border-white/5">
          <span className="text-green-400 text-sm font-semibold">You save</span>
          <span className="text-green-400 text-sm font-bold">${savings.toLocaleString()}</span>
        </div>
      )}
    </div>
  )
}
