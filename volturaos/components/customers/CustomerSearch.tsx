'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export function CustomerSearch({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery)
  const router = useRouter()

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = query ? `?q=${encodeURIComponent(query)}` : ''
      router.push(`/customers${params}`)
    }, 300)
    return () => clearTimeout(timeout)
  }, [query, router])

  return (
    <input
      type="text"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search by name, phone, or address..."
      className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold"
    />
  )
}
