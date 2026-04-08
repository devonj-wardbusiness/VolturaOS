export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { listJobs } from '@/lib/actions/jobs'
import { JobBoard } from '@/components/jobs/JobBoard'
import { PageHeader } from '@/components/ui/PageHeader'
import Link from 'next/link'

export default async function JobsPage() {
  const jobs = await listJobs()
  return (
    <>
      <PageHeader
        title="Jobs"
        action={
          <div className="flex items-center gap-2">
            <Link href="/jobs" className="text-volturaGold text-xs font-semibold">List</Link>
            <Link href="/jobs/calendar" className="text-gray-400 text-xs">Cal</Link>
            <Link href="/jobs/new" className="text-volturaGold text-sm font-bold">+ New</Link>
          </div>
        }
      />
      <div className="px-4 pt-14 pb-6">
        <Suspense>
          <JobBoard jobs={jobs} />
        </Suspense>
      </div>
    </>
  )
}
