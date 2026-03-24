'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createInvoice } from '@/lib/actions/invoices'
import type { LineItem } from '@/types'

interface NewInvoiceFormProps {
  jobId?: string
  customerId?: string
  estimateId?: string
}

export function NewInvoiceForm({ jobId, customerId, estimateId }: NewInvoiceFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [lineItems, setLineItems] = useState<{ description: string; price: number }[]>([
    { description: '', price: 0 },
  ])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const total = lineItems.reduce((sum, item) => sum + item.price, 0)

  function addLineItem() {
    setLineItems([...lineItems, { description: '', price: 0 }])
  }

  function updateLineItem(index: number, field: 'description' | 'price', value: string | number) {
    setLineItems(lineItems.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ))
  }

  function removeLineItem(index: number) {
    if (lineItems.length <= 1) return
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  function handleSubmit() {
    if (!customerId) {
      setError('Customer is required')
      return
    }
    const validItems = lineItems.filter(i => i.description.trim() && i.price > 0)
    if (validItems.length === 0) {
      setError('At least one line item with description and price is required')
      return
    }

    startTransition(async () => {
      try {
        const invoice = await createInvoice({
          customerId,
          jobId,
          estimateId,
          lineItems: validItems as LineItem[],
          total: validItems.reduce((sum, i) => sum + i.price, 0),
          notes: notes || undefined,
        })
        router.push(`/invoices/${invoice.id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create invoice')
      }
    })
  }

  return (
    <div className="px-4 pt-4 pb-40 space-y-4">
      {error && (
        <div className="bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-sm">{error}</div>
      )}

      {/* Line items */}
      <div>
        <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-2">Line Items</label>
        <div className="space-y-2">
          {lineItems.map((item, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                placeholder="Description"
                className="flex-1 bg-volturaNavy text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-volturaGold/50"
              />
              <input
                type="number"
                value={item.price || ''}
                onChange={(e) => updateLineItem(i, 'price', parseFloat(e.target.value) || 0)}
                placeholder="$0"
                className="w-24 bg-volturaNavy text-white rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-volturaGold/50"
              />
              {lineItems.length > 1 && (
                <button onClick={() => removeLineItem(i)} className="text-red-400 px-2 py-2.5 text-sm">✕</button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addLineItem} className="text-volturaGold text-sm mt-2">+ Add line item</button>
      </div>

      {/* Notes */}
      <div>
        <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Invoice notes..."
          className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-volturaGold/50 resize-none"
        />
      </div>

      {/* Total + Submit */}
      <div className="fixed bottom-16 left-0 right-0 bg-volturaBlue border-t border-volturaNavy z-30 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">Total</span>
          <span className="text-volturaGold text-xl font-bold">${total.toLocaleString()}</span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full bg-volturaGold text-volturaBlue font-bold py-3 rounded-xl text-base disabled:opacity-50"
        >
          {isPending ? 'Creating...' : 'Create Invoice'}
        </button>
      </div>
    </div>
  )
}
