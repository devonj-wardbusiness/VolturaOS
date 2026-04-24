export const dynamic = 'force-dynamic'

import { getJobWithContext, listCustomerJobs } from '@/lib/actions/jobs'
import { getOrCreateChecklist } from '@/lib/actions/checklists'
import { getJobPhotos } from '@/lib/actions/job-photos'
import { getSignedEstimateForJob, listCustomerEstimates } from '@/lib/actions/estimates'
import { listChangeOrdersForJob } from '@/lib/actions/change-orders'
import { listCustomerInvoices } from '@/lib/actions/invoices'
import { listJobForms } from '@/lib/actions/forms'
import { getInspectionsByCustomer } from '@/lib/actions/inspections'
import { UnifiedProfile } from '@/components/profile/UnifiedProfile'
import { notFound } from 'next/navigation'

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let job
  try {
    job = await getJobWithContext(id)
  } catch {
    notFound()
  }

  const [checklist, photos, signedEstimate, changeOrders, estimates, invoices, jobHistory, forms, inspections] =
    await Promise.all([
      getOrCreateChecklist(job.id, job.job_type),
      getJobPhotos(job.id),
      getSignedEstimateForJob(job.id),
      listChangeOrdersForJob(job.id),
      listCustomerEstimates(job.customer_id),
      listCustomerInvoices(job.customer_id),
      listCustomerJobs(job.customer_id, job.id),
      listJobForms(job.id),
      getInspectionsByCustomer(job.customer_id),
    ])

  return (
    <UnifiedProfile
      job={job}
      checklist={checklist}
      photos={photos}
      signedEstimateId={signedEstimate?.id ?? null}
      changeOrders={changeOrders}
      estimates={estimates}
      invoices={invoices}
      jobHistory={jobHistory}
      forms={forms}
      inspections={inspections}
    />
  )
}
