'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CustomerSelector } from '@/components/estimate-builder/CustomerSelector'
import { createEstimate, getTemplates } from '@/lib/actions/estimates'
import { TemplatePicker } from './TemplatePicker'
import type { Estimate } from '@/types'

type Template = Pick<Estimate, 'id' | 'name' | 'total' | 'line_items'>

export function NewEstimateFlow() {
  const router = useRouter()
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState<string | null>(null)
  const [templates, setTemplates] = useState<Template[] | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleCustomerSelect(id: string, name: string) {
    setCustomerId(id)
    setCustomerName(name)
    setLoading(true)
    try {
      const tmpl = await getTemplates()
      if (tmpl.length === 0) {
        const est = await createEstimate({ customerId: id })
        router.push(`/estimates/${est.id}`)
      } else {
        setTemplates(tmpl)
        setLoading(false)
      }
    } catch {
      alert('Failed to start estimate.')
      setLoading(false)
    }
  }

  if (templates && customerId) {
    return <TemplatePicker templates={templates} customerId={customerId} />
  }

  return (
    <div className="px-4 pt-6 pb-8 space-y-4">
      <h2 className="text-white font-bold text-lg">New Estimate</h2>
      {loading ? (
        <p className="text-gray-400 text-sm text-center py-8">Creating estimate…</p>
      ) : (
        <>
          <p className="text-gray-400 text-sm">Select or add a customer to get started.</p>
          <CustomerSelector
            selectedId={customerId}
            selectedName={customerName}
            onSelect={handleCustomerSelect}
          />
        </>
      )}
    </div>
  )
}
