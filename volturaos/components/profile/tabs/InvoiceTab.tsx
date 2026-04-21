'use client'

import Link from 'next/link'
import { StatusPill } from '@/components/ui/StatusPill'
import type { Invoice } from '@/types'

interface InvoiceTabProps {
  invoices: Invoice[]
  customerId: string
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function InvoiceTab({ invoices, customerId }: InvoiceTabProps) {
  return (
    <div className="px-4 pt-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold text-base">Invoices</h2>
        <Link
          href={`/invoices/new?customerId=${customerId}`}
          className="text-volturaGold text-xs font-bold border border-volturaGold/40 px-3 py-1 rounded-lg"
        >
          + New
        </Link>
      </div>

      {invoices.length === 0 && (
        <p className="text-gray-600 text-sm text-center py-8">No invoices yet</p>
      )}

      <div className="space-y-3">
        {invoices.map(inv => (
          <Link
            key={inv.id}
            href={`/invoices/${inv.id}`}
            className="block bg-[#161b29] border border-white/5 rounded-xl p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-white font-semibold text-sm">
                  #{inv.id.slice(-6).toUpperCase()}
                </p>
                {inv.due_date && (
                  <p className="text-gray-500 text-xs">Due {formatDate(inv.due_date)}</p>
                )}
              </div>
              <StatusPill status={inv.status} />
            </div>

            <div className="flex justify-between text-sm mt-2">
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-wider">Total</p>
                <p className="text-white font-bold">{fmt(inv.total)}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-[10px] uppercase tracking-wider">Balance</p>
                <p
                  className="font-bold"
                  style={{ color: inv.balance > 0 ? '#ef4444' : '#3fd47a' }}
                >
                  {fmt(inv.balance)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
