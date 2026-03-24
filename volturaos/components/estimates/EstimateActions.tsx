'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createInvoiceFromEstimate } from '@/lib/actions/invoices'
import { updateEstimateStatus } from '@/lib/actions/estimates'
import type { EstimateStatus } from '@/types'

interface EstimateActionsProps {
  estimateId: string
  customerId: string
  status: EstimateStatus
}

export function EstimateActions({ estimateId, customerId, status }: EstimateActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [converting, setConverting] = useState(false)

  function handleStatusChange(newStatus: EstimateStatus) {
    startTransition(async () => {
      await updateEstimateStatus(estimateId, newStatus)
      router.refresh()
    })
  }

  async function handleConvertToInvoice() {
    setConverting(true)
    try {
      const invoice = await createInvoiceFromEstimate(estimateId)
      router.push(`/invoices/${invoice.id}`)
    } catch (err) {
      alert('Failed to create invoice: ' + (err instanceof Error ? err.message : 'Unknown error'))
      setConverting(false)
    }
  }

  function handleCreateJob() {
    router.push(`/jobs/new?customerId=${customerId}&estimateId=${estimateId}`)
  }

  // No actions needed for these statuses
  if (status === 'Draft') return null

  return (
    <div className="px-4 py-2 space-y-2">
      {/* Approved: show convert to invoice + create job */}
      {status === 'Approved' && (
        <>
          <button
            onClick={handleConvertToInvoice}
            disabled={converting}
            className="w-full bg-green-600 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50"
          >
            {converting ? 'Creating Invoice...' : '💰 Convert to Invoice'}
          </button>
          <button
            onClick={handleCreateJob}
            className="w-full bg-volturaNavy text-volturaGold font-bold py-3 rounded-xl text-sm"
          >
            🔧 Create Job from Estimate
          </button>
        </>
      )}

      {/* Sent/Viewed: show approve + decline */}
      {(status === 'Sent' || status === 'Viewed') && (
        <div className="flex gap-2">
          <button
            onClick={() => handleStatusChange('Approved')}
            disabled={isPending}
            className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50"
          >
            ✅ Approve
          </button>
          <button
            onClick={() => handleStatusChange('Declined')}
            disabled={isPending}
            className="flex-1 bg-red-500/20 text-red-400 font-bold py-3 rounded-xl text-sm disabled:opacity-50"
          >
            ❌ Decline
          </button>
        </div>
      )}

      {/* Declined: allow re-send */}
      {status === 'Declined' && (
        <button
          onClick={() => handleStatusChange('Sent')}
          disabled={isPending}
          className="w-full bg-volturaNavy text-volturaGold font-bold py-3 rounded-xl text-sm disabled:opacity-50"
        >
          📤 Re-send Estimate
        </button>
      )}
    </div>
  )
}
