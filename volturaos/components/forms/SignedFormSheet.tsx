'use client'

import { useState, useTransition } from 'react'
import { publishForm, sendFormLinkSMS } from '@/lib/actions/forms'
import { FormSignatureModal } from './FormSignatureModal'
import { FORM_TEMPLATES } from '@/lib/form-templates'
import type { Form } from '@/types'

interface SignedFormSheetProps {
  form: Form
  customerPhone: string | null
  onClose: () => void
  onSigned: (updated: Form) => void
}

export function SignedFormSheet({ form, customerPhone, onClose, onSigned }: SignedFormSheetProps) {
  const [showSignModal, setShowSignModal] = useState(false)
  const [linkUrl, setLinkUrl] = useState<string | null>(null)
  const [smsSent, setSmsSent] = useState(false)
  const [copied, setCopied] = useState(false)
  const [, startTransition] = useTransition()

  const template = FORM_TEMPLATES[form.form_type]
  const isSigned = form.status === 'Approved'

  function handleGetLink() {
    startTransition(async () => {
      const url = await publishForm(form.id)
      setLinkUrl(url)
    })
  }

  function handleSendSMS() {
    startTransition(async () => {
      await sendFormLinkSMS(form.id)
      setSmsSent(true)
    })
  }

  async function handleCopyLink() {
    if (!linkUrl) return
    await navigator.clipboard.writeText(linkUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSigned() {
    setShowSignModal(false)
    onSigned({ ...form, status: 'Approved' })
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-volturaBlue flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <button onClick={onClose} className="text-volturaGold text-sm font-medium">Done</button>
          <h2 className="text-white font-semibold">{template?.title}</h2>
          <div className="w-12" />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Boilerplate text */}
          <div className="bg-volturaNavy rounded-xl p-4">
            <p className="text-gray-300 text-sm leading-relaxed">{template?.body}</p>
          </div>

          {isSigned ? (
            <div className="bg-green-900/30 border border-green-700/30 rounded-xl p-4">
              <p className="text-green-400 font-semibold">✅ Signed by {form.signer_name}</p>
              {form.signed_at && (
                <p className="text-gray-400 text-sm mt-1">
                  {new Date(form.signed_at).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric'
                  })}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => setShowSignModal(true)}
                className="w-full py-4 bg-volturaGold text-volturaBlue font-bold rounded-xl active:opacity-80"
              >
                Sign In Person
              </button>

              {!linkUrl ? (
                <button
                  onClick={handleGetLink}
                  className="w-full py-4 border border-volturaGold/40 text-volturaGold rounded-xl active:opacity-70"
                >
                  Send Link
                </button>
              ) : (
                <div className="bg-volturaNavy rounded-xl p-4 space-y-3">
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Share link</p>
                  <p className="text-volturaGold text-xs break-all">{linkUrl}</p>
                  <button
                    onClick={handleCopyLink}
                    className="w-full py-2 border border-volturaGold/30 text-volturaGold rounded-lg text-sm"
                  >
                    {copied ? 'Copied ✓' : 'Copy Link'}
                  </button>
                  {customerPhone && !smsSent && (
                    <button
                      onClick={handleSendSMS}
                      className="w-full py-2 border border-volturaGold/30 text-volturaGold rounded-lg text-sm"
                    >
                      Send SMS to {customerPhone}
                    </button>
                  )}
                  {smsSent && (
                    <p className="text-green-400 text-sm text-center">SMS sent ✓</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showSignModal && (
        <FormSignatureModal
          formId={form.id}
          onClose={() => setShowSignModal(false)}
          onSigned={handleSigned}
        />
      )}
    </>
  )
}
