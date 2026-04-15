export const dynamic = 'force-dynamic'

import { listEstimates } from '@/lib/actions/estimates'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import Link from 'next/link'
import type { Estimate, EstimateStatus } from '@/types'
import { EstimateGroupCard } from '@/components/estimates/EstimateGroupCard'

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
              const status = groupStatus(group)
              return (
                <EstimateGroupCard key={anchor.id} group={group} status={status} />
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
