'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Job, JobChecklist, JobStatus } from '@/types'
import { updateJobStatus, updateJob } from '@/lib/actions/jobs'
import { StatusStepper } from './StatusStepper'
import { JobChecklist as JobChecklistUI } from './JobChecklist'
import { StatusPill } from '@/components/ui/StatusPill'
import { JobPhotos } from './JobPhotos'
import type { JobPhotoRecord } from '@/lib/actions/job-photos'

interface JobDetailProps {
  job: Job & { customer: { id: string; name: string; phone: string | null; address: string | null } }
  checklist: JobChecklist
  photos: JobPhotoRecord[]
}

const NEXT_STATUS: Partial<Record<JobStatus, { label: string; next: JobStatus }>> = {
  'Lead': { label: 'Schedule Job', next: 'Scheduled' },
  'Scheduled': { label: 'Start Job', next: 'In Progress' },
  'In Progress': { label: 'Complete Job', next: 'Completed' },
}

export function JobDetail({ job, checklist, photos }: JobDetailProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState(job.notes || '')
  const [editingNotes, setEditingNotes] = useState(false)

  const nextAction = NEXT_STATUS[job.status]

  function handleStatusChange(status: JobStatus) {
    startTransition(async () => {
      await updateJobStatus(job.id, status)
      router.refresh()
    })
  }

  function handleSaveNotes() {
    startTransition(async () => {
      await updateJob(job.id, { notes })
      setEditingNotes(false)
    })
  }

  return (
    <div className="px-4 pb-8 space-y-4">
      {/* Customer info */}
      <div className="bg-volturaNavy/50 rounded-xl p-4">
        <p className="text-white font-bold text-lg">{job.customer.name}</p>
        {job.customer.phone && (
          <a href={`tel:${job.customer.phone}`} className="text-volturaGold text-sm block mt-1">
            📞 {job.customer.phone}
          </a>
        )}
        {job.customer.address && (
          <p className="text-gray-400 text-sm mt-1">📍 {job.customer.address}</p>
        )}
      </div>

      {/* Job info */}
      <div className="bg-volturaNavy/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-semibold">{job.job_type}</p>
          <StatusPill status={job.status} />
        </div>
        {job.scheduled_date && (
          <p className="text-gray-400 text-sm">
            📅 {new Date(job.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {job.scheduled_time ? ` at ${job.scheduled_time.slice(0, 5)}` : ''}
          </p>
        )}
      </div>

      {/* Status stepper */}
      <div className="bg-volturaNavy/50 rounded-xl p-4">
        <p className="text-gray-400 text-xs mb-3 font-semibold uppercase tracking-wider">Progress</p>
        <StatusStepper status={job.status} />
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
        {nextAction && (
          <button
            onClick={() => handleStatusChange(nextAction.next)}
            disabled={isPending}
            className="w-full bg-volturaGold text-volturaBlue font-bold py-3 rounded-xl text-base disabled:opacity-50"
          >
            {isPending ? 'Updating...' : nextAction.label}
          </button>
        )}

        {job.status === 'Completed' && (
          <button
            onClick={() => router.push(`/invoices/new?jobId=${job.id}&customerId=${job.customer.id}`)}
            className="w-full bg-green-600 text-white font-bold py-3 rounded-xl text-base"
          >
            💰 Create Invoice
          </button>
        )}

        {job.status !== 'Cancelled' && job.status !== 'Paid' && (
          <button
            onClick={() => handleStatusChange('Cancelled')}
            disabled={isPending}
            className="w-full bg-white/5 text-red-400 py-3 rounded-xl text-sm"
          >
            Cancel Job
          </button>
        )}
      </div>

      {/* Checklist */}
      <JobChecklistUI checklist={checklist} />

      {/* Notes */}
      <div className="bg-volturaNavy/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Notes</p>
          {!editingNotes ? (
            <button onClick={() => setEditingNotes(true)} className="text-volturaGold text-xs">Edit</button>
          ) : (
            <button onClick={handleSaveNotes} disabled={isPending} className="text-volturaGold text-xs font-semibold">
              {isPending ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
        {editingNotes ? (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full bg-volturaBlue text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-volturaGold/50 resize-none"
          />
        ) : (
          <p className="text-white/80 text-sm whitespace-pre-wrap">{notes || 'No notes'}</p>
        )}
      </div>

      {/* Site Photos */}
      <JobPhotos jobId={job.id} initialPhotos={photos} />
    </div>
  )
}
