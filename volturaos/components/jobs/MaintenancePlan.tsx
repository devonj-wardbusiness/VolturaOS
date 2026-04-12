'use client'

import { useState, useTransition } from 'react'
import { createMaintenancePlan, getMaintenancePlansByCustomer, cancelMaintenancePlan } from '@/lib/actions/maintenance'
import type { MaintenancePlan as MaintenancePlanType } from '@/types'

const PLAN_TYPES = [
  { label: 'Annual Safety Inspection', desc: 'Panel, GFCI, AFCI, grounding check', price: 149 },
  { label: 'Bi-Annual Inspection', desc: 'Full inspection twice a year', price: 249 },
  { label: 'Priority Service Plan', desc: 'Annual inspection + priority scheduling', price: 299 },
  { label: 'Custom', desc: 'Set your own terms', price: 0 },
]

interface MaintenancePlanProps {
  customerId: string
  customerName: string
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.ceil(diff / 86400000)
}

export function MaintenancePlan({ customerId, customerName }: MaintenancePlanProps) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'list' | 'new'>('list')
  const [plans, setPlans] = useState<MaintenancePlanType[]>([])
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  // New plan form state
  const [selectedType, setSelectedType] = useState(PLAN_TYPES[0])
  const [customLabel, setCustomLabel] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [nextDate, setNextDate] = useState(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 1)
    return d.toISOString().slice(0, 10)
  })
  const [notes, setNotes] = useState('')

  async function load() {
    setLoading(true)
    try {
      const data = await getMaintenancePlansByCustomer(customerId)
      setPlans(data)
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    setOpen(true)
    setView('list')
    load()
  }

  function handleSave() {
    const planName = selectedType.label === 'Custom' ? customLabel || 'Custom Plan' : selectedType.label
    const price = selectedType.label === 'Custom' ? parseFloat(customPrice) || 0 : selectedType.price

    startTransition(async () => {
      const plan = await createMaintenancePlan({
        customerId,
        planName,
        startDate,
        nextDue: nextDate,
        price,
        notes: notes || null,
      })
      setPlans((prev) => [plan, ...prev])
      setView('list')
      setNotes('')
      setCustomLabel('')
      setCustomPrice('')
    })
  }

  function handleCancel(planId: string) {
    startTransition(async () => {
      await cancelMaintenancePlan(planId)
      setPlans((prev) => prev.map((p) => p.id === planId ? { ...p, status: 'Cancelled' } : p))
    })
  }

  const activePlans = plans.filter((p) => p.status === 'Active')

  return (
    <>
      <button
        onClick={handleOpen}
        className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
          activePlans.length > 0
            ? 'bg-blue-900/20 border-blue-500/30 text-blue-400'
            : 'bg-volturaNavy/40 border-volturaNavy text-gray-500'
        }`}
      >
        <span>🔧</span>
        <span className="flex-1 text-left">
          {activePlans.length > 0 ? `${activePlans.length} Active Plan${activePlans.length > 1 ? 's' : ''}` : 'Maintenance Plans'}
        </span>
        {activePlans.length > 0 && activePlans[0].next_due && (
          <span className="text-xs opacity-70">
            Next: {formatDate(activePlans[0].next_due)}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center">
          <div className="bg-volturaNavy w-full max-w-lg rounded-t-2xl overflow-hidden max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div>
                <h2 className="text-white font-bold text-base">🔧 Maintenance Plans</h2>
                <p className="text-gray-500 text-xs">{customerName}</p>
              </div>
              <button onClick={() => { setOpen(false); setView('list') }} className="text-gray-500 text-xl">✕</button>
            </div>

            {view === 'list' ? (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {loading && <p className="text-gray-500 text-sm text-center py-8">Loading…</p>}

                  {!loading && plans.length === 0 && (
                    <div className="text-center py-8 space-y-2">
                      <p className="text-4xl">🔧</p>
                      <p className="text-gray-400 text-sm">No maintenance plans yet</p>
                      <p className="text-gray-600 text-xs">Annual plans = recurring revenue</p>
                    </div>
                  )}

                  {!loading && plans.map((plan) => {
                    const days = plan.next_due ? daysUntil(plan.next_due) : null
                    const urgent = days !== null && days <= 30
                    return (
                      <div
                        key={plan.id}
                        className={`rounded-2xl p-4 border ${
                          plan.status === 'Cancelled'
                            ? 'bg-white/5 border-white/10 opacity-50'
                            : urgent
                            ? 'bg-orange-900/20 border-orange-500/30'
                            : 'bg-volturaBlue/20 border-white/10'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm truncate">{plan.plan_name}</p>
                            <p className="text-volturaGold text-xs font-bold mt-0.5">${plan.price}/yr</p>
                            {plan.next_due && (
                              <p className={`text-xs mt-1 ${urgent ? 'text-orange-400' : 'text-gray-500'}`}>
                                Next: {formatDate(plan.next_due)}
                                {days !== null && ` (${days > 0 ? `${days}d` : 'Today!'})`}
                              </p>
                            )}
                            {plan.notes && (
                              <p className="text-gray-600 text-xs mt-1 truncate">{plan.notes}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 ml-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              plan.status === 'Active' ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-500'
                            }`}>
                              {plan.status}
                            </span>
                            {plan.status === 'Active' && (
                              <button
                                onClick={() => handleCancel(plan.id)}
                                disabled={isPending}
                                className="text-red-500/60 text-xs hover:text-red-400 transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="px-5 pb-8 pt-3 border-t border-white/10 shrink-0">
                  <button
                    onClick={() => setView('new')}
                    className="w-full bg-volturaGold text-volturaBlue font-bold py-3.5 rounded-xl text-sm"
                  >
                    + Add Maintenance Plan
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {/* Plan type selector */}
                  <div>
                    <label className="text-gray-400 text-xs uppercase tracking-wider block mb-2">Plan Type</label>
                    <div className="space-y-2">
                      {PLAN_TYPES.map((pt) => (
                        <button
                          key={pt.label}
                          onClick={() => setSelectedType(pt)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${
                            selectedType.label === pt.label
                              ? 'bg-volturaGold/10 border-volturaGold text-white'
                              : 'bg-volturaBlue/20 border-white/10 text-gray-400'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-semibold">{pt.label}</p>
                            <p className="text-xs opacity-70">{pt.desc}</p>
                          </div>
                          {pt.price > 0 && (
                            <span className="text-volturaGold font-bold text-sm shrink-0 ml-2">${pt.price}/yr</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom fields */}
                  {selectedType.label === 'Custom' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1.5">Plan Name</label>
                        <input
                          value={customLabel}
                          onChange={(e) => setCustomLabel(e.target.value)}
                          placeholder="e.g. Quarterly Check-Up"
                          className="w-full bg-volturaBlue text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-volturaGold/50"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1.5">Annual Price ($)</label>
                        <input
                          type="number"
                          value={customPrice}
                          onChange={(e) => setCustomPrice(e.target.value)}
                          placeholder="199"
                          className="w-full bg-volturaBlue text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-volturaGold/50"
                        />
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1.5">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-volturaBlue text-white rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-volturaGold/50"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1.5">Next Service</label>
                      <input
                        type="date"
                        value={nextDate}
                        onChange={(e) => setNextDate(e.target.value)}
                        className="w-full bg-volturaBlue text-white rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-volturaGold/50"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1.5">Notes (optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Customer requested spring scheduling"
                      rows={2}
                      className="w-full bg-volturaBlue/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-volturaGold/50 resize-none"
                    />
                  </div>
                </div>

                <div className="px-5 pb-8 pt-3 border-t border-white/10 shrink-0 flex gap-3">
                  <button
                    onClick={() => setView('list')}
                    className="flex-1 bg-white/5 text-gray-400 font-semibold py-3.5 rounded-xl text-sm"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isPending || (selectedType.label === 'Custom' && !customLabel)}
                    className="flex-1 bg-volturaGold text-volturaBlue font-bold py-3.5 rounded-xl text-sm disabled:opacity-60"
                  >
                    {isPending ? 'Saving…' : 'Save Plan'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
