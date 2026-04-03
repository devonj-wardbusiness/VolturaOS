import { getJobById } from '@/lib/actions/jobs'

export const dynamic = 'force-dynamic'
import { getOrCreateChecklist } from '@/lib/actions/checklists'
import { getJobPhotos } from '@/lib/actions/job-photos'
import { JobDetail } from '@/components/jobs/JobDetail'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let job
  try {
    job = await getJobById(id)
  } catch {
    notFound()
  }
  const [checklist, photos] = await Promise.all([
    getOrCreateChecklist(job.id, job.job_type),
    getJobPhotos(job.id),
  ])

  return (
    <>
      <PageHeader title={job.customer.name} backHref="/jobs" />
      <div className="min-h-dvh pt-14">
        <JobDetail job={job} checklist={checklist} photos={photos} />
      </div>
    </>
  )
}
