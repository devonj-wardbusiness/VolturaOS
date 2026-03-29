'use client'

import { useState, useTransition } from 'react'
import { toggleChecklistItem } from '@/lib/actions/checklists'
import type { JobChecklist as JobChecklistType } from '@/types'

interface JobChecklistProps {
  checklist: JobChecklistType
}

export function JobChecklist({ checklist }: JobChecklistProps) {
  const [items, setItems] = useState(checklist.items)
  const [isPending, startTransition] = useTransition()

  const completed = items.filter((i) => i.checked).length
  const total = items.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  function handleToggle(index: number) {
    // Optimistic update
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, checked: !item.checked } : item))

    startTransition(async () => {
      await toggleChecklistItem(checklist.id, index)
    })
  }

  return (
    <div className="bg-volturaNavy/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Job Checklist</p>
        <span className="text-xs text-gray-400">{completed}/{total}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-volturaBlue rounded-full h-1.5 mb-4">
        <div
          className="h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#22c55e' : '#C9A227' }}
        />
      </div>

      {/* Items */}
      <div className="space-y-1">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => handleToggle(i)}
            disabled={isPending}
            className="w-full flex items-start gap-3 py-2.5 text-left disabled:opacity-70"
          >
            <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
              item.checked ? 'bg-green-500 border-green-500' : 'border-gray-600 bg-transparent'
            }`}>
              {item.checked && (
                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
            <span className={`text-sm leading-snug ${item.checked ? 'text-gray-500 line-through' : 'text-white'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {pct === 100 && (
        <div className="mt-3 text-center text-green-400 text-sm font-semibold">
          ✅ All steps complete
        </div>
      )}
    </div>
  )
}
