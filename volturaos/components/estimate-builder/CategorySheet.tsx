'use client'

import type { PricebookEntry } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'

interface CategorySheetProps {
  open: boolean
  onClose: () => void
  category: string
  entries: PricebookEntry[]
  onAddItem: (entry: PricebookEntry) => void
}

function formatGroupName(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function CategorySheet({ open, onClose, category, entries, onAddItem }: CategorySheetProps) {
  // Group footage items by footage_group
  const footageGroups = new Map<string, PricebookEntry[]>()
  const regularItems: PricebookEntry[] = []

  for (const entry of entries) {
    if (entry.is_footage_item && entry.footage_group) {
      const existing = footageGroups.get(entry.footage_group) ?? []
      existing.push(entry)
      footageGroups.set(entry.footage_group, existing)
    } else {
      regularItems.push(entry)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={category}>
      <div className="space-y-1.5 -mx-1 px-1">
        {/* Regular items */}
        {regularItems.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onAddItem(entry)}
            className="w-full flex items-center justify-between bg-volturaNavy/30 rounded-xl px-4 py-3 text-left hover:bg-volturaNavy/50 transition-colors"
          >
            <span className="text-white text-sm flex-1 mr-3">{entry.job_type}</span>
            <span className="text-volturaGold text-sm font-semibold">
              ${(entry.price_better ?? entry.price_good ?? 0).toLocaleString()}
            </span>
          </button>
        ))}

        {/* Footage groups */}
        {Array.from(footageGroups.entries()).map(([group, groupEntries]) => (
          <div key={group} className="bg-volturaNavy/30 rounded-xl px-4 py-3">
            <p className="text-white text-sm font-semibold mb-2">{formatGroupName(group)}</p>
            <div className="grid grid-cols-3 gap-2">
              {groupEntries
                .sort((a, b) => (a.price_better ?? a.price_good ?? 0) - (b.price_better ?? b.price_good ?? 0))
                .map((entry, i) => {
                  const labels = ['0-25ft', '25-50ft', '50-100ft']
                  return (
                    <button
                      key={entry.id}
                      onClick={() => onAddItem(entry)}
                      className="bg-volturaNavy/50 rounded-lg py-2 px-2 text-center hover:bg-volturaNavy transition-colors"
                    >
                      <span className="text-gray-400 text-xs block">{labels[i] ?? entry.job_type}</span>
                      <span className="text-volturaGold text-xs font-semibold">
                        ${(entry.price_better ?? entry.price_good ?? 0).toLocaleString()}
                      </span>
                    </button>
                  )
                })}
            </div>
          </div>
        ))}

        {entries.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No items in this category</p>
        )}
      </div>
    </BottomSheet>
  )
}
