'use client'

import { useState } from 'react'
import { createReferral } from '@/lib/actions/referrals'

export function ReferralForm({ estimateId }: { estimateId: string }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    setLoading(true)
    setError(null)
    try {
      await createReferral({
        estimateId,
        name: name.trim(),
        phone: phone.trim(),
        projectNotes: notes.trim() || undefined,
      })
      setSubmitted(true)
    } catch {
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-volturaNavy rounded-2xl p-5 text-center">
        <p className="text-2xl mb-2">🙏</p>
        <p className="text-white font-semibold">Thanks for the referral!</p>
        <p className="text-gray-400 text-sm mt-1">We&apos;ll reach out to them soon.</p>
      </div>
    )
  }

  return (
    <div className="bg-volturaNavy rounded-2xl p-5">
      <p className="text-volturaGold font-semibold text-sm uppercase tracking-wider mb-1">
        Know someone who needs electrical work?
      </p>
      <p className="text-gray-400 text-sm mb-4">
        Send a friend our way — we&apos;ll take great care of them.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Their name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full bg-white/10 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-volturaGold"
        />
        <input
          type="tel"
          placeholder="Their phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="w-full bg-white/10 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-volturaGold"
        />
        <input
          type="text"
          placeholder="What do they need? (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-white/10 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-volturaGold"
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={loading || !name.trim() || !phone.trim()}
          className="w-full bg-volturaGold text-volturaBlue font-bold rounded-xl py-3 text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {loading ? 'Sending…' : 'Send Referral'}
        </button>
      </form>
    </div>
  )
}
