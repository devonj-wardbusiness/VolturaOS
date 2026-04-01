'use client'
import { useState } from 'react'
import type { LineItem } from '@/types'

export function ExpandableLineItem({ item }: { item: LineItem }) {
  const [open, setOpen] = useState(false)
  const hasDesc = !!item.pricebook_description
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
  return (
    <div>
      {items.map((item, i) => <ExpandableLineItem key={i} item={item} />)}
    </div>
  )
}
