'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Estimate, EstimateStatus } from '@/types'
import { StatusPill } from '@/components/ui/StatusPill'
import { useLongPress } from '@/hooks/useLongPress'
import { useActionSheet } from '@/components/ui/ActionSheetProvider'
import { deleteEstimate, duplicateEstimate } from '@/lib/actions/estimates'

type EstimateWithCustomer = Estimate & { customer: { name: string } }

interface EstimateGroupCardProps {
  group: EstimateWithCustomer[]
  status: EstimateStatus
}

export function EstimateGroupCard({ group, status }: EstimateGroupCardProps) {
  const router = useRouter()
  const { openSheet } = useActionSheet()

  const anchor = group[0]
  const isGrouped = group.length > 1
  const maxTotal = Math.max(...group.map((e) => e.total ?? 0))
  const names = group.map((e) => e.name ?? 'Estimate').join(' · ')
  const hasFollowUp = anchor.follow_up_sent_at && !anchor.follow_up_dismissed && anchor.status === 'Sent'
  const label = `${anchor.customer?.name ?? 'Unknown'} — ${anchor.name ?? 'Estimate'}`

  function showSheet() {
    openSheet(label, [
      {
        icon: '✏️',
        label: 'Edit',
        onClick: () => router.push(`/estimates/${anchor.id}`),
      },
      {
        icon: '📋',
        label: 'Duplicate',
        onClick: async () => {
          await duplicateEstimate(anchor.id)
          router.refresh()
        },
      },
      {
        icon: '🗑️',
        label: 'Delete',
        onClick: async () => {
          await deleteEstimate(anchor.id)
          router.refresh()
        },
        destructive: true,
      },
    ])
  }

  const bind = useLongPress(showSheet)

  return (
    <Link
      href={`/estimates/${anchor.id}`}
      className="block bg-volturaNavy/50 border border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-transform duration-100"
      {...bind}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1 pr-3">
          <p className="text-white font-semibold">{anchor.customer?.name ?? 'Unknown'}</p>
          <p className="text-gray-400 text-xs mt-0.5 truncate">
            {names}
            {hasFollowUp && <span className="text-yellow-400 ml-1">🔔</span>}
          </p>
          {isGrouped && (
            <p className="text-volturaGold/70 text-xs mt-0.5">{group.length} estimates</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <StatusPill status={status} />
          {maxTotal > 0 && <p className="text-volturaGold font-bold text-sm mt-1">${maxTotal.toLocaleString()}</p>}
        </div>
      </div>
    </Link>
  )
}
