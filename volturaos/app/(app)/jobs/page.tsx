export const dynamic = 'force-dynamic'

import { listTodayJobs } from '@/lib/actions/jobs'
import { TodayView } from '@/components/jobs/TodayView'
import { PageHeader } from '@/components/ui/PageHeader'
import Link from 'next/link'

export default async function JobsPage() {
  const jobs = await listTodayJobs()
  return (
    <>
      <PageHeader
        title="Today"
        action={
          <Link href="/jobs/new" className="text-volturaGold text-sm font-bold">
            + New
          </Link>
        }
      />
      <div className="pt-14">
        <TodayView jobs={jobs} />
      </div>
    </>
  )
}
