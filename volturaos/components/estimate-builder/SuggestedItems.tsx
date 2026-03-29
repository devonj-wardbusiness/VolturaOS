'use client'

import { useState, useEffect, useCallback } from 'react'
import type { LineItem } from '@/types'

interface Suggestion {
  name: string
  price: number
  reason: string
}

interface SuggestedItemsProps {
  currentLineItems: LineItem[]
  customerType?: 'residential' | 'commercial'
  onAdd: (name: string, price: number) => void
}

export function SuggestedItems({ currentLineItems, customerType, onAdd }: SuggestedItemsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())

  const fetchSuggestions = useCallback(async () => {
    setLoading(true)
    setSuggestions([])
    setDismissed(new Set())
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Suggest 4-5 electrical services to add. Return a JSON array only, no other text: [{"name": string, "price": number, "reason": string}]',
          context: {
            mode: 'upsell',
            currentLineItems,
            customerType: customerType ?? 'residential',
          },
        }),
      })
      if (!res.ok) return
      const text = await res.text()
      // Strip markdown code fences and extract the JSON array
      const match = text.match(/\[[\s\S]*\]/)
      if (!match) return
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed) && parsed.length > 0) {
        setSuggestions(parsed as Suggestion[])
      }
    } catch {
      // hide panel on any error
    } finally {
      setLoading(false)
    }
  }, [currentLineItems, customerType])

  useEffect(() => {
    fetchSuggestions()
  }, []) // fetch once on mount only

  if (!loading && suggestions.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-gray-400 text-sm">Suggested for This Job</label>
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className="text-gray-500 text-xs hover:text-gray-300 disabled:opacity-40"
          title="Refresh suggestions"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="space-y-1.5">
        {loading && [0, 1, 2].map((i) => (
          <div key={i} className="bg-volturaNavy/30 rounded-xl px-4 py-3 animate-pulse">
            <div className="h-3 bg-volturaNavy rounded w-3/4 mb-1" />
            <div className="h-2 bg-volturaNavy rounded w-1/2" />
          </div>
        ))}

        {!loading && suggestions.map((s, i) => {
          if (dismissed.has(i)) return null
          return (
            <div key={i} className="bg-volturaNavy/30 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm">{s.name}</p>
                <p className="text-gray-500 text-xs truncate">{s.reason}</p>
              </div>
              <span className="text-volturaGold text-sm font-semibold shrink-0">
                ${s.price.toLocaleString()}
              </span>
              <button
                onClick={() => {
                  onAdd(s.name, s.price)
                  setDismissed((prev) => new Set(prev).add(i))
                }}
                className="text-volturaGold text-xs font-semibold border border-volturaGold/40 px-2 py-1 rounded-lg shrink-0 hover:bg-volturaGold/10"
              >
                + Add
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
