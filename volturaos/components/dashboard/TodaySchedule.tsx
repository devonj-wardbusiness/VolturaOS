'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface TodayJob {
  id: string
  job_type: string
  status: string
  scheduled_time: string | null
  customer: { name: string; phone: string | null }
}

interface TodayScheduleProps {
  jobs: TodayJob[]
}

const STATUS_DOT: Record<string, string> = {
  'Lead': 'bg-gray-400',
  'Scheduled': 'bg-blue-400',
  'In Progress': 'bg-volturaGold',
  'Completed': 'bg-green-400',
}

export function TodaySchedule({ jobs }: TodayScheduleProps) {
  const router = useRouter()
  if (jobs.length === 0) return null

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-white font-semibold text-sm flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-volturaGold animate-pulse" />
          Today — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </h2>
        <Link href="/jobs" className="text-volturaGold text-xs">All jobs</Link>
      </div>

      <div className="space-y-2">
        {jobs.map((job) => {
          const timeStr = job.scheduled_time ? job.scheduled_time.slice(0, 5) : null
          const dot = STATUS_DOT[job.status] ?? 'bg-gray-400'

          return (
            <div
              key={job.id}
              onClick={() => router.push(`/jobs/${job.id}`)}
              className="flex items-center gap-3 bg-volturaGold/10 border border-volturaGold/20 rounded-2xl px-4 py-3 active:scale-[0.98] transition-transform cursor-pointer"
            >
              {/* Time */}
              <div className="text-center w-10 flex-shrink-0">
                {timeStr ? (
                  <p className="text-volturaGold font-bold text-sm leading-none">{timeStr}</p>
                ) : (
                  <p className="text-gray-500 text-xs">TBD</p>
                )}
              </div>

              <div className="w-px h-8 bg-white/10 flex-shrink-0" />

              {/* Job info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{job.customer.name}</p>
                <p className="text-gray-400 text-xs truncate">{job.job_type}</p>
              </div>

              {/* Status dot + call */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                {job.customer.phone && (
                  <a
                    href={`tel:${job.customer.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-green-600/30 text-green-400 text-xs font-bold px-2 py-1 rounded-lg"
                  >
                    Call
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
