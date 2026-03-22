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
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      try {
        const customer = await createCustomer({ name, phone, email })
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
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button type="submit" disabled={isPending}
        className="w-full bg-volturaGold text-volturaBlue font-bold py-3 rounded-xl text-base disabled:opacity-50">
        {isPending ? 'Creating...' : 'Add Customer'}
      </button>
    </form>
  )
}
