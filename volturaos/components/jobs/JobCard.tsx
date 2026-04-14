'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Job, JobStatus } from '@/types'
import { StatusPill } from '@/components/ui/StatusPill'
import { Calendar } from 'lucide-react'
import { STATUS_ACCENT } from '@/lib/constants/jobStatus'
import { useLongPress } from '@/hooks/useLongPress'
import { useActionSheet } from '@/components/ui/ActionSheetProvider'
import { deleteJob, updateJobStatus, sendCrewSMS } from '@/lib/actions/jobs'

interface JobCardProps {
  job: Job & { customer: { name: string }; invoiceTotal?: number | null }
}

// 'Lead' omitted — it's the initial creation status, not a field transition.
// 'Paid' omitted — it's set via invoice payment recording, not manual status change.
const JOB_STATUSES: JobStatus[] = ['Scheduled', 'In Progress', 'Completed', 'Invoiced', 'Cancelled']

export function JobCard({ job }: JobCardProps) {
  const router = useRouter()
  const { openSheet } = useActionSheet()

  const dateStr = job.scheduled_date
    ? new Date(job.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null
  const timeStr = job.scheduled_time ? job.scheduled_time.slice(0, 5) : null
  const accent = STATUS_ACCENT[job.status] ?? '#4b5563'
  const label = `${job.customer.name} — ${job.job_type}`

  function showSheet() {
    openSheet(label, [
      {
        icon: '✏️',
        label: 'Edit',
        onClick: () => router.push(`/jobs/${job.id}`),
      },
      {
        icon: '🔄',
        label: 'Change Status',
        onClick: () => {
          openSheet('Change Status', JOB_STATUSES.map((s) => ({
            icon: s === job.status ? '✅' : '○',
            label: s,
            onClick: async () => {
              await updateJobStatus(job.id, s)
              router.refresh()
            },
          })))
        },
      },
      {
        icon: '📱',
        label: 'Send Crew SMS',
        onClick: async () => {
          const crewPhone = typeof window !== 'undefined' ? localStorage.getItem('crewPhone') : null
          if (!crewPhone) {
            router.push(`/jobs/${job.id}`)
            return
          }
          await sendCrewSMS(job.id, crewPhone)
        },
      },
      {
        icon: '🗑️',
        label: 'Delete',
        onClick: async () => {
          await deleteJob(job.id)
          router.refresh()
        },
        destructive: true,
      },
    ])
  }

  const bind = useLongPress(showSheet)

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="relative flex items-stretch bg-volturaNavy/50 border border-white/5 rounded-2xl overflow-hidden active:scale-[0.98] transition-transform duration-100"
      {...bind}
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
