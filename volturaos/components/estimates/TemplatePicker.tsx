'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createEstimateFromTemplate, createEstimate } from '@/lib/actions/estimates'

interface Template {
  id: string
  name: string
  total: number | null
  line_items: unknown[] | null
}

export function TemplatePicker({ templates, customerId }: { templates: Template[]; customerId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

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
      {templates.map(t => (
        <button
          key={t.id}
          onClick={() => handleTemplate(t.id)}
          disabled={!!loading}
          className="w-full bg-volturaNavy rounded-xl p-4 text-left disabled:opacity-50"
        >
          <p className="text-volturaGold font-semibold">{t.name}</p>
          <p className="text-gray-400 text-xs mt-1">
            {t.line_items?.length ?? 0} items · ${(t.total ?? 0).toLocaleString()}
          </p>
          {loading === t.id && <p className="text-gray-500 text-xs mt-1">Creating...</p>}
        </button>
      ))}
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
