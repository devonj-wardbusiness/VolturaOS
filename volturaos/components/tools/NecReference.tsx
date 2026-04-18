'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { PricebookEntry } from '@/types'

interface NecReferenceProps {
  pricebook: PricebookEntry[]
}

const CATEGORIES = [
  { icon: '🔌', label: 'Wire Sizing', query: 'What wire size do I need for a 200A service entrance?' },
  { icon: '💧', label: 'GFCI Rules', query: 'Where is GFCI protection required per NEC 210.8?' },
  { icon: '⚡', label: 'AFCI Rules', query: 'Where is AFCI protection required per NEC 210.12?' },
  { icon: '🏠', label: 'Panel Upgrades', query: 'What are the NEC requirements for a panel upgrade — surge protection, labeling, grounding, clearance?' },
  { icon: '🕳️', label: 'Underground', query: 'What are the burial depth requirements per NEC Table 300.5 for Colorado Springs?' },
  { icon: '🚗', label: 'EV Chargers', query: 'What are the NEC Article 625 requirements for a Level 2 EV charger installation?' },
  { icon: '📐', label: 'Load Calc', query: 'How do I do a load calculation for a 200A panel upgrade using NEC 220.83?' },
  { icon: '⚡', label: 'Grounding', query: 'What are the NEC Article 250 grounding requirements — ground rods, GEC sizing, subpanel bonding?' },
]

// Maps article numbers found in answer text to pricebook item keywords
const ARTICLE_TRIGGERS: { article: string; keywords: string[] }[] = [
  { article: '230.67', keywords: ['surge protector', 'whole-home surge', 'spd'] },
  { article: '210.8', keywords: ['gfci outlet', 'dual-function afci/gfci', 'dual function afci/gfci', 'gfci receptacle'] },
  { article: '210.12', keywords: ['afci breaker', 'arc fault'] },
  { article: '406.12', keywords: ['tamper-resistant', 'tamper resistant receptacle', 'tr receptacle'] },
  { article: '250.53', keywords: ['ground rod'] },
]

function findPricebookMatch(
  answerText: string,
  pricebook: PricebookEntry[]
): PricebookEntry | null {
  const lower = answerText.toLowerCase()

  for (const trigger of ARTICLE_TRIGGERS) {
    if (!lower.includes(trigger.article)) continue
    for (const kw of trigger.keywords) {
      const match = pricebook.find((p) =>
        p.job_type.toLowerCase().includes(kw) ||
        (p.description_good ?? '').toLowerCase().includes(kw)
      )
      if (match) return match
    }
  }
  return null
}

export function NecReference({ pricebook }: NecReferenceProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [pricebookMatch, setPricebookMatch] = useState<PricebookEntry | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(overrideQuery?: string) {
    const q = (overrideQuery ?? query).trim()
    if (!q || loading) return

    setAnswer('')
    setPricebookMatch(null)
    setLoading(true)

    try {
      const res = await fetch('/api/nec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })

      if (!res.ok || !res.body) {
        setAnswer('Unable to get an answer right now. Try again.')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        setAnswer(fullText)
      }

      // After stream completes, check for pricebook matches
      const match = findPricebookMatch(fullText, pricebook)
      setPricebookMatch(match)
    } catch {
      setAnswer('Connection error. Check your signal and try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleCategoryClick(cat: (typeof CATEGORIES)[number]) {
    setQuery(cat.query)
    void handleSubmit(cat.query)
    inputRef.current?.blur()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void handleSubmit()
  }

  function getPrice(item: PricebookEntry): string {
    const p = item.price_good ?? item.price_better ?? item.price_best
    return p != null ? `$${p.toLocaleString()}` : ''
  }

  return (
    <div className="px-4 pt-4 pb-8 space-y-5">
      {/* Search bar */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 text-base select-none">
          ⚖️
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Wire size, GFCI rules, burial depth…"
          className="w-full bg-[#1a2f50] text-white placeholder-gray-500 rounded-xl pl-10 pr-14 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          onClick={() => void handleSubmit()}
          disabled={!query.trim() || loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-600 disabled:bg-green-900 disabled:text-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
        >
          {loading ? '…' : 'Go'}
        </button>
      </div>

      {/* Category tiles — only show when no answer streaming */}
      {!answer && !loading && (
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              onClick={() => handleCategoryClick(cat)}
              className="bg-[#1a2f50] rounded-xl p-4 flex flex-col items-center gap-1.5 active:bg-[#223a60] transition-colors"
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-white text-xs font-semibold">{cat.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Loading indicator */}
      {loading && !answer && (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <span className="animate-pulse">⚖️</span>
          <span>Looking up code…</span>
        </div>
      )}

      {/* Answer card */}
      {(answer || loading) && (
        <div className="border-l-4 border-green-500 bg-[#0d1f3c] rounded-r-xl p-4 space-y-3">
          {/* Back to categories */}
          <button
            onClick={() => { setAnswer(''); setPricebookMatch(null); setQuery('') }}
            className="text-gray-500 text-xs flex items-center gap-1 hover:text-gray-300 transition-colors"
          >
            ← Categories
          </button>

          {/* Streamed answer — render as preformatted to preserve line breaks */}
          <div className="text-gray-100 text-sm leading-relaxed whitespace-pre-wrap">
            {answer}
            {loading && <span className="animate-pulse text-green-400">▌</span>}
          </div>

          {/* Pricebook action */}
          {pricebookMatch && !loading && (
            <div className="mt-4 bg-[#f5c84211] border border-[#f5c842] rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[#f5c842] font-bold text-sm">{pricebookMatch.job_type}</div>
                <div className="text-[#f5c84299] text-xs mt-0.5">
                  From pricebook{getPrice(pricebookMatch) ? ` · ${getPrice(pricebookMatch)}` : ''}
                </div>
              </div>
              <button
                onClick={() => router.push(`/estimates/new?item=${pricebookMatch!.id}`)}
                className="bg-[#f5c842] text-[#0d1f3c] text-xs font-bold px-4 py-2 rounded-lg shrink-0 active:opacity-80 transition-opacity"
              >
                + Add
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
