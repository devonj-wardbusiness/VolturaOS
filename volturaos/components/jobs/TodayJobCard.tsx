'use client'

import Link from 'next/link'
import { StatusPill } from '@/components/ui/StatusPill'
import type { Job } from '@/types'

interface TodayJobCardProps {
  job: Job & { customer: { id: string; name: string; address: string | null } }
}

export function TodayJobCard({ job }: TodayJobCardProps) {
  // Format "8:30" → "8:30 AM" or "13:30" → "1:30 PM"
  function formatTime(t: string | null): { hour: string; period: string } | null {
    if (!t) return null
    const [h, m] = t.split(':').map(Number)
    if (isNaN(h)) return null
    const period = h >= 12 ? 'PM' : 'AM'
    const hour12 = h % 12 || 12
    return { hour: `${hour12}:${String(m).padStart(2, '0')}`, period }
  }

  const time = formatTime(job.scheduled_time)

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="flex items-center gap-3 bg-[#161b29] border border-white/5 rounded-xl px-4 py-3 active:scale-[0.98] transition-transform"
    >
      {/* Time column */}
      <div className="w-12 flex-shrink-0 text-center">
        {time ? (
          <>
            <p className="text-volturaGold font-bold text-sm leading-tight">{time.hour}</p>
            <p className="text-volturaGold text-[10px] font-semibold">{time.period}</p>
          </>
        ) : (
          <p className="text-gray-600 text-sm">—</p>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-white/5 flex-shrink-0" />

      {/* Job info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">{job.customer.name}</p>
        <p className="text-gray-400 text-xs truncate">{job.job_type}</p>
        {job.customer.address && (
          <p className="text-gray-600 text-[11px] truncate mt-0.5">📍 {job.customer.address}</p>
        )}
      </div>

      {/* Status */}
      <div className="flex-shrink-0">
        <StatusPill status={job.status} />
      </div>
    </Link>
  )
}
