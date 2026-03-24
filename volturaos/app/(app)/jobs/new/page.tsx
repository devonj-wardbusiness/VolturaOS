import { getAllPricebook } from '@/lib/actions/pricebook'
import { JobForm } from '@/components/jobs/JobForm'

export default async function NewJobPage() {
  const pricebook = await getAllPricebook()
  const jobTypes = pricebook.map((p) => p.job_type)

  return (
    <div className="min-h-dvh bg-volturaBlue">
      <header className="px-4 pt-4 pb-2 flex items-center gap-3">
        <a href="/jobs" className="text-gray-400 text-sm">&larr; Jobs</a>
        <h1 className="text-white font-semibold">New Job</h1>
      </header>
      <JobForm jobTypes={jobTypes} />
    </div>
  )
}
