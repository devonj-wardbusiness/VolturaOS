export const dynamic = 'force-dynamic'

import { listEstimates } from '@/lib/actions/estimates'
import { StatusPill } from '@/components/ui/StatusPill'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import Link from 'next/link'
import type { Estimate, EstimateStatus } from '@/types'

type EstimateWithCustomer = Estimate & { customer: { name: string } }

function groupEstimates(estimates: EstimateWithCustomer[]) {
  const anchors = estimates.filter((e) => !e.proposal_id)
  const children = estimates.filter((e) => e.proposal_id)

  return anchors.map((anchor) => {
    const siblings = children.filter((c) => c.proposal_id === anchor.id)
    const group = [anchor, ...siblings].sort(
      (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)
    )
    return group
  })
}

function groupStatus(group: EstimateWithCustomer[]): EstimateStatus {
  if (group.some((e) => e.status === 'Approved')) return 'Approved'
  if (group.some((e) => e.status === 'Sent')) return 'Sent'
  if (group.some((e) => e.status === 'Viewed')) return 'Viewed'
  return 'Draft'
}

export default async function EstimatesPage() {
  const estimates = await listEstimates()
  const groups = groupEstimates(estimates)

  return (
    <>
      <PageHeader
        title="Estimates"
        action={<Link href="/estimates/new" className="text-volturaGold text-sm pr-4">+ New</Link>}
      />
      <div className="px-4 pt-14 pb-6">
        {groups.length === 0 ? (
          <EmptyState message="No estimates yet — tap + to create one" ctaLabel="+ New Estimate" ctaHref="/estimates/new" />
        ) : (
          <div className="space-y-2">
            {groups.map((group) => {
              const anchor = group[0]
              const isGrouped = group.length > 1
              const status = groupStatus(group)
              const maxTotal = Math.max(...group.map((e) => e.total ?? 0))
              const names = group.map((e) => e.name ?? 'Estimate').join(' · ')
              const hasFollowUp = anchor.follow_up_sent_at && !anchor.follow_up_dismissed && anchor.status === 'Sent'

              return (
                <Link key={anchor.id} href={`/estimates/${anchor.id}`} className="block bg-volturaNavy/50 border border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-transform duration-100">
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
            })}
          </div>
        )}
      </div>
    </>
  )
}
