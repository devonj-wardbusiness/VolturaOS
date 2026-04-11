'use client'

import { useState, useTransition } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { updateEstimateStatus, sendEstimateLinkSMS } from '@/lib/actions/estimates'

interface SendSheetProps {
  open: boolean
  onClose: () => void
  estimateId: string
  total: number
  customerPhone: string | null
  customerName: string
}

export function SendSheet({ open, onClose, estimateId, total, customerPhone, customerName }: SendSheetProps) {
  const [copied, setCopied] = useState(false)
  const [smsSent, setSmsSent] = useState(false)
  const [smsError, setSmsError] = useState(false)
  const [isPending, startTransition] = useTransition()

  function getLink() {
    return `${window.location.origin}/estimates/${estimateId}/view`
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(getLink())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    startTransition(async () => {
      await updateEstimateStatus(estimateId, 'Sent')
    })
  }

  function handleSendSMS() {
    if (!customerPhone) return
    setSmsError(false)
    startTransition(async () => {
      try {
        await sendEstimateLinkSMS(estimateId, customerPhone, customerName, false)
        setSmsSent(true)
        setTimeout(() => { setSmsSent(false); onClose() }, 2000)
      } catch {
        setSmsError(true)
      }
    })
  }

  function handleEmail() {
    const url = getLink()
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
        {customerPhone ? (
          <button
            onClick={handleSendSMS}
            disabled={isPending || smsSent}
            className="w-full bg-volturaGold text-volturaBlue py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {smsSent ? '✓ SMS Sent!' : isPending ? 'Sending…' : `Send SMS to ${customerPhone}`}
          </button>
        ) : (
          <div className="w-full bg-volturaNavy/40 text-gray-500 py-3 rounded-xl text-sm text-center">
            No phone on file — add one to the customer first
          </div>
        )}
        {smsError && (
          <p className="text-red-400 text-xs text-center">SMS failed — check Twilio credentials</p>
        )}
        <button
          onClick={handleCopyLink}
          disabled={isPending}
          className="w-full bg-volturaNavy text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
        >
          {copied ? '✓ Copied!' : 'Copy Link'}
        </button>
        <button
          onClick={handleEmail}
          disabled={isPending}
          className="w-full bg-volturaNavy text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
        >
          Send Email
        </button>
      </div>
    </BottomSheet>
  )
}
