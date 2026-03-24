import Link from 'next/link'
import type { Job } from '@/types'
import { StatusPill } from '@/components/ui/StatusPill'

interface JobCardProps {
  job: Job & { customer: { name: string } }
}

export function JobCard({ job }: JobCardProps) {
  const dateStr = job.scheduled_date
    ? new Date(job.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null
  const timeStr = job.scheduled_time
    ? job.scheduled_time.slice(0, 5)
    : null

  return (
    <Link href={`/jobs/${job.id}`} className="block bg-volturaNavy/50 rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">{job.customer.name}</p>
          <p className="text-gray-400 text-sm truncate">{job.job_type}</p>
          {dateStr && (
            <p className="text-gray-500 text-xs mt-1">
              📅 {dateStr}{timeStr ? ` at ${timeStr}` : ''}
            </p>
          )}
        </div>
        <StatusPill status={job.status} />
      </div>
    </Link>
  )
}
