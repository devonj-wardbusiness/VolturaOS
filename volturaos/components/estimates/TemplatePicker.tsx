'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createEstimateFromTemplate, createEstimate } from '@/lib/actions/estimates'
import type { LineItem } from '@/types'

interface Template {
  id: string
  name: string
  total: number | null
  line_items: unknown[] | null
}

export function TemplatePicker({ templates, customerId }: { templates: Template[]; customerId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function handleTemplate(templateId: string) {
    setLoading(templateId)
    try {
      const id = await createEstimateFromTemplate(templateId, customerId)
      router.push(`/estimates/${id}`)
    } catch {
      alert('Failed to create estimate from template.')
      setLoading(null)
    }
  }

  async function handleBlank() {
    setLoading('blank')
    try {
      const est = await createEstimate({ customerId })
      router.push(`/estimates/${est.id}`)
    } catch {
      alert('Failed to create estimate.')
      setLoading(null)
    }
  }

  return (
    <div className="px-4 pt-6 pb-8 space-y-3">
      <h2 className="text-white font-bold text-lg mb-4">Start from template?</h2>
      {templates.map(t => {
        const items = (t.line_items ?? []) as LineItem[]
        const isExpanded = expanded === t.id
        return (
          <div key={t.id} className="bg-volturaNavy rounded-xl overflow-hidden">
            <div className="flex items-center p-4 gap-3">
              <button
                onClick={() => !loading && handleTemplate(t.id)}
                disabled={!!loading}
                className="flex-1 text-left disabled:opacity-50"
              >
                <p className="text-volturaGold font-semibold">{t.name}</p>
                <p className="text-gray-400 text-xs mt-1">
                  {items.length} items · ${(t.total ?? 0).toLocaleString()}
                </p>
                {loading === t.id && <p className="text-gray-500 text-xs mt-1">Creating...</p>}
              </button>
              {items.length > 0 && (
                <button
                  onClick={() => setExpanded(isExpanded ? null : t.id)}
                  className="text-gray-500 text-xs px-2.5 py-1.5 rounded-lg bg-white/5 shrink-0"
                >
                  {isExpanded ? 'Hide' : 'Preview'}
                </button>
              )}
            </div>
            {isExpanded && (
              <div className="px-4 pb-3 border-t border-white/5">
                {items.slice(0, 6).map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-gray-300 text-xs flex-1 mr-2 truncate">{item.description}</span>
                    <span className="text-volturaGold text-xs font-semibold shrink-0">${item.price.toLocaleString()}</span>
                  </div>
                ))}
                {items.length > 6 && (
                  <p className="text-gray-500 text-xs pt-1.5">+{items.length - 6} more items</p>
                )}
              </div>
            )}
          </div>
        )
      })}
      <button
        onClick={handleBlank}
        disabled={!!loading}
        className="w-full bg-white/5 rounded-xl p-4 text-left text-gray-400 disabled:opacity-50"
      >
        {loading === 'blank' ? 'Creating...' : '+ Start Blank'}
      </button>
    </div>
  )
}
