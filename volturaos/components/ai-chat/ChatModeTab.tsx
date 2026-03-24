'use client'

import type { AIPageContext } from '@/types'

const MODES: { key: AIPageContext['mode']; label: string; icon: string }[] = [
  { key: 'chat', label: 'Chat', icon: '💬' },
  { key: 'estimate', label: 'Estimate', icon: '📋' },
  { key: 'upsell', label: 'Upsell', icon: '⚡' },
  { key: 'followup', label: 'Follow-Up', icon: '📨' },
  { key: 'permit', label: 'Permit', icon: '📄' },
]

export function ChatModeTab({
  activeMode,
  onSelect,
}: {
  activeMode: AIPageContext['mode']
  onSelect: (mode: AIPageContext['mode']) => void
}) {
  return (
    <div className="flex gap-1 overflow-x-auto px-2 py-2 border-b border-white/10">
      {MODES.map((m) => (
        <button
          key={m.key}
          onClick={() => onSelect(m.key)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            activeMode === m.key
              ? 'bg-volturaGold text-volturaBlue'
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
        >
          <span>{m.icon}</span>
          {m.label}
        </button>
      ))}
    </div>
  )
}
