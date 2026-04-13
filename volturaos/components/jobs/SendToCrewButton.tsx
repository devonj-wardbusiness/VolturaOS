'use client'

import { useState, useTransition } from 'react'
import { sendCrewSMS } from '@/lib/actions/jobs'

const CREW_PHONE_KEY = 'voltura_crew_phone'

export function SendToCrewButton({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(CREW_PHONE_KEY) ?? ''
    return ''
  })
  const [sent, setSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSend() {
    if (!phone.trim()) return
    localStorage.setItem(CREW_PHONE_KEY, phone.trim())
    startTransition(async () => {
      try {
        await sendCrewSMS(jobId, phone.trim())
        setSent(true)
        setTimeout(() => { setSent(false); setOpen(false) }, 2000)
      } catch {
        alert('Failed to send crew SMS.')
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-sky-600/20 border border-sky-500/30 text-sky-400 font-semibold py-2.5 rounded-xl text-sm"
      >
        📡 Send to Crew
      </button>
    )
  }

  return (
    <div className="bg-volturaNavy/80 border border-sky-500/20 rounded-xl p-4 space-y-3">
      <p className="text-sky-400 text-xs font-semibold uppercase tracking-wider">Send Job Details via SMS</p>
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Crew phone number"
        className="w-full bg-volturaBlue text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
      />
      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 bg-white/5 text-gray-400 py-2.5 rounded-xl text-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleSend}
          disabled={isPending || !phone.trim()}
          className="flex-1 bg-sky-600 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50"
        >
          {isPending ? 'Sending...' : sent ? 'Sent ✓' : 'Send SMS'}
        </button>
      </div>
    </div>
  )
}
