'use client'

import { useState } from 'react'
import { signInWithPassword } from '@/lib/actions/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signInWithPassword(email, password)

    if (result.error) {
      setError(result.error)
    } else {
      window.location.href = '/'
    }

    setLoading(false)
  }

  return (
    <div className="min-h-dvh bg-volturaBlue flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-volturaGold text-4xl font-bold tracking-widest mb-1">VOLTURA</h1>
        <p className="text-gray-400 text-sm mb-8">Power Group — Field OS</p>

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

          <div>
            <label htmlFor="password" className="block text-gray-400 text-sm mb-1">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Min 6 characters"
              className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-volturaGold"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-volturaGold text-volturaBlue font-bold py-3 rounded-xl text-base disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
