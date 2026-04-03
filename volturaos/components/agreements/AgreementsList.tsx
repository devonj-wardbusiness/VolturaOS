'use client'

import { useRouter } from 'next/navigation'
import type { MaintenanceAgreement } from '@/types'
import Link from 'next/link'

const FILTERS = ['All', 'Active', 'Expiring', 'Expired', 'Cancelled'] as const

const STATUS_COLORS: Record<string, string> = {
  Active: 'text-green-400',
  Expired: 'text-red-400',
  Cancelled: 'text-gray-500',
}

interface Props {
  agreements: (MaintenanceAgreement & { customer: { name: string } })[]
  currentFilter?: string
}

export function AgreementsList({ agreements, currentFilter }: Props) {
  const router = useRouter()

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="text-volturaGold text-xl font-bold mb-4">Agreements</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => router.push(f === 'All' ? '/agreements' : `/agreements?filter=${f}`)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors ${
              (f === 'All' && !currentFilter) || currentFilter === f
                ? 'bg-volturaGold text-volturaBlue border-volturaGold'
                : 'bg-transparent text-gray-400 border-gray-600'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {agreements.length === 0 ? (
        <p className="text-gray-500 text-sm">No agreements found.</p>
      ) : (
        <div className="space-y-2">
          {agreements.map(a => (
            <Link key={a.id} href={`/customers/${a.customer_id}`} className="block bg-volturaNavy rounded-xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-white font-semibold text-sm">{a.customer.name}</p>
                <span className={`text-xs font-semibold ${STATUS_COLORS[a.status] ?? 'text-gray-400'}`}>
                  {a.status}
                </span>
              </div>
              <p className="text-gray-400 text-xs mt-1">
                Renews {new Date(a.renewal_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${a.price}/yr
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
