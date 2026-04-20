'use client'

import Link from 'next/link'
import { TodayJobCard } from './TodayJobCard'
import type { Job } from '@/types'

interface TodayViewProps {
  jobs: (Job & { customer: { id: string; name: string; address: string | null } })[]
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function TodayView({ jobs }: TodayViewProps) {
  return (
    <div className="px-4 pb-6">
      {/* Date header */}
      <div className="mb-4">
        <p className="text-gray-500 text-[11px] uppercase tracking-widest">{todayLabel()}</p>
        <h1 className="text-white font-bold text-2xl">Today</h1>
        <p className="text-gray-500 text-sm">
          {jobs.length === 0 ? 'No jobs on deck' : `${jobs.length} job${jobs.length === 1 ? '' : 's'} scheduled`}
        </p>
      </div>

      {/* Job list */}
      {jobs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-600 text-4xl mb-3">🗓️</p>
          <p className="text-gray-400 text-sm mb-4">No jobs scheduled today</p>
          <Link
            href="/jobs/new"
            className="inline-block bg-volturaGold text-volturaBlue font-bold text-sm px-6 py-2 rounded-full"
          >
            + New Job
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map(job => (
            <TodayJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}
