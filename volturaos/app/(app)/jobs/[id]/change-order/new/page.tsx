import { redirect, notFound } from 'next/navigation'
import { getJobById } from '@/lib/actions/jobs'
import { getSignedEstimateForJob } from '@/lib/actions/estimates'
import { createChangeOrder } from '@/lib/actions/change-orders'
import { PageHeader } from '@/components/ui/PageHeader'

export default async function NewChangeOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = await params
  const [job, signedEstimate] = await Promise.all([
    getJobById(jobId).catch(() => null),
    getSignedEstimateForJob(jobId),
  ])
  if (!job || !signedEstimate) {
    return (
      <>
        <PageHeader title="Change Order" />
        <div className="px-4 pt-20 text-center">
          <p className="text-gray-400 text-sm">No signed estimate found for this job.</p>
          <p className="text-gray-500 text-xs mt-1">A customer must approve an estimate before you can add a change order.</p>
        </div>
      </>
    )
  }

  const co = await createChangeOrder(jobId, signedEstimate.id)
  redirect(`/jobs/${jobId}/change-order/${co.id}`)
}
