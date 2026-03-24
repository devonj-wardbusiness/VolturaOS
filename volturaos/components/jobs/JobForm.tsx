'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createJob } from '@/lib/actions/jobs'
import { CustomerSelector } from '@/components/estimate-builder/CustomerSelector'

interface JobFormProps {
  jobTypes: string[]
}

export function JobForm({ jobTypes }: JobFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [jobType, setJobType] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId) { setError('Select a customer'); return }
    if (!jobType) { setError('Select a job type'); return }
    setError('')

    startTransition(async () => {
      await createJob({
        customerId,
        jobType,
        scheduledDate: scheduledDate || undefined,
        scheduledTime: scheduledTime || undefined,
        notes: notes || undefined,
      })
      router.push('/jobs')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-4 pt-4 pb-8">
      {/* Customer */}
      <div>
        <label className="block text-gray-400 text-sm mb-1">Customer</label>
        {customerId ? (
          <div className="flex items-center justify-between bg-volturaNavy rounded-xl px-4 py-3">
            <span className="text-white font-semibold">{customerName}</span>
            <button type="button" onClick={() => { setCustomerId(null); setCustomerName('') }} className="text-gray-500 text-sm">Change</button>
          </div>
        ) : (
          <CustomerSelector
            selectedId={customerId}
            selectedName={customerName}
            onSelect={(id, name) => { setCustomerId(id); setCustomerName(name) }}
          />
        )}
      </div>

      {/* Job Type */}
      <div>
        <label className="block text-gray-400 text-sm mb-1">Job Type</label>
        <select
          value={jobType}
          onChange={(e) => setJobType(e.target.value)}
          className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold/50"
        >
          <option value="">Select job type...</option>
          {jobTypes.map((jt) => (
            <option key={jt} value={jt}>{jt}</option>
          ))}
        </select>
      </div>

      {/* Schedule */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-gray-400 text-sm mb-1">Date</label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold/50"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-sm mb-1">Time</label>
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold/50"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-gray-400 text-sm mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Job details, access codes, special instructions..."
          className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-volturaGold/50 resize-none"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-volturaGold text-volturaBlue font-bold py-3 rounded-xl text-base disabled:opacity-50"
      >
        {isPending ? 'Creating...' : 'Create Job'}
      </button>
    </form>
  )
}
