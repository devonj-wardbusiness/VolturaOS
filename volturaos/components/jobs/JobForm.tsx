'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createJob } from '@/lib/actions/jobs'
import { CustomerSelector } from '@/components/estimate-builder/CustomerSelector'
import { getEstimatesByCustomer } from '@/lib/actions/estimates'
import type { LineItem, Addon } from '@/types'

type CustomerEstimate = Awaited<ReturnType<typeof getEstimatesByCustomer>>[number]

interface JobFormProps {
  initialCustomerId?: string
  initialCustomerName?: string
  customerEstimates?: CustomerEstimate[]
}

function formatEstimateNotes(est: CustomerEstimate): string {
  const lines: string[] = []

  if (est.line_items && est.line_items.length > 0) {
    lines.push('--- Estimate: ' + est.name + ' ---')
    for (const item of est.line_items as LineItem[]) {
      lines.push(`• ${item.description}${item.price ? ` — $${item.price.toLocaleString()}` : ''}`)
    }
  }

  const selectedAddons = ((est.addons ?? []) as Addon[]).filter(a => a.selected)
  if (selectedAddons.length > 0) {
    lines.push('Add-ons:')
    for (const a of selectedAddons) {
      lines.push(`• ${a.name} — $${a.price.toLocaleString()}`)
    }
  }

  const badges: string[] = []
  if (est.includes_permit) badges.push('Permit')
  if (est.includes_cleanup) badges.push('Cleanup')
  if (est.includes_warranty) badges.push('Warranty')
  if (badges.length > 0) lines.push('Includes: ' + badges.join(', '))

  if (est.total) lines.push(`Total: $${est.total.toLocaleString()}`)
  if (est.notes) lines.push('\nNotes: ' + est.notes)

  return lines.join('\n')
}

export function JobForm({ initialCustomerId, initialCustomerName, customerEstimates = [] }: JobFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [customerId, setCustomerId] = useState<string | null>(initialCustomerId ?? null)
  const [customerName, setCustomerName] = useState(initialCustomerName ?? '')
  const [estimates, setEstimates] = useState<CustomerEstimate[]>(customerEstimates)
  const [loadingEstimates, setLoadingEstimates] = useState(false)

  // Job type: either picked from estimate name or typed custom
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | 'custom' | null>(null)
  const [customJobType, setCustomJobType] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  async function handleCustomerSelect(id: string, name: string) {
    setCustomerId(id)
    setCustomerName(name)
    setSelectedEstimateId(null)
    setNotes('')
    setLoadingEstimates(true)
    try {
      const data = await getEstimatesByCustomer(id)
      setEstimates(data)
    } finally {
      setLoadingEstimates(false)
    }
  }

  function handleEstimateSelect(estId: string) {
    setSelectedEstimateId(estId)
    const est = estimates.find(e => e.id === estId)
    if (est) setNotes(formatEstimateNotes(est))
  }

  function handleCustomSelect() {
    setSelectedEstimateId('custom')
    setNotes('')
  }

  const jobType = selectedEstimateId === 'custom'
    ? customJobType
    : estimates.find(e => e.id === selectedEstimateId)?.name ?? ''

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId) { setError('Select a customer'); return }
    if (!jobType.trim()) { setError('Select an estimate or enter a job type'); return }
    setError('')

    startTransition(async () => {
      await createJob({
        customerId,
        jobType: jobType.trim(),
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
            <button
              type="button"
              onClick={() => { setCustomerId(null); setCustomerName(''); setEstimates([]); setSelectedEstimateId(null); setNotes('') }}
              className="text-gray-500 text-sm"
            >
              Change
            </button>
          </div>
        ) : (
          <CustomerSelector
            selectedId={customerId}
            selectedName={customerName}
            onSelect={handleCustomerSelect}
          />
        )}
      </div>

      {/* Estimate / Job Type Picker */}
      {customerId && (
        <div>
          <label className="block text-gray-400 text-sm mb-2">Job Type</label>
          {loadingEstimates ? (
            <p className="text-gray-500 text-sm">Loading estimates...</p>
          ) : (
            <div className="space-y-2">
              {estimates.map(est => (
                <button
                  key={est.id}
                  type="button"
                  onClick={() => handleEstimateSelect(est.id)}
                  className={`w-full text-left rounded-xl px-4 py-3 border transition-colors ${
                    selectedEstimateId === est.id
                      ? 'bg-volturaGold/10 border-volturaGold text-white'
                      : 'bg-volturaNavy border-white/5 text-white/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{est.name}</span>
                    {est.total ? (
                      <span className="text-volturaGold text-xs">${est.total.toLocaleString()}</span>
                    ) : null}
                  </div>
                  <span className="text-gray-500 text-xs capitalize">{est.status}</span>
                </button>
              ))}

              {/* Custom option */}
              <button
                type="button"
                onClick={handleCustomSelect}
                className={`w-full text-left rounded-xl px-4 py-3 border transition-colors ${
                  selectedEstimateId === 'custom'
                    ? 'bg-volturaGold/10 border-volturaGold text-white'
                    : 'bg-volturaNavy border-white/5 text-gray-400'
                }`}
              >
                <span className="text-sm font-semibold">Custom / Other</span>
              </button>

              {selectedEstimateId === 'custom' && (
                <input
                  type="text"
                  value={customJobType}
                  onChange={e => setCustomJobType(e.target.value)}
                  placeholder="Describe the job..."
                  autoFocus
                  className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold/50"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Schedule */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-gray-400 text-sm mb-1">Date</label>
          <input
            type="date"
            value={scheduledDate}
            onChange={e => setScheduledDate(e.target.value)}
            className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold/50"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-sm mb-1">Time</label>
          <input
            type="time"
            value={scheduledTime}
            onChange={e => setScheduledTime(e.target.value)}
            className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold/50"
          />
        </div>
      </div>

      {/* Notes — auto-filled from estimate, editable */}
      <div>
        <label className="block text-gray-400 text-sm mb-1">Job Details / Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={6}
          placeholder="Select an estimate above to auto-fill, or type details here..."
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
