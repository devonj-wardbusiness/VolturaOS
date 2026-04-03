'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Invoice } from '@/types'
import { StatusPill } from '@/components/ui/StatusPill'
import { EmptyState } from '@/components/ui/EmptyState'

const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Unpaid', value: 'Unpaid' },
  { label: 'Partial', value: 'Partial' },
  { label: 'Paid', value: 'Paid' },
]

interface InvoiceListProps {
  invoices: (Invoice & { customer: { name: string } })[]
}

export function InvoiceList({ invoices }: InvoiceListProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeFilter = searchParams.get('status') || ''

  const filtered = activeFilter
    ? invoices.filter((inv) => inv.status === activeFilter)
    : invoices

  function setFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) { params.set('status', value) } else { params.delete('status') }
    router.push(`/invoices?${params.toString()}`)
  }

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto mb-4 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === f.value
                ? 'bg-volturaGold text-volturaBlue'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {f.label}
            {f.value && (
              <span className="ml-1 opacity-60">
                {invoices.filter((inv) => inv.status === f.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={activeFilter ? `No ${activeFilter.toLowerCase()} invoices` : 'No invoices yet'} />
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => (
            <Link key={inv.id} href={`/invoices/${inv.id}`} className="block bg-volturaNavy/50 border border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-transform duration-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-semibold">{inv.customer.name}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <StatusPill status={inv.status} />
                  <p className="text-volturaGold font-bold text-sm mt-1">${inv.total.toLocaleString()}</p>
                  {inv.balance > 0 && inv.status !== 'Unpaid' && (
                    <p className="text-red-400 text-xs">${inv.balance.toLocaleString()} due</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
