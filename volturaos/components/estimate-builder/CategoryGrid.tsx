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
import { CategorySheet } from './CategorySheet'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  // Standalone
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
  // Parent categories
  'Indoor Lighting': Lightbulb,
  'Outdoor Lighting': Sun,
  // Child categories
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

interface CategoryGridProps {
  pricebook: PricebookEntry[]
  onAddItem: (entry: PricebookEntry) => void
}

function CategoryTile({ label, count, icon: Icon, onClick }: {
  label: string
  count: number
  icon: LucideIcon
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="bg-volturaNavy/50 rounded-xl p-3 text-center hover:bg-volturaNavy transition-colors"
    >
      <Icon size={22} className="mx-auto mb-1 text-volturaGold/70" strokeWidth={1.5} />
      <span className="text-white text-xs font-semibold block leading-tight">{label}</span>
      <span className="text-gray-500 text-xs">{count} items</span>
    </button>
  )
}

export function CategoryGrid({ pricebook, onAddItem }: CategoryGridProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  const [activeParent, setActiveParent] = useState<string | null>(null)

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
              <CategoryTile
                key={child}
                label={child}
                count={count}
                icon={CATEGORY_ICONS[child] ?? Package}
                onClick={() => setOpenCategory(fullCat)}
              />
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

  return (
    <div>
      <label className="block text-gray-400 text-sm mb-2">Add Line Items</label>
      <div className="grid grid-cols-3 gap-2">
        {Array.from(parents.keys()).map(parent => {
          const count = pricebook.filter(p => p.category?.startsWith(parent + ' / ')).length
          return (
            <CategoryTile
              key={parent}
              label={parent}
              count={count}
              icon={CATEGORY_ICONS[parent] ?? Package}
              onClick={() => setActiveParent(parent)}
            />
          )
        })}
        {standalones.map(cat => {
          const count = pricebook.filter(p => p.category === cat).length
          return (
            <CategoryTile
              key={cat}
              label={cat}
              count={count}
              icon={CATEGORY_ICONS[cat] ?? Package}
              onClick={() => setOpenCategory(cat)}
            />
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
