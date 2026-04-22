'use client'

import { useState } from 'react'
import type { PricebookEntry } from '@/types'

interface PrimaryJobSelectorProps {
  pricebook: PricebookEntry[]
  selected: string | null
  onSelect: (jobType: string) => void
  onSkip: () => void
}

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
  // Child categories
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

export function PrimaryJobSelector({ pricebook, selected, onSelect, onSkip }: PrimaryJobSelectorProps) {
  const [activeParent, setActiveParent] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Parse categories from pricebook (same logic as CategoryGrid)
  const allCategories = Array.from(
    new Set(pricebook.filter((p) => !p.is_footage_item).map((p) => p.category).filter(Boolean))
  )

  const parents = new Map<string, string[]>()
  const standalones: string[] = []

  for (const cat of allCategories) {
    if (cat.includes(' / ')) {
      const [parent, child] = cat.split(' / ').map((s) => s.trim())
      if (!parents.has(parent)) parents.set(parent, [])
      if (!parents.get(parent)!.includes(child)) parents.get(parent)!.push(child)
    } else {
      standalones.push(cat)
    }
  }

  const filteredEntries = activeCategory
    ? pricebook.filter((p) => p.category === activeCategory && !p.is_footage_item)
    : []

  if (selected) {
    return (
      <div className="bg-volturaNavy/50 rounded-xl p-3 flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-xs">Primary Job</p>
          <p className="text-white font-semibold text-sm">{selected}</p>
        </div>
        <button onClick={() => onSelect('')} className="text-gray-500 text-xs">Change</button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-gray-400 text-sm">
          {activeParent ? (
            <button
              onClick={() => { setActiveParent(null); setActiveCategory(null) }}
              className="flex items-center gap-1 text-volturaGold"
            >
              ← {activeParent}
            </button>
          ) : (
            'Primary Job'
          )}
        </label>
        {!activeParent && (
          <button onClick={onSkip} className="text-gray-500 text-xs underline">Skip</button>
        )}
      </div>

      {/* Root view: parent + standalone category pills */}
      {!activeParent && (
        <div className="flex gap-1.5 flex-wrap mb-2">
          {Array.from(parents.keys()).map((parent) => (
            <button
              key={parent}
              onClick={() => { setActiveParent(parent); setActiveCategory(null) }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-volturaNavy/50 text-gray-400"
            >
              {CATEGORY_ICONS[parent] ?? '📋'} {parent}
            </button>
          ))}
          {standalones.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeCategory === cat
                  ? 'bg-volturaGold text-volturaBlue'
                  : 'bg-volturaNavy/50 text-gray-400'
              }`}
            >
              {CATEGORY_ICONS[cat] ?? '📋'} {cat}
            </button>
          ))}
        </div>
      )}

      {/* Sub-category view: children of active parent */}
      {activeParent && (
        <div className="flex gap-1.5 flex-wrap mb-2">
          {(parents.get(activeParent) ?? []).map((child) => {
            const fullCat = `${activeParent} / ${child}`
            return (
              <button
                key={child}
                onClick={() => setActiveCategory(activeCategory === fullCat ? null : fullCat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeCategory === fullCat
                    ? 'bg-volturaGold text-volturaBlue'
                    : 'bg-volturaNavy/50 text-gray-400'
                }`}
              >
                {CATEGORY_ICONS[child] ?? '📋'} {child}
              </button>
            )
          })}
        </div>
      )}

      {/* Items in selected category */}
      {activeCategory && (
        <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto">
          {filteredEntries.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.job_type)}
              className="text-left px-4 py-3 rounded-xl text-sm bg-volturaNavy/50 text-white hover:bg-volturaNavy transition-colors"
            >
              {p.job_type}
            </button>
          ))}
          {filteredEntries.length === 0 && (
            <p className="text-gray-500 text-sm py-4 text-center">No items in this category</p>
          )}
        </div>
      )}
    </div>
  )
}
