'use client'

import { useState } from 'react'
import type { PricebookEntry } from '@/types'
import { CategorySheet } from './CategorySheet'

const CATEGORY_ICONS: Record<string, string> = {
  // Standalone categories
  'Breakers': '⚡',
  'Panel Rejuvenations': '🔲',
  'Car Chargers': '🚗',
  'Dedicated Circuits (Romex)': '🔌',
  'Dedicated Circuits (Conduit/EMT)': '🔧',
  'Circuit Extensions': '🔗',
  'Devices': '🔲',
  'Trenching': '🚧',
  'Service Calls': '🔍',
  'Doorbells': '🔔',
  'Ring Doorbells': '📹',
  'Transformers': '⚙️',
  'Junction Boxes': '📦',
  'Disconnects': '🔴',
  // Parent categories
  'Indoor Lighting': '💡',
  'Outdoor Lighting': '🌟',
  // Child categories (shown in sub-grid)
  'Fixtures': '💡',
  'Ceiling Fans': '🌀',
  'Recessed Cans': '⭕',
  'Surface Mount': '🔆',
  'Bathroom Fans': '💨',
  'Exterior Fixtures': '🏮',
  'Ring Floodlights': '🔦',
  'Landscape Lighting': '🌿',
  'Post Lights': '🗼',
  'Soffit Lights': '🏠',
}

interface CategoryGridProps {
  pricebook: PricebookEntry[]
  onAddItem: (entry: PricebookEntry) => void
}

export function CategoryGrid({ pricebook, onAddItem }: CategoryGridProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  const [activeParent, setActiveParent] = useState<string | null>(null)

  // Parse categories: "Parent / Child" format for sub-categories, plain for standalone
  const allCategories = Array.from(new Set(pricebook.map(p => p.category).filter(Boolean)))

  const parents = new Map<string, string[]>()
  const standalones: string[] = []

  for (const cat of allCategories) {
    if (cat.includes(' / ')) {
      const [parent, child] = cat.split(' / ').map(s => s.trim())
      if (!parents.has(parent)) parents.set(parent, [])
      if (!parents.get(parent)!.includes(child)) parents.get(parent)!.push(child)
    } else {
      standalones.push(cat)
    }
  }

  const categoryEntries = openCategory
    ? pricebook.filter(p => p.category === openCategory)
    : []

  // Sub-category view: drilled into a parent (e.g. "Indoor Lighting")
  if (activeParent) {
    const children = parents.get(activeParent) ?? []
    return (
      <div>
        <button
          onClick={() => setActiveParent(null)}
          className="flex items-center gap-1 text-volturaGold text-sm mb-3"
        >
          ← {activeParent}
        </button>
        <div className="grid grid-cols-3 gap-2">
          {children.map(child => {
            const fullCat = `${activeParent} / ${child}`
            const count = pricebook.filter(p => p.category === fullCat).length
            return (
              <button
                key={child}
                onClick={() => setOpenCategory(fullCat)}
                className="bg-volturaNavy/50 rounded-xl p-3 text-center hover:bg-volturaNavy transition-colors"
              >
                <span className="text-2xl block mb-1">{CATEGORY_ICONS[child] ?? '📋'}</span>
                <span className="text-white text-xs font-semibold block">{child}</span>
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

  // Root view: parent categories + standalones
  return (
    <div>
      <label className="block text-gray-400 text-sm mb-2">Add Line Items</label>
      <div className="grid grid-cols-3 gap-2">
        {Array.from(parents.keys()).map(parent => {
          const count = pricebook.filter(p => p.category?.startsWith(parent + ' / ')).length
          return (
            <button
              key={parent}
              onClick={() => setActiveParent(parent)}
              className="bg-volturaNavy/50 rounded-xl p-3 text-center hover:bg-volturaNavy transition-colors"
            >
              <span className="text-2xl block mb-1">{CATEGORY_ICONS[parent] ?? '📋'}</span>
              <span className="text-white text-xs font-semibold block">{parent}</span>
              <span className="text-gray-500 text-xs">{count} items</span>
            </button>
          )
        })}
        {standalones.map(cat => {
          const count = pricebook.filter(p => p.category === cat).length
          return (
            <button
              key={cat}
              onClick={() => setOpenCategory(cat)}
              className="bg-volturaNavy/50 rounded-xl p-3 text-center hover:bg-volturaNavy transition-colors"
            >
              <span className="text-2xl block mb-1">{CATEGORY_ICONS[cat] ?? '📋'}</span>
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
