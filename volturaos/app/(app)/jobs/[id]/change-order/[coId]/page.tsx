export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getChangeOrder } from '@/lib/actions/change-orders'
import { getAllPricebook, getRecentPricebookItems } from '@/lib/actions/pricebook'
import { ChangeOrderBuilder } from '@/components/jobs/ChangeOrderBuilder'
import { PageHeader } from '@/components/ui/PageHeader'

export default async function EditChangeOrderPage({
  params,
}: { params: Promise<{ id: string; coId: string }> }) {
  const { id: jobId, coId } = await params
  const [co, pricebook, recents] = await Promise.all([
    getChangeOrder(coId).catch(() => null),
    getAllPricebook(),
    getRecentPricebookItems(6),
  ])
  if (!co || co.job.id !== jobId) notFound()

  if (co.status === 'Signed') {
    return (
      <>
        <PageHeader title="Change Order" />
        <div className="px-4 pt-20 text-center">
          <p className="text-green-400 font-semibold text-lg">✅ Already signed</p>
          <p className="text-gray-400 text-sm mt-2">This change order has been authorized by the customer.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Change Order" />
      <div className="pt-14">
        <ChangeOrderBuilder
          changeOrder={co}
          originalEstimateName={co.originalEstimate?.name ?? 'Estimate'}
          originalTotal={co.originalEstimate?.total ?? 0}
          pricebook={pricebook}
          initialRecents={recents}
          jobId={jobId}
        />
      </div>
    </>
  )
}
