'use client'

import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Zap, CircuitBoard, Car, Plug, Wrench, Link, ToggleLeft, Hammer,
  Search, Bell, Video, Settings, Package, Power,
  Lightbulb, Sun, Lamp, Fan, Circle, LampCeiling, Wind,
  LampWallDown, Flashlight, Leaf, Building2, Home,
} from 'lucide-react'
import type { PricebookEntry } from '@/types'

interface PrimaryJobSelectorProps {
  pricebook: PricebookEntry[]
  selected: string | null
  onSelect: (jobType: string) => void
  onSkip: () => void
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Breakers': Zap,
  'Panel Rejuvenations': CircuitBoard,
  'Car Chargers': Car,
  'Dedicated Circuits (Romex)': Plug,
  'Dedicated Circuits (Conduit/EMT)': Wrench,
  'Circuit Extensions': Link,
  'Devices': ToggleLeft,
  'Trenching': Hammer,
  'Service Calls': Search,
  'Doorbells': Bell,
  'Ring Doorbells': Video,
  'Transformers': Settings,
  'Junction Boxes': Package,
  'Disconnects': Power,
  'Indoor Lighting': Lightbulb,
  'Outdoor Lighting': Sun,
  'Fixtures': Lamp,
  'Ceiling Fans': Fan,
  'Recessed Cans': Circle,
  'Surface Mount': LampCeiling,
  'Bathroom Fans': Wind,
  'Exterior Fixtures': LampWallDown,
  'Ring Floodlights': Flashlight,
  'Landscape Lighting': Leaf,
  'Post Lights': Building2,
  'Soffit Lights': Home,
}

export function PrimaryJobSelector({ pricebook, selected, onSelect, onSkip }: PrimaryJobSelectorProps) {
  const [activeParent, setActiveParent] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

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

  function CategoryPill({ label, active, onClick, icon: Icon }: {
    label: string
    active: boolean
    onClick: () => void
    icon: LucideIcon
  }) {
    return (
      <button
        onClick={onClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
          active ? 'bg-volturaGold text-volturaBlue' : 'bg-volturaNavy/50 text-gray-400'
        }`}
      >
        <Icon size={12} strokeWidth={2} />
        {label}
      </button>
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

      {!activeParent && (
        <div className="flex gap-1.5 flex-wrap mb-2">
          {Array.from(parents.keys()).map((parent) => (
            <CategoryPill
              key={parent}
              label={parent}
              active={false}
              icon={CATEGORY_ICONS[parent] ?? Package}
              onClick={() => { setActiveParent(parent); setActiveCategory(null) }}
            />
          ))}
          {standalones.map((cat) => (
            <CategoryPill
              key={cat}
              label={cat}
              active={activeCategory === cat}
              icon={CATEGORY_ICONS[cat] ?? Package}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            />
          ))}
        </div>
      )}

      {activeParent && (
        <div className="flex gap-1.5 flex-wrap mb-2">
          {(parents.get(activeParent) ?? []).map((child) => {
            const fullCat = `${activeParent} / ${child}`
            return (
              <CategoryPill
                key={child}
                label={child}
                active={activeCategory === fullCat}
                icon={CATEGORY_ICONS[child] ?? Package}
                onClick={() => setActiveCategory(activeCategory === fullCat ? null : fullCat)}
              />
            )
          })}
        </div>
      )}

      {activeCategory && (
        <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto">
          {filteredEntries.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.job_type)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm bg-volturaNavy/50 text-white hover:bg-volturaNavy transition-colors"
            >
              <span className="text-left">{p.job_type}</span>
              <span className="text-volturaGold font-semibold ml-3 shrink-0">
                ${(p.price_better ?? p.price_good ?? 0).toLocaleString()}
              </span>
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
