'use client'

import { useState } from 'react'
import type { PricebookEntry } from '@/types'
import { CategorySheet } from './CategorySheet'

const CATEGORY_ICONS: Record<string, string> = {
  'Breakers': '⚡',
  'Panel Rejuvenations': '🔲',
  'Car Chargers': '🚗',
  'Dedicated Circuits (Romex)': '🔌',
  'Dedicated Circuits (Conduit/EMT)': '🔧',
  'Circuit Extensions': '🔗',
  'Devices': '🔲',
  'Trenching': '🚧',
  'Service Calls': '🔍',
  'Indoor Lighting': '💡',
  'Outdoor Lighting': '🌟',
  'Ceiling Fans': '🌀',
  'Surface Mount': '🔆',
  'Recessed Cans': '⭕',
  'Bathroom Fans': '💨',
  'Doorbells': '🔔',
  'Ring Doorbells': '📹',
  'Transformers': '⚙️',
  'Ring Floodlights': '🔦',
  'Junction Boxes': '📦',
  'Disconnects': '🔴',
}

interface CategoryGridProps {
  pricebook: PricebookEntry[]
  onAddItem: (entry: PricebookEntry) => void
}

export function CategoryGrid({ pricebook, onAddItem }: CategoryGridProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(null)

  const categoryEntries = openCategory
    ? pricebook.filter((p) => p.category === openCategory)
    : []

  const categories = Array.from(new Set(pricebook.map((p) => p.category).filter(Boolean)))

  return (
    <div>
      <label className="block text-gray-400 text-sm mb-2">Add Line Items</label>
      <div className="grid grid-cols-3 gap-2">
        {categories.map((cat) => {
          const count = pricebook.filter((p) => p.category === cat).length
          const icon = CATEGORY_ICONS[cat] ?? '📋'
          return (
            <button
              key={cat}
              onClick={() => setOpenCategory(cat)}
              className="bg-volturaNavy/50 rounded-xl p-3 text-center hover:bg-volturaNavy transition-colors"
            >
              <span className="text-2xl block mb-1">{icon}</span>
              <span className="text-white text-xs font-semibold block">{cat}</span>
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
