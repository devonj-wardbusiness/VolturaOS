'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { TodayJobCard } from './TodayJobCard'
import type { Job } from '@/types'

type Filter = 'today' | 'week' | 'upcoming' | 'in_progress' | 'all'

interface JobsViewProps {
  jobs: (Job & { customer: { id: string; name: string; address: string | null } })[]
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'today',       label: 'Today' },
  { id: 'week',        label: 'This Week' },
  { id: 'upcoming',    label: 'Upcoming' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'all',         label: 'All Active' },
]

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}
function startOfWeek(d: Date) {
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.getFullYear(), d.getMonth(), diff)
}
function endOfWeek(d: Date) {
  const day = d.getDay()
  const diff = d.getDate() + (6 - day)
  return new Date(d.getFullYear(), d.getMonth(), diff, 23, 59, 59, 999)
}

export function JobsView({ jobs }: JobsViewProps) {
  const [filter, setFilter] = useState<Filter>('today')

  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const weekEnd = endOfWeek(now)

  const filtered = useMemo(() => {
    return jobs.filter(job => {
      const dateStr = job.scheduled_date
      const jobDate = dateStr ? new Date(dateStr + 'T00:00:00') : null

      switch (filter) {
        case 'today':
          return jobDate
            ? jobDate >= todayStart && jobDate <= todayEnd
            : job.status === 'In Progress'
        case 'week':
          return jobDate
            ? jobDate >= todayStart && jobDate <= weekEnd
            : job.status === 'In Progress'
        case 'upcoming':
          return jobDate ? jobDate > todayEnd : false
        case 'in_progress':
          return job.status === 'In Progress'
        case 'all':
          return true
        default:
          return true
      }
    })
  }, [jobs, filter, todayStart, todayEnd, weekEnd])

  const filterLabel = () => {
    switch (filter) {
      case 'today': return now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      case 'week': return 'This week'
      case 'upcoming': return 'Coming up'
      case 'in_progress': return 'Currently in progress'
      case 'all': return 'All active jobs'
    }
  }

  return (
    <div className="px-4 pb-6">
      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 pt-3 scrollbar-hide">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === f.id
                ? 'bg-volturaGold text-volturaBlue'
                : 'bg-volturaNavy text-gray-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Date/context label */}
      <div className="mb-3">
        <p className="text-gray-500 text-[11px] uppercase tracking-widest">{filterLabel()}</p>
        <p className="text-gray-500 text-sm">
          {filtered.length === 0
            ? 'No jobs'
            : `${filtered.length} job${filtered.length === 1 ? '' : 's'}`}
        </p>
      </div>

      {/* Job list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-600 text-4xl mb-3">🗓️</p>
          <p className="text-gray-400 text-sm mb-4">No jobs for this filter</p>
          <Link
            href="/jobs/new"
            className="inline-block bg-volturaGold text-volturaBlue font-bold text-sm px-6 py-2 rounded-full"
          >
            + New Job
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(job => (
            <TodayJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}
