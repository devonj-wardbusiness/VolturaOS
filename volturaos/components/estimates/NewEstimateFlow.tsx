'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CustomerSelector } from '@/components/estimate-builder/CustomerSelector'
import { createEstimate, getTemplates, saveEstimate } from '@/lib/actions/estimates'
import { getPricebookItem } from '@/lib/actions/pricebook'
import { TemplatePicker } from './TemplatePicker'
import type { Estimate, LineItem } from '@/types'

type Template = Pick<Estimate, 'id' | 'name' | 'total' | 'line_items'>

interface NewEstimateFlowProps {
  preloadItemId?: string
}

export function NewEstimateFlow({ preloadItemId }: NewEstimateFlowProps) {
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
      const est = await createEstimate({ customerId: id })

      // If we came from the NEC reference with a pricebook item, preload it
      if (preloadItemId) {
        const pbItem = await getPricebookItem(preloadItemId)
        if (pbItem) {
          const price = pbItem.price_good ?? pbItem.price_better ?? pbItem.price_best ?? 0
          const lineItem: LineItem = {
            description: pbItem.job_type,
            price,
            is_override: false,
            original_price: price,
            pricebook_description: pbItem.description_good ?? undefined,
            category: pbItem.category,
            is_primary: true,
          }
          await saveEstimate(est.id, {
            lineItems: [lineItem],
            total: price,
            subtotal: price,
          })
        }
        router.push(`/estimates/${est.id}`)
        return
      }

      if (tmpl.length === 0) {
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
          {preloadItemId && (
            <p className="text-green-400 text-sm bg-green-900/20 border border-green-800 rounded-lg px-3 py-2">
              📋 A code-required item will be pre-added to this estimate.
            </p>
          )}
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
