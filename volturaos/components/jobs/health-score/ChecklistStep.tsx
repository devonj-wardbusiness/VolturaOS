'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createEstimateFromChecklist } from '@/lib/actions/estimates'
import type { ChecklistItem } from './types'

interface ChecklistStepProps {
  customerId: string
  jobId?: string
  checklist: ChecklistItem[]
  onBack: () => void
}

const PRIORITY_CONFIG = {
  critical:    { label: '⚠ Critical',    color: 'text-red-400' },
  important:   { label: '→ Important',   color: 'text-yellow-400' },
  recommended: { label: '✓ Recommended', color: 'text-green-400' },
} as const

export function ChecklistStep({ customerId, jobId, checklist, onBack }: ChecklistStepProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(
    new Set(checklist.filter(i => i.priority === 'critical').map(i => i.jobType))
  )
  const [isPending, startTransition] = useTransition()

  function toggle(jobType: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(jobType) ? next.delete(jobType) : next.add(jobType)
      return next
    })
  }

  const selectedItems = checklist.filter(i => selected.has(i.jobType))
  const total = selectedItems.reduce((sum, i) => sum + (i.price ?? 0), 0)

  function handleCreate() {
    startTransition(async () => {
      const id = await createEstimateFromChecklist(customerId, jobId, selectedItems)
      router.push(`/estimates/${id}`)
    })
  }

  const priorities: ('critical' | 'important' | 'recommended')[] = ['critical', 'important', 'recommended']

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto pb-4">
        {priorities.map(priority => {
          const items = checklist.filter(i => i.priority === priority)
          if (items.length === 0) return null
          const config = PRIORITY_CONFIG[priority]
          return (
            <div key={priority}>
              <p className={`text-xs font-bold uppercase tracking-wider py-2 ${config.color}`}>
                {config.label}
              </p>
              {items.map(item => (
                <button
                  key={item.jobType}
                  onClick={() => toggle(item.jobType)}
                  className="w-full flex items-center gap-3 py-3 border-b border-white/5"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    selected.has(item.jobType)
                      ? 'bg-volturaGold border-volturaGold'
                      : 'border-gray-600'
                  }`}>
                    {selected.has(item.jobType) && <span className="text-volturaBlue text-xs font-bold">✓</span>}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white text-sm">{item.description}</p>
                    <p className="text-gray-500 text-xs">{item.reason}</p>
                  </div>
                  <p className="text-volturaGold text-sm font-semibold shrink-0">
                    {item.price != null ? `$${item.price.toLocaleString()}` : '—'}
                  </p>
                </button>
              ))}
            </div>
          )
        })}
      </div>

      {selected.size > 0 && (
        <p className="text-center text-gray-500 text-xs mb-2">
          {selected.size} item{selected.size > 1 ? 's' : ''} selected · Est. ${total.toLocaleString()}
        </p>
      )}

      <div className="space-y-2">
        <button
          onClick={handleCreate}
          disabled={selected.size === 0 || isPending}
          className="w-full bg-volturaGold text-volturaBlue font-bold py-3.5 rounded-xl text-sm disabled:opacity-40"
        >
          {isPending ? 'Creating…' : `Create Estimate →`}
        </button>
        <button onClick={onBack} className="w-full text-gray-500 text-sm py-2">← Back to Score</button>
      </div>
    </div>
  )
}
