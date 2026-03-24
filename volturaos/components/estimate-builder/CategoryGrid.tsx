'use client'

import { useState } from 'react'
import type { PricebookEntry, TierName } from '@/types'
import { CategorySheet } from './CategorySheet'

const CATEGORIES = [
  { name: 'Panel & Service', icon: '⚡' },
  { name: 'Wiring & Circuits', icon: '🔌' },
  { name: 'Conduit & Feeders', icon: '🔧' },
  { name: 'Fixtures & Devices', icon: '💡' },
  { name: 'Troubleshoot', icon: '🔍' },
  { name: 'Specialty', icon: '⭐' },
]

interface CategoryGridProps {
  pricebook: PricebookEntry[]
  onAddItem: (entry: PricebookEntry, tier: TierName) => void
}

export function CategoryGrid({ pricebook, onAddItem }: CategoryGridProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(null)

  const categoryEntries = openCategory
    ? pricebook.filter((p) => p.category === openCategory)
    : []

  return (
    <div>
      <label className="block text-gray-400 text-sm mb-2">Add Line Items</label>
      <div className="grid grid-cols-3 gap-2">
        {CATEGORIES.map((cat) => {
          const count = pricebook.filter((p) => p.category === cat.name).length
          return (
            <button
              key={cat.name}
              onClick={() => setOpenCategory(cat.name)}
              className="bg-volturaNavy/50 rounded-xl p-3 text-center hover:bg-volturaNavy transition-colors"
            >
              <span className="text-2xl block mb-1">{cat.icon}</span>
              <span className="text-white text-xs font-semibold block">{cat.name}</span>
              <span className="text-gray-500 text-xs">{count} items</span>
            </button>
          )
        })}
      </div>

      <CategorySheet
        open={openCategory !== null}
        onClose={() => setOpenCategory(null)}
        category={openCategory ?? ''}
        entries={categoryEntries}
        onAddItem={onAddItem}
      />
    </div>
  )
}
