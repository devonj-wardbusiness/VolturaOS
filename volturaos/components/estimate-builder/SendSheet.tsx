'use client'

import { useState, useTransition } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { updateEstimateStatus } from '@/lib/actions/estimates'

interface SendSheetProps {
  open: boolean
  onClose: () => void
  estimateId: string
  total: number
}

export function SendSheet({ open, onClose, estimateId, total }: SendSheetProps) {
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleCopyLink() {
    const url = `${window.location.origin}/estimates/${estimateId}/view`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    startTransition(async () => {
      await updateEstimateStatus(estimateId, 'Sent')
    })
  }

  function handleEmail() {
    const url = `${window.location.origin}/estimates/${estimateId}/view`
    const subject = encodeURIComponent('Your Estimate from Voltura Power Group')
    const body = encodeURIComponent(`Hi,\n\nHere's your estimate from Voltura Power Group:\n${url}\n\nTotal: $${total.toLocaleString()}\n\nQuestions? Just reply to this email.\n\n- Dev, Voltura Power Group`)
    window.open(`mailto:?subject=${subject}&body=${body}`)
    startTransition(async () => {
      await updateEstimateStatus(estimateId, 'Sent')
    })
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Send Estimate">
      <div className="space-y-3">
        <button onClick={handleCopyLink} disabled={isPending}
          className="w-full bg-volturaNavy text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
          {copied ? 'Copied!' : 'Copy SMS Link'}
        </button>
        <button onClick={handleEmail} disabled={isPending}
          className="w-full bg-volturaNavy text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
          Send Email
        </button>
        <button disabled className="w-full bg-volturaNavy/50 text-gray-500 py-3 rounded-xl text-sm">
          Download PDF — Coming in Phase 2
        </button>
      </div>
    </BottomSheet>
  )
}
