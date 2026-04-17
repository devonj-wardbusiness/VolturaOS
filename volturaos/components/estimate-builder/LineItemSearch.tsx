'use client'

import { useState, useEffect, useRef } from 'react'
import { searchPricebook } from '@/lib/actions/pricebook'
import type { PricebookEntry, LineItem } from '@/types'

interface LineItemSearchProps {
  onAdd: (items: LineItem[]) => void
  autoFocus?: boolean
}

function toLineItem(entry: PricebookEntry, price: number): LineItem {
  return {
    description: entry.job_type,
    price,
    is_override: price !== (entry.price_better ?? 0),
    original_price: entry.price_better ?? 0,
    tier: 'better',
    category: entry.category,
  }
}

export function LineItemSearch({ onAdd, autoFocus }: LineItemSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PricebookEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchPricebook(query)
        setResults(data)
        // init draft prices from pricebook (preserve any already-edited values)
        setDraftPrices(prev => {
          const next: Record<string, string> = {}
          data.forEach(e => { next[e.id] = prev[e.id] ?? String(e.price_better ?? 0) })
          return next
        })
      } finally {
        setLoading(false)
      }
    }, 200)
  }, [query])

  function handleAdd(entry: PricebookEntry) {
    const raw = draftPrices[entry.id] ?? String(entry.price_better ?? 0)
    const price = parseFloat(raw)
    onAdd([toLineItem(entry, isNaN(price) || price < 0 ? 0 : price)])
    setQuery('')
    setResults([])
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 bg-white/7 rounded-xl px-3 py-2.5">
        <span className="text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type 2+ letters to search..."
          autoFocus={autoFocus}
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-500"
        />
        {loading && <span className="text-gray-500 text-xs">…</span>}
      </div>

      {results.length > 0 && (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {results.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between bg-white/4 rounded-xl px-3 py-2.5 gap-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{entry.job_type}</p>
                <p className="text-gray-500 text-xs">{entry.category}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-volturaGold text-sm font-semibold">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={draftPrices[entry.id] ?? String(entry.price_better ?? 0)}
                  onChange={(e) =>
                    setDraftPrices(prev => ({ ...prev, [entry.id]: e.target.value }))
                  }
                  onFocus={(e) => e.target.select()}
                  className="w-20 bg-volturaNavy border border-volturaGold/25 focus:border-volturaGold/60 text-volturaGold font-semibold text-sm text-right rounded-lg px-2 py-1 outline-none"
                />
                <button
                  onClick={() => handleAdd(entry)}
                  className="bg-volturaGold/15 text-volturaGold text-xs font-bold rounded-lg px-2.5 py-1.5 active:scale-95 transition-transform"
                >
                  + Add
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {query.length >= 2 && results.length === 0 && !loading && (
        <p className="text-gray-500 text-xs text-center py-2">No matches — try different words</p>
      )}
    </div>
  )
}
