'use client'

import Link from 'next/link'
import { CustomerHistory } from '@/components/customers/CustomerHistory'
import type { Job, Invoice, HistoryItem } from '@/types'

type EstimateSlice = {
  id: string
  name: string
  total: number | null
  status: string
  created_at: string
}

interface HistoryTabProps {
  customer: { id: string; name: string; phone: string | null; email: string | null; address: string | null }
  jobHistory: Job[]
  estimates: EstimateSlice[]
  invoices: Invoice[]
}

export function HistoryTab({ customer, jobHistory, estimates, invoices }: HistoryTabProps) {
  const items: HistoryItem[] = [
    ...jobHistory.map(j => ({
      type: 'job' as const,
      id: j.id,
      title: j.job_type,
      status: j.status,
      date: j.created_at,
      href: `/jobs/${j.id}`,
    })),
    ...estimates.map(e => ({
      type: 'estimate' as const,
      id: e.id,
      title: e.name,
      status: e.status,
      amount: e.total ?? undefined,
      date: e.created_at,
      href: `/estimates/${e.id}`,
    })),
    ...invoices.map(inv => ({
      type: 'invoice' as const,
      id: inv.id,
      title: `Invoice #${inv.id.slice(-6).toUpperCase()}`,
      status: inv.status,
      amount: inv.balance,
      date: inv.created_at,
      href: `/invoices/${inv.id}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="px-4 pt-4 pb-6">
      {/* Customer contact card */}
      <div className="bg-white/5 rounded-xl p-4 mb-2">
        <p className="text-white font-semibold text-base">{customer.name}</p>
        {customer.phone && (
          <a href={`tel:${customer.phone}`} className="text-volturaGold text-sm block mt-0.5">
            {customer.phone}
          </a>
        )}
        {customer.email && <p className="text-gray-400 text-sm mt-0.5">{customer.email}</p>}
        {customer.address && <p className="text-gray-400 text-sm mt-0.5">{customer.address}</p>}

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="flex-1 text-center text-xs font-bold py-2 bg-green-900/30 text-green-400 rounded-lg"
            >
              📞 Call
            </a>
          )}
          <Link
            href={`/invoices/new?customerId=${customer.id}`}
            className="flex-1 text-center text-xs font-bold py-2 bg-white/5 text-gray-400 rounded-lg"
          >
            + Invoice
          </Link>
          <Link
            href={`/customers/${customer.id}`}
            className="flex-1 text-center text-xs font-bold py-2 bg-white/5 text-gray-400 rounded-lg"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Timeline */}
      <CustomerHistory items={items} />
      {items.length === 0 && (
        <p className="text-gray-600 text-sm text-center py-8">No history yet</p>
      )}
    </div>
  )
}
