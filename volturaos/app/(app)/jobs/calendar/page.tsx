export const dynamic = 'force-dynamic'

import { getJobsForMonth } from '@/lib/actions/jobs'
import { JobCalendar } from '@/components/jobs/JobCalendar'
import { PageHeader } from '@/components/ui/PageHeader'
import Link from 'next/link'

export default async function JobCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const now = new Date()
  let year = now.getFullYear()
  let monthNum = now.getMonth() + 1 // 1-indexed

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number)
    year = y
    monthNum = m
  }

  const jobs = await getJobsForMonth(year, monthNum)

  return (
    <>
      <PageHeader
        title="Jobs"
        action={
          <div className="flex items-center gap-2">
            <Link href="/jobs" className="text-gray-400 text-xs">List</Link>
            <Link href="/jobs/calendar" className="text-volturaGold text-xs font-semibold">Cal</Link>
            <Link href="/jobs/new" className="text-volturaGold text-sm font-bold">+ New</Link>
          </div>
        }
      />
      <div className="px-4 pb-6" style={{paddingTop: "var(--header-h)"}}>
        <JobCalendar jobs={jobs} year={year} month={monthNum} />
      </div>
    </>
  )
}
