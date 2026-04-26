export const dynamic = 'force-dynamic'

import { listTodayJobs } from '@/lib/actions/jobs'
import { JobsView } from '@/components/jobs/JobsView'
import { PageHeader } from '@/components/ui/PageHeader'
import Link from 'next/link'

export default async function JobsPage() {
  const jobs = await listTodayJobs()
  return (
    <>
      <PageHeader
        title="Jobs"
        action={
          <Link href="/jobs/new" className="text-volturaGold text-sm font-bold">
            + New
          </Link>
        }
      />
      <div style={{paddingTop: "var(--header-h)"}}>
        <JobsView jobs={jobs} />
      </div>
    </>
  )
}
