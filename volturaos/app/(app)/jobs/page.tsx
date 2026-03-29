export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { listJobs } from '@/lib/actions/jobs'
import { JobBoard } from '@/components/jobs/JobBoard'
import Link from 'next/link'

export default async function JobsPage() {
  const jobs = await listJobs()
  return (
    <div className="px-4 pt-6 pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-volturaGold text-xl font-bold">Jobs</h1>
        <Link href="/jobs/new" className="bg-volturaGold text-volturaBlue font-bold px-4 py-2 rounded-xl text-sm">+ New</Link>
      </div>
      <Suspense>
        <JobBoard jobs={jobs} />
      </Suspense>
    </div>
  )
}
