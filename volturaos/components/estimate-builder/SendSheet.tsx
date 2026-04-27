'use client'

import { useState, useTransition } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { updateEstimateStatus, sendEstimateLinkSMS, sendEstimateLinkEmail } from '@/lib/actions/estimates'

interface SendSheetProps {
  open: boolean
  onClose: () => void
  estimateId: string
  total: number
  customerPhone: string | null
  customerName: string
  customerEmail?: string | null
}

export function SendSheet({ open, onClose, estimateId, total, customerPhone, customerName, customerEmail }: SendSheetProps) {
  const [copied, setCopied] = useState(false)
  const [smsSent, setSmsSent] = useState(false)
  const [smsError, setSmsError] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailInput, setEmailInput] = useState(customerEmail ?? '')
  const [showEmailInput, setShowEmailInput] = useState(false)
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

  function handleEmailClick() {
    if (!emailInput.trim()) {
      setShowEmailInput(true)
      return
    }
    sendEmail(emailInput.trim())
  }

  function sendEmail(email: string) {
    setEmailError('')
    startTransition(async () => {
      try {
        await sendEstimateLinkEmail(estimateId, email, customerName, total)
        setEmailSent(true)
        setShowEmailInput(false)
        setTimeout(() => { setEmailSent(false); onClose() }, 2000)
      } catch (e) {
        setEmailError((e as Error).message ?? 'Email failed')
      }
    })
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Send Estimate">
      <div className="space-y-3">
        {/* SMS */}
        {customerPhone ? (
          <button
            onClick={handleSendSMS}
            disabled={isPending || smsSent}
            className="w-full bg-volturaGold text-volturaBlue py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {smsSent ? '✓ SMS Sent!' : isPending ? 'Sending…' : `📱 Send SMS to ${customerPhone}`}
          </button>
        ) : (
          <div className="w-full bg-volturaNavy/40 text-gray-500 py-3 rounded-xl text-sm text-center">
            No phone on file — add to customer first
          </div>
        )}
        {smsError && <p className="text-red-400 text-xs text-center">SMS failed — check Twilio credentials</p>}

        {/* Email */}
        {showEmailInput ? (
          <div className="space-y-2">
            <input
              type="email"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendEmail(emailInput.trim()) }}
              placeholder="customer@email.com"
              autoFocus
              className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold placeholder-gray-600"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowEmailInput(false)}
                className="flex-1 bg-volturaNavy/50 text-gray-400 py-2.5 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => sendEmail(emailInput.trim())}
                disabled={isPending || !emailInput.trim()}
                className="flex-1 bg-volturaNavy text-volturaGold border border-volturaGold/40 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
              >
                {isPending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleEmailClick}
            disabled={isPending || emailSent}
            className="w-full bg-volturaNavy text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {emailSent ? '✓ Email Sent!' : customerEmail ? `✉️ Email ${customerEmail}` : '✉️ Send Email'}
          </button>
        )}
        {emailError && <p className="text-red-400 text-xs text-center">{emailError}</p>}

        {/* Copy link */}
        <button
          onClick={handleCopyLink}
          disabled={isPending}
          className="w-full bg-volturaNavy/50 text-gray-300 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
        >
          {copied ? '✓ Copied!' : '🔗 Copy Link'}
        </button>
      </div>
    </BottomSheet>
  )
}
