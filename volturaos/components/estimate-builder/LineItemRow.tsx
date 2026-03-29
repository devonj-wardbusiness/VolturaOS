'use client'

import { useState } from 'react'
import type { LineItem, PricebookEntry } from '@/types'
import { FootageInput } from './FootageInput'

interface LineItemRowProps {
  item: LineItem
  pricebookEntry?: PricebookEntry
  onFootageChange: (footage: number | null, price: number) => void
  onRemove: () => void
}

export function LineItemRow({ item, pricebookEntry, onFootageChange, onRemove }: LineItemRowProps) {
  const [expanded, setExpanded] = useState(false)

  const isFootage = pricebookEntry?.is_footage_item ?? false
  const brackets = isFootage && pricebookEntry
    ? [
        { label: '0-25ft', price: pricebookEntry.price_good ?? 0 },
        { label: '25-50ft', price: pricebookEntry.price_better ?? 0 },
        { label: '50-100ft', price: pricebookEntry.price_best ?? 0 },
      ]
    : []

  return (
    <div className="bg-volturaNavy/30 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
        onClick={() => isFootage ? setExpanded(!expanded) : undefined}
      >
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm truncate">{item.description}</p>
          {item.footage && (
            <p className="text-gray-500 text-xs">{item.footage}ft</p>
          )}
        </div>
        <span className="text-volturaGold font-semibold text-sm whitespace-nowrap">
          ${item.price.toLocaleString()}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="text-red-400/60 hover:text-red-400 text-lg leading-none px-1"
        >
          &times;
        </button>
      </div>

      {expanded && isFootage && pricebookEntry && (
        <div className="px-3 pb-3 border-t border-volturaNavy/50 pt-2">
          <FootageInput
            footageGroup={pricebookEntry.footage_group ?? ''}
            brackets={brackets}
            perFootRate={pricebookEntry.per_foot_rate ?? 0}
            selectedBracketIndex={null}
            customFootage={item.footage ?? null}
            onBracketSelect={(_idx, price) => onFootageChange(null, price)}
            onCustomFootage={(ft, price) => onFootageChange(ft, price)}
          />
        </div>
      )}
    </div>
  )
}
