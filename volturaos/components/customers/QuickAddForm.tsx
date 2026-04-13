'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCustomer } from '@/lib/actions/customers'

export function QuickAddForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [referralSource, setReferralSource] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      try {
        const customer = await createCustomer({ name, phone, email, referral_source: referralSource || undefined })
        router.push(`/customers/${customer.id}`)
      } catch (err: any) {
        setError(err.message || 'Failed to create customer')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-gray-400 text-sm mb-1">Name *</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
          className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-volturaGold" placeholder="John Smith" />
      </div>
      <div>
        <label className="block text-gray-400 text-sm mb-1">Phone</label>
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
          className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-volturaGold" placeholder="719-555-0100" />
      </div>
      <div>
        <label className="block text-gray-400 text-sm mb-1">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-volturaGold" placeholder="john@example.com" />
      </div>
      <div>
        <label className="block text-gray-400 text-sm mb-1">How did they hear about us?</label>
        <select value={referralSource} onChange={(e) => setReferralSource(e.target.value)}
          className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-volturaGold">
          <option value="">— Select —</option>
          <option value="Google">Google</option>
          <option value="Facebook">Facebook</option>
          <option value="Nextdoor">Nextdoor</option>
          <option value="Word of Mouth">Word of Mouth</option>
          <option value="Repeat Customer">Repeat Customer</option>
          <option value="Yard Sign">Yard Sign</option>
          <option value="Referral">Referral from Customer</option>
          <option value="Other">Other</option>
        </select>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button type="submit" disabled={isPending}
        className="w-full bg-volturaGold text-volturaBlue font-bold py-3 rounded-xl text-base disabled:opacity-50">
        {isPending ? 'Creating...' : 'Add Customer'}
      </button>
    </form>
  )
}
