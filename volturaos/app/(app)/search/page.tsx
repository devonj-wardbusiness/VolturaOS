'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { searchAll } from '@/lib/actions/search'

type SearchResults = Awaited<ReturnType<typeof searchAll>>

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const data = await searchAll(query)
        setResults(data)
      } catch {
        setResults(null)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const noResults =
    results !== null &&
    results.customers.length === 0 &&
    results.jobs.length === 0 &&
    results.estimates.length === 0 &&
    results.invoices.length === 0

  return (
    <>
      <PageHeader title="Search" />
      <div className="px-4 pt-14 pb-6">
        <input
          autoFocus
          type="search"
          placeholder="Search customers, jobs, estimates..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-volturaNavy/50 border border-white/10 focus:border-volturaGold rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none mt-4 mb-6"
        />

        {noResults && (
          <p className="text-gray-500 text-sm text-center">No results for &ldquo;{query}&rdquo;</p>
        )}

        {results && results.customers.length > 0 && (
          <section className="mb-5">
            <p className="text-gray-500 text-[11px] uppercase tracking-widest mb-2">Customers ({results.customers.length})</p>
            <div className="divide-y divide-white/5">
              {results.customers.map((c: Record<string, unknown>) => (
                <Link key={c.id as string} href={`/customers/${c.id}`} className="flex flex-col py-2.5">
                  <span className="text-white text-sm">{c.name as string}</span>
                  {!!c.address && <span className="text-gray-500 text-xs">{c.address as string}</span>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {results && results.jobs.length > 0 && (
          <section className="mb-5">
            <p className="text-gray-500 text-[11px] uppercase tracking-widest mb-2">Jobs ({results.jobs.length})</p>
            <div className="divide-y divide-white/5">
              {results.jobs.map((j: Record<string, unknown>) => {
                const customer = j.customers as { name: string } | null
                return (
                  <Link key={j.id as string} href={`/jobs/${j.id}`} className="flex justify-between items-center py-2.5">
                    <div>
                      <span className="text-white text-sm">{j.job_type as string}</span>
                      {customer && <p className="text-gray-500 text-xs">{customer.name}</p>}
                    </div>
                    <span className="text-gray-400 text-xs">{j.status as string}</span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {results && results.estimates.length > 0 && (
          <section className="mb-5">
            <p className="text-gray-500 text-[11px] uppercase tracking-widest mb-2">Estimates ({results.estimates.length})</p>
            <div className="divide-y divide-white/5">
              {results.estimates.map((e: Record<string, unknown>) => {
                const customer = e.customers as { name: string } | null
                return (
                  <Link key={e.id as string} href={`/estimates/${e.id}`} className="flex justify-between items-center py-2.5">
                    <div>
                      <span className="text-white text-sm">{e.name as string}</span>
                      {customer && <p className="text-gray-500 text-xs">{customer.name}</p>}
                    </div>
                    <span className="text-volturaGold text-xs">${((e.total as number) ?? 0).toLocaleString()}</span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {results && results.invoices.length > 0 && (
          <section className="mb-5">
            <p className="text-gray-500 text-[11px] uppercase tracking-widest mb-2">Invoices ({results.invoices.length})</p>
            <div className="divide-y divide-white/5">
              {results.invoices.map((inv: Record<string, unknown>) => {
                const customer = inv.customers as { name: string } | null
                return (
                  <Link key={inv.id as string} href={`/invoices/${inv.id}`} className="flex justify-between items-center py-2.5">
                    <div>
                      <span className="text-white text-sm">{customer?.name ?? 'Invoice'}</span>
                      <p className="text-gray-500 text-xs">{inv.status as string}</p>
                    </div>
                    <span className="text-volturaGold text-xs">${((inv.total as number) ?? 0).toLocaleString()}</span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
