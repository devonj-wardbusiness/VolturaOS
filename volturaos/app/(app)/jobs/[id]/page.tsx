import { getJobById } from '@/lib/actions/jobs'
import { JobDetail } from '@/components/jobs/JobDetail'
import { notFound } from 'next/navigation'

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let job
  try {
    job = await getJobById(id)
  } catch {
    notFound()
  }
  return (
    <div className="min-h-dvh bg-volturaBlue">
      <header className="px-4 pt-4 pb-2 flex items-center gap-3">
        <a href="/jobs" className="text-gray-400 text-sm">&larr; Jobs</a>
        <h1 className="text-white font-semibold flex-1 truncate">{job.customer.name}</h1>
      </header>
      <JobDetail job={job} />
    </div>
  )
}
