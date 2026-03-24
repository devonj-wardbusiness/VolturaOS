'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import type { Job, JobStatus } from '@/types'
import { JobCard } from './JobCard'
import { EmptyState } from '@/components/ui/EmptyState'

const FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Leads', value: 'Lead' },
  { label: 'Scheduled', value: 'Scheduled' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Completed', value: 'Completed' },
]

interface JobBoardProps {
  jobs: (Job & { customer: { name: string } })[]
}

export function JobBoard({ jobs }: JobBoardProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeFilter = searchParams.get('status') || ''

  const filtered = activeFilter
    ? jobs.filter((j) => j.status === activeFilter)
    : jobs

  function setFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('status', value)
    } else {
      params.delete('status')
    }
    router.push(`/jobs?${params.toString()}`)
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto mb-4 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === f.value
                ? 'bg-volturaGold text-volturaBlue'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {f.label}
            {f.value && (
              <span className="ml-1 opacity-60">
                {jobs.filter((j) => j.status === f.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Job list */}
      {filtered.length === 0 ? (
        <EmptyState
          message={activeFilter ? `No ${activeFilter.toLowerCase()} jobs` : 'No jobs yet'}
          ctaLabel="+ New Job"
          ctaHref="/jobs/new"
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}
