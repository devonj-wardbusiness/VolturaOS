'use client'

import { useState } from 'react'
import type { TierName, LineItem, PricebookEntry } from '@/types'
import { FootageInput } from './FootageInput'

interface LineItemRowProps {
  item: LineItem
  pricebookEntry?: PricebookEntry
  onTierChange: (tier: TierName) => void
  onFootageChange: (footage: number | null, price: number) => void
  onRemove: () => void
}

const TIER_LABELS: { key: TierName; label: string }[] = [
  { key: 'good', label: 'G' },
  { key: 'better', label: 'B' },
  { key: 'best', label: 'Bst' },
]

export function LineItemRow({ item, pricebookEntry, onTierChange, onFootageChange, onRemove }: LineItemRowProps) {
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
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm truncate">{item.description}</p>
          {item.footage && (
            <p className="text-gray-500 text-xs">{item.footage}ft custom</p>
          )}
        </div>
        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
          item.tier === 'good' ? 'bg-gray-600 text-gray-300' :
          item.tier === 'best' ? 'bg-volturaGold/20 text-volturaGold' :
          'bg-blue-900 text-blue-300'
        }`}>
          {item.tier === 'good' ? 'G' : item.tier === 'best' ? 'Bst' : 'B'}
        </span>
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

      {expanded && (
        <div className="px-3 pb-3 border-t border-volturaNavy/50 pt-2 space-y-2">
          <div className="flex gap-1">
            {TIER_LABELS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onTierChange(key)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  item.tier === key
                    ? 'bg-volturaGold text-volturaBlue'
                    : 'bg-volturaNavy/50 text-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {isFootage && pricebookEntry && (
            <FootageInput
              footageGroup={pricebookEntry.footage_group ?? ''}
              brackets={brackets}
              perFootRate={pricebookEntry.per_foot_rate ?? 0}
              selectedBracketIndex={null}
              customFootage={item.footage ?? null}
              onBracketSelect={(_idx, price) => onFootageChange(null, price)}
              onCustomFootage={(ft, price) => onFootageChange(ft, price)}
            />
          )}
        </div>
      )}
    </div>
  )
}
