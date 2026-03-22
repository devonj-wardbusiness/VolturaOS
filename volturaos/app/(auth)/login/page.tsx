'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-dvh bg-volturaBlue flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-volturaGold text-4xl font-bold tracking-widest mb-1">VOLTURA</h1>
        <p className="text-gray-400 text-sm mb-8">Power Group — Field OS</p>

        {sent ? (
          <div className="bg-volturaNavy rounded-2xl p-6 text-center">
            <p className="text-white text-lg font-semibold">Check your email</p>
            <p className="text-gray-400 text-sm mt-2">Magic link sent to {email}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-gray-400 text-sm mb-1">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="dev@volturapower.energy"
                className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-volturaGold"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-volturaGold text-volturaBlue font-bold py-3 rounded-xl text-base disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
