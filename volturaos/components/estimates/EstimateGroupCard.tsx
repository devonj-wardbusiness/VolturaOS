'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Estimate, EstimateStatus, LineItem, Addon } from '@/types'
import { StatusPill } from '@/components/ui/StatusPill'
import { useLongPress } from '@/hooks/useLongPress'
import { useActionSheet } from '@/components/ui/ActionSheetProvider'
import { deleteEstimate, duplicateEstimate } from '@/lib/actions/estimates'

type EstimateWithCustomer = Estimate & { customer: { name: string } }

interface EstimateGroupCardProps {
  group: EstimateWithCustomer[]
  status: EstimateStatus
}

function calcSavings(lineItems: LineItem[] | null, addons: Addon[] | null): number {
  let saved = 0
  for (const item of lineItems ?? []) {
    if (item.is_override && item.original_price != null && item.original_price > item.price) {
      saved += item.original_price - item.price
    }
  }
  for (const addon of addons ?? []) {
    if (addon.selected && addon.original_price > addon.price) {
      saved += addon.original_price - addon.price
    }
  }
  return saved
}

function itemCount(lineItems: LineItem[] | null, addons: Addon[] | null): number {
  const lines = (lineItems ?? []).length
  const selected = (addons ?? []).filter((a) => a.selected).length
  return lines + selected
}

function EstimateCard({ estimate }: { estimate: EstimateWithCustomer }) {
  const router = useRouter()
  const { openSheet } = useActionSheet()
  const label = `${estimate.customer?.name ?? 'Unknown'} — ${estimate.name ?? 'Estimate'}`
  const savings = calcSavings(estimate.line_items, estimate.addons)
  const count = itemCount(estimate.line_items, estimate.addons)
  const hasFollowUp = estimate.follow_up_sent_at && !estimate.follow_up_dismissed && estimate.status === 'Sent'

  function showSheet() {
    openSheet(label, [
      {
        icon: '✏️',
        label: 'Edit',
        onClick: () => router.push(`/estimates/${estimate.id}`),
      },
      {
        icon: '📋',
        label: 'Duplicate',
        onClick: async () => {
          await duplicateEstimate(estimate.id)
          router.refresh()
        },
      },
      {
        icon: '🗑️',
        label: 'Delete',
        onClick: async () => {
          await deleteEstimate(estimate.id)
          router.refresh()
        },
        destructive: true,
      },
    ])
  }

  const bind = useLongPress(showSheet)

  return (
    <Link
      href={`/estimates/${estimate.id}`}
      className="block bg-volturaNavy/60 border border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-transform duration-100"
      {...bind}
    >
      {/* Top row — name + status */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-white font-semibold text-sm leading-snug flex-1">
          {estimate.name || 'Estimate'}
          {hasFollowUp && <span className="text-yellow-400 ml-1.5">🔔</span>}
        </p>
        <StatusPill status={estimate.status} />
      </div>

      {/* Item count */}
      {count > 0 && (
        <p className="text-gray-500 text-xs mt-1.5">{count} {count === 1 ? 'item' : 'items'}</p>
      )}

      {/* Divider + price row */}
      <div className="flex items-end justify-between mt-3 pt-3 border-t border-white/5">
        <div>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest font-semibold mb-0.5">Total</p>
          <p className="text-volturaGold font-bold text-lg leading-none">
            ${(estimate.total ?? 0).toLocaleString()}
          </p>
        </div>
        {savings > 0 && (
          <div className="text-right">
            <p className="text-gray-500 text-[10px] uppercase tracking-widest font-semibold mb-0.5">You Save</p>
            <p className="text-green-400 font-semibold text-sm leading-none">
              ${savings.toFixed(0)}
            </p>
          </div>
        )}
      </div>
    </Link>
  )
}

export function EstimateGroupCard({ group, status }: EstimateGroupCardProps) {
  const anchor = group[0]
  const customerName = anchor.customer?.name ?? 'Unknown'

  return (
    <div className="space-y-2">
      {/* Group header — customer name + overall status */}
      <div className="flex items-center justify-between px-1 pt-2">
        <div className="min-w-0">
          <p className="text-white font-bold text-base truncate">{customerName}</p>
          {group.length > 1 && (
            <p className="text-gray-600 text-xs">{group.length} options</p>
          )}
        </div>
        <StatusPill status={status} />
      </div>

      {/* One card per estimate in the group */}
      {group.map((est) => (
        <EstimateCard key={est.id} estimate={est} />
      ))}
    </div>
  )
}
