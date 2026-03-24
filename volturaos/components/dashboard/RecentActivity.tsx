import Link from 'next/link'
import { StatusPill } from '@/components/ui/StatusPill'

interface RecentJob {
  id: string
  job_type: string
  status: string
  created_at: string
  customer: { name: string }
}

export function RecentActivity({ jobs }: { jobs: RecentJob[] }) {
  if (jobs.length === 0) {
    return <p className="text-gray-500 text-sm text-center py-4">No recent jobs</p>
  }

  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between bg-volturaNavy/30 rounded-xl px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-medium truncate">{job.customer.name}</p>
            <p className="text-gray-500 text-xs truncate">{job.job_type}</p>
          </div>
          <StatusPill status={job.status} />
        </Link>
      ))}
    </div>
  )
}
