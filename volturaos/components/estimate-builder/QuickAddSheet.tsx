'use client'

import { useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { VoiceLineItems } from './VoiceLineItems'
import { LineItemSearch } from './LineItemSearch'
import { RecentsRow } from './RecentsRow'
import { incrementPricebookUseCount } from '@/lib/actions/pricebook'
import type { PricebookEntry, LineItem } from '@/types'

type Tab = 'voice' | 'search' | 'recents'

interface QuickAddSheetProps {
  open: boolean
  onClose: () => void
  onAdd: (items: LineItem[]) => void
  pricebook: PricebookEntry[]
  initialRecents: PricebookEntry[]
}

export function QuickAddSheet({ open, onClose, onAdd, pricebook, initialRecents }: QuickAddSheetProps) {
  // Default to voice if Web Speech API is available, else search
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = typeof window !== 'undefined' ? (window as any) : null
  const hasVoice = !!(w?.SpeechRecognition || w?.webkitSpeechRecognition)

  const [tab, setTab] = useState<Tab>(hasVoice ? 'voice' : 'search')

  async function handleAdd(items: LineItem[]) {
    // Extract pricebook IDs from matched items by description
    const ids = items
      .map((item) => pricebook.find((e) => e.job_type === item.description.replace(/ \(×\d+\)$/, ''))?.id)
      .filter(Boolean) as string[]
    if (ids.length) void incrementPricebookUseCount(ids)
    onAdd(items)
  }

  const TABS: { id: Tab; label: string }[] = [
    ...(hasVoice ? [{ id: 'voice' as Tab, label: '🎤 Voice' }] : []),
    { id: 'search', label: '🔍 Search' },
    { id: 'recents', label: '⏱ Recents' },
  ]

  return (
    <BottomSheet open={open} onClose={onClose} title="Quick Add Item">
      {/* Tab bar */}
      <div className="flex gap-2 mb-4">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
              tab === id
                ? 'bg-volturaGold text-volturaBlue'
                : 'bg-white/5 text-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'voice' && (
        <VoiceLineItems
          pricebook={pricebook}
          onAdd={(items) => { handleAdd(items); onClose() }}
          onFallback={() => setTab('search')}
        />
      )}
      {tab === 'search' && (
        <LineItemSearch
          onAdd={(items) => { handleAdd(items) }}
          autoFocus={tab === 'search'}
        />
      )}
      {tab === 'recents' && (
        <RecentsRow
          items={initialRecents}
          onAdd={(items) => { handleAdd(items); onClose() }}
        />
      )}
    </BottomSheet>
  )
}
