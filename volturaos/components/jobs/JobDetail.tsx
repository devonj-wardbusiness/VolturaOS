'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Job, JobChecklist, JobStatus, ChangeOrder, Estimate, EstimateStatus } from '@/types'
import { updateJobStatus, updateJob } from '@/lib/actions/jobs'
import { StatusStepper } from './StatusStepper'
import { JobChecklist as JobChecklistUI } from './JobChecklist'
import { StatusPill } from '@/components/ui/StatusPill'
import { JobPhotos } from './JobPhotos'
import { NeighborhoodBlitz } from './NeighborhoodBlitz'
import { VoiceNotes } from './VoiceNotes'
import { ViolationReport } from './ViolationReport'
import { PermitTracker } from './PermitTracker'
import { JobCosting } from './JobCosting'
import { HealthScore } from './HealthScore'
import { MaintenancePlan } from './MaintenancePlan'
import { SendToCrewButton } from './SendToCrewButton'
import { GPSClockIn } from './GPSClockIn'
import type { JobPhotoRecord } from '@/lib/actions/job-photos'

type CustomerEstimate = Pick<Estimate, 'id' | 'name' | 'total' | 'status'>

interface JobDetailProps {
  job: Job & { customer: { id: string; name: string; phone: string | null; address: string | null; zip: string | null } }
  checklist: JobChecklist
  photos: JobPhotoRecord[]
  signedEstimateId: string | null
  changeOrders: ChangeOrder[]
  customerEstimates: CustomerEstimate[]
}

const NEXT_STATUS: Partial<Record<JobStatus, { label: string; next: JobStatus }>> = {
  'Lead': { label: 'Schedule Job', next: 'Scheduled' },
  'Scheduled': { label: 'Start Job', next: 'In Progress' },
  'In Progress': { label: 'Complete Job', next: 'Completed' },
}

const STATUS_COLORS: Record<EstimateStatus, string> = {
  Draft:    'bg-gray-700/60 text-gray-400',
  Sent:     'bg-blue-900/40 text-blue-400',
  Viewed:   'bg-yellow-900/30 text-yellow-400',
  Approved: 'bg-green-900/40 text-green-400',
  Declined: 'bg-red-900/30 text-red-400',
}

