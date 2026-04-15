'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Invoice } from '@/types'
import { StatusPill } from '@/components/ui/StatusPill'
import { EmptyState } from '@/components/ui/EmptyState'
import { useLongPress } from '@/hooks/useLongPress'
import { useActionSheet } from '@/components/ui/ActionSheetProvider'
import { deleteInvoice, sendInvoiceReminder } from '@/lib/actions/invoices'

const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Unpaid', value: 'Unpaid' },
  { label: 'Partial', value: 'Partial' },
  { label: 'Paid', value: 'Paid' },
]

interface InvoiceListProps {
  invoices: (Invoice & { customer: { name: string } })[]
}

function getAgingInfo(invoice: Invoice): { label: string; color: string } | null {
  if (invoice.status === 'Paid') return null
  const created = new Date(invoice.created_at).getTime()
  const due = invoice.due_date
    ? new Date(invoice.due_date + 'T00:00:00').getTime()
    : created + 30 * 86400000
  const daysOverdue = Math.floor((Date.now() - due) / 86400000)
  if (daysOverdue <= 0) {
    const daysToDue = Math.ceil((due - Date.now()) / 86400000)
    if (daysToDue <= 7) return { label: `Due in ${daysToDue}d`, color: 'text-yellow-400' }
    return null
  }
  if (daysOverdue >= 60) return { label: `${daysOverdue}d overdue`, color: 'text-red-500' }
  if (daysOverdue >= 30) return { label: `${daysOverdue}d overdue`, color: 'text-red-400' }
  return { label: `${daysOverdue}d overdue`, color: 'text-orange-400' }
}

function getLeftBorderColor(invoice: Invoice): string {
  if (invoice.status === 'Paid') return '#4ade80'
  if (invoice.status === 'Partial') return '#facc15'
  const aging = getAgingInfo(invoice)
  if (aging?.color === 'text-red-500') return '#ef4444'
  if (aging?.color === 'text-red-400') return '#f87171'
  if (aging?.color === 'text-orange-400') return '#fb923c'
  return '#f87171'
}

function InvoiceRow({ inv }: { inv: Invoice & { customer: { name: string } } }) {
  const router = useRouter()
  const { openSheet } = useActionSheet()
  const aging = getAgingInfo(inv)
  const borderColor = getLeftBorderColor(inv)

  function showSheet() {
    openSheet(`${inv.customer.name} — $${inv.total.toLocaleString()}`, [
      {
        icon: '✏️',
        label: 'Edit',
        onClick: () => router.push(`/invoices/${inv.id}`),
      },
      {
        icon: '💰',
        label: 'Record Payment',
        onClick: () => router.push(`/invoices/${inv.id}`),
      },
      {
        icon: '📨',
        label: 'Send Reminder',
        onClick: async () => {
          await sendInvoiceReminder(inv.id)
        },
      },
      {
        icon: '🗑️',
        label: 'Delete',
        onClick: async () => {
          await deleteInvoice(inv.id)
          router.refresh()
        },
        destructive: true,
      },
    ])
  }

  const bind = useLongPress(showSheet)

  return (
    <Link
      href={`/invoices/${inv.id}`}
      className="relative flex items-stretch bg-volturaNavy/50 border border-white/5 rounded-2xl overflow-hidden active:scale-[0.98] transition-transform duration-100"
      {...bind}
    >
      <div className="w-[3px] flex-shrink-0" style={{ backgroundColor: borderColor }} />
      <div className="flex-1 flex items-start justify-between p-4">
        <div>
          <p className="text-white font-semibold">{inv.customer.name}</p>
          <p className="text-gray-500 text-xs mt-1">
            {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
          {aging && (
            <p className={`text-xs mt-1 font-semibold ${aging.color}`}>{aging.label}</p>
          )}
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
  )
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

  // Unpaid aging summary
  const overdueCount = invoices.filter((inv) => {
    if (inv.status === 'Paid') return false
    const aging = getAgingInfo(inv)
    return aging && aging.label.includes('overdue')
  }).length

  return (
    <div>
      {/* Overdue alert banner */}
      {overdueCount > 0 && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
          <span className="text-red-400 text-lg">⚠️</span>
          <p className="text-red-300 text-sm font-semibold">
            {overdueCount} overdue invoice{overdueCount > 1 ? 's' : ''} — follow up now
          </p>
        </div>
      )}

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
          {filtered.map((inv) => <InvoiceRow key={inv.id} inv={inv} />)}
        </div>
      )}
    </div>
  )
}
