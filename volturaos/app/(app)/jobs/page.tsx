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
        action={<Link href="/jobs/new" className="text-volturaGold text-sm pr-4">+ New</Link>}
      />
      <div className="px-4 pt-14 pb-6">
        <Suspense>
          <JobBoard jobs={jobs} />
        </Suspense>
      </div>
    </>
  )
}
