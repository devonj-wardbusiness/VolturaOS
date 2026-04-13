import Link from 'next/link'
import type { Job } from '@/types'
import { StatusPill } from '@/components/ui/StatusPill'
import { Calendar } from 'lucide-react'
import { STATUS_ACCENT } from '@/lib/constants/jobStatus'

interface JobCardProps {
  job: Job & { customer: { name: string }; invoiceTotal?: number | null }
}

export function JobCard({ job }: JobCardProps) {
  const dateStr = job.scheduled_date
    ? new Date(job.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null
  const timeStr = job.scheduled_time ? job.scheduled_time.slice(0, 5) : null
  const accent = STATUS_ACCENT[job.status] ?? '#4b5563'

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="relative flex items-stretch bg-volturaNavy/50 border border-white/5 rounded-2xl overflow-hidden active:scale-[0.98] transition-transform duration-100"
    >
      {/* Left status strip */}
      <div className="w-[3px] flex-shrink-0" style={{ backgroundColor: accent }} />

      {/* Content */}
      <div className="flex-1 flex items-start justify-between p-4 min-w-0">
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-white font-semibold truncate">{job.customer.name}</p>
          <p className="text-gray-400 text-sm truncate">{job.job_type}</p>
          {dateStr && (
            <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
              <Calendar size={11} className="flex-shrink-0" />
              {dateStr}{timeStr ? ` at ${timeStr}` : ''}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <StatusPill status={job.status} />
          {job.invoiceTotal != null && (
            <p className="text-volturaGold font-bold text-sm">${job.invoiceTotal.toLocaleString()}</p>
          )}
        </div>
      </div>
    </Link>
  )
}