export function JobDetail({ job, checklist, photos, signedEstimateId, changeOrders, customerEstimates }: JobDetailProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState(job.notes || '')
  const [editingNotes, setEditingNotes] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(false)
  const [scheduledDate, setScheduledDate] = useState(job.scheduled_date || '')
  const [scheduledTime, setScheduledTime] = useState(job.scheduled_time || '')

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

  function handleSaveSchedule() {
    startTransition(async () => {
      await updateJob(job.id, {
        scheduledDate: scheduledDate || null,
        scheduledTime: scheduledTime || null,
      })
      setEditingSchedule(false)
      router.refresh()
    })
  }

  return (
    <div className="px-4 pb-8 space-y-4">
      {/* Customer info */}
      <div className="bg-volturaNavy/50 rounded-xl p-4">
        <p className="text-white font-bold text-lg">{job.customer.name}</p>
        {job.customer.address && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(job.customer.address ?? '')
              if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40)
            }}
            className="text-gray-400 text-sm mt-1 text-left flex items-center gap-1.5 group w-full"
            title="Tap to copy address"
          >
            <span>📍</span>
            <span className="group-active:text-volturaGold transition-colors">{job.customer.address}</span>
            <span className="text-gray-600 text-xs ml-1 group-active:text-volturaGold">copy</span>
          </button>
        )}
        {job.customer.phone && (
          <a
            href={`tel:${job.customer.phone}`}
            className="mt-3 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
          >
            <span>📞</span> Call {job.customer.name.split(' ')[0]}
          </a>
        )}
      </div>

      {/* Job info */}
      <div className="bg-volturaNavy/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-semibold">{job.job_type}</p>
          <StatusPill status={job.status} />
        </div>

        {editingSchedule ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="bg-volturaBlue text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-volturaGold/50"
              />
              <input
                type="time"
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
                className="bg-volturaBlue text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-volturaGold/50"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveSchedule} disabled={isPending} className="text-volturaGold text-xs font-semibold">
                {isPending ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditingSchedule(false)} className="text-gray-500 text-xs">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              {scheduledDate
                ? `📅 ${new Date(scheduledDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}${scheduledTime ? ` at ${scheduledTime.slice(0, 5)}` : ''}`
                : '📅 No date set'}
            </p>
            <button onClick={() => setEditingSchedule(true)} className="text-volturaGold text-xs">
              {scheduledDate ? 'Edit' : 'Set Date'}
            </button>
          </div>
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

        {(job.status === 'In Progress' || job.status === 'Completed') && (
          <ViolationReport
            customerName={job.customer.name}
            address={job.customer.address}
            jobType={job.job_type}
          />
        )}

        {job.status === 'Completed' && (
          <>
            <button
              onClick={() => router.push(`/invoices/new?jobId=${job.id}&customerId=${job.customer.id}`)}
              className="w-full bg-green-600 text-white font-bold py-3 rounded-xl text-base"
            >
              💰 Create Invoice
            </button>
            <NeighborhoodBlitz jobId={job.id} jobType={job.job_type} zip={job.customer.zip} />
          </>
        )}

        {signedEstimateId && (job.status === 'Scheduled' || job.status === 'In Progress' || job.status === 'Completed') && (
          <button
            onClick={() => router.push(`/jobs/${job.id}/change-order/new`)}
            className="w-full bg-volturaGold/10 border border-volturaGold/30 text-volturaGold font-semibold py-3 rounded-xl text-sm"
          >
            📋 Add Change Order
          </button>
        )}

        <SendToCrewButton jobId={job.id} />

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

      {/* Permit Tracker */}
      <PermitTracker
        jobId={job.id}
        initialPermitNumber={job.permit_number ?? null}
        initialPermitStatus={job.permit_status ?? null}
      />

      {/* Change Orders */}
      {changeOrders.length > 0 && (
        <div className="bg-volturaNavy/50 rounded-xl p-4 mt-4">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Change Orders</p>
          <div className="space-y-2">
            {changeOrders.map((co) => (
              <div
                key={co.id}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    co.status === 'Signed'
                      ? 'bg-green-900/40 text-green-400'
                      : co.status === 'Pending'
                      ? 'bg-yellow-900/40 text-yellow-400'
                      : 'bg-white/10 text-gray-400'
                  }`}>
                    {co.status}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {new Date(co.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-volturaGold font-semibold text-sm">
                    +${co.total.toLocaleString()}
                  </span>
                  {co.status !== 'Signed' && (
                    <button
                      onClick={() => router.push(`/jobs/${job.id}/change-order/${co.id}`)}
                      className="text-volturaGold text-xs underline"
                    >
                      Edit
                    </button>
                  )}
                  {co.status === 'Pending' && (
                    <button
                      onClick={() => router.push(`/change-orders/${co.id}/view`)}
                      className="text-green-400 text-xs underline"
                    >
                      Sign
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer Estimates */}
      <div className="bg-volturaNavy/50 rounded-xl p-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Estimates</p>
          <button
            onClick={() => router.push(`/estimates/new?customerId=${job.customer.id}&customerName=${encodeURIComponent(job.customer.name)}`)}
            className="text-volturaGold text-xs font-semibold border border-volturaGold/30 px-2.5 py-1 rounded-lg"
          >
            + New
          </button>
        </div>
        {customerEstimates.length === 0 ? (
          <p className="text-gray-600 text-sm">No estimates yet for this customer.</p>
        ) : (
          <div className="space-y-2">
            {customerEstimates.map((est) => (
              <button
                key={est.id}
                onClick={() => router.push(`/estimates/${est.id}`)}
                className="w-full flex items-center justify-between py-2.5 border-b border-white/5 last:border-0 text-left active:opacity-70"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[est.status as EstimateStatus] ?? 'bg-gray-700/60 text-gray-400'}`}>
                    {est.status}
                  </span>
                  <span className="text-white text-sm truncate">{est.name || 'Estimate'}</span>
                </div>
                <span className="text-volturaGold font-semibold text-sm shrink-0 ml-2">
                  ${(est.total ?? 0).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* GPS auto clock-in prompt */}
      {(job.status === 'Scheduled' || job.status === 'In Progress') && (
        <GPSClockIn
          jobId={job.id}
          address={job.customer.address}
          isAlreadyClockedIn={job.status === 'In Progress'}
        />
      )}

      {/* Job Costing */}
      <JobCosting jobId={job.id} />

      {/* Electrical Health Score */}
      {(job.status === 'In Progress' || job.status === 'Completed') && (
        <HealthScore
          customerId={job.customer.id}
          jobId={job.id}
          customerName={job.customer.name}
        />
      )}

      {/* Maintenance Plans */}
      {(job.status === 'Completed' || job.status === 'Paid') && (
        <MaintenancePlan
          customerId={job.customer.id}
          customerName={job.customer.name}
        />
      )}

      {/* Checklist */}
      <JobChecklistUI checklist={checklist} />

      {/* Notes */}
      <div className="bg-volturaNavy/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Notes</p>
          <div className="flex items-center gap-2">
            <VoiceNotes
              jobType={job.job_type}
              onTranscript={(text) => {
                setNotes((prev) => prev ? `${prev}\n${text}` : text)
                setEditingNotes(true)
              }}
            />
            {!editingNotes ? (
              <button onClick={() => setEditingNotes(true)} className="text-volturaGold text-xs">Edit</button>
            ) : (
              <button onClick={handleSaveNotes} disabled={isPending} className="text-volturaGold text-xs font-semibold">
                {isPending ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
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
