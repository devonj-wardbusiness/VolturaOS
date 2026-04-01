import { getJobById } from '@/lib/actions/jobs'
import { getOrCreateChecklist } from '@/lib/actions/checklists'
import { getJobPhotos } from '@/lib/actions/job-photos'
import { JobDetail } from '@/components/jobs/JobDetail'
import { JobChecklist } from '@/components/jobs/JobChecklist'
import { notFound } from 'next/navigation'

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
    <div className="min-h-dvh bg-volturaBlue">
      <header className="px-4 pt-4 pb-2 flex items-center gap-3">
        <a href="/jobs" className="text-gray-400 text-sm">&larr; Jobs</a>
        <h1 className="text-white font-semibold flex-1 truncate">{job.customer.name}</h1>
      </header>
      <JobDetail job={job} checklist={checklist} photos={photos} />
    </div>
  )
}
