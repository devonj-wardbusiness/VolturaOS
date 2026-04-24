'use client'

import { useState, useTransition, useEffect } from 'react'
import { clockIn, clockOut, getTimeEntries, addMaterial, getMaterials, deleteMaterial } from '@/lib/actions/jobs'
import type { JobMaterial } from '@/lib/actions/jobs'
import type { JobTimeEntry } from '@/types'

function formatDuration(inAt: string, outAt: string | null): string {
  const ms = (outAt ? new Date(outAt) : new Date()).getTime() - new Date(inAt).getTime()
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function totalHours(entries: JobTimeEntry[]): string {
  const ms = entries
    .filter((e) => e.clocked_out_at)
    .reduce((sum, e) => sum + (new Date(e.clocked_out_at!).getTime() - new Date(e.clocked_in_at).getTime()), 0)
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function JobCosting({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'time' | 'materials'>('time')

  // Time tracking state
  const [entries, setEntries] = useState<JobTimeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [activeEntry, setActiveEntry] = useState<JobTimeEntry | null>(null)
  const [elapsed, setElapsed] = useState('')
  const [isPending, startTransition] = useTransition()

  // Materials state
  const [materials, setMaterials] = useState<JobMaterial[]>([])
  const [matDesc, setMatDesc] = useState('')
  const [matCost, setMatCost] = useState('')
  const [matPending, startMatTransition] = useTransition()

  // Live clock ticker for active entry
  useEffect(() => {
    if (!activeEntry) return
    const tick = () => setElapsed(formatDuration(activeEntry.clocked_in_at, null))
    tick()
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [activeEntry])

  async function load() {
    setLoading(true)
    try {
      const [timeData, matData] = await Promise.all([
        getTimeEntries(jobId),
        getMaterials(jobId),
      ])
      setEntries(timeData)
      setActiveEntry(timeData.find((e) => !e.clocked_out_at) ?? null)
      setMaterials(matData)
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    setOpen(true)
    load()
  }

  function handleClockIn() {
    startTransition(async () => {
      const id = await clockIn(jobId)
      const newEntry: JobTimeEntry = {
        id,
        job_id: jobId,
        clocked_in_at: new Date().toISOString(),
        clocked_out_at: null,
        notes: null,
        created_at: new Date().toISOString(),
      }
      setEntries((prev) => [newEntry, ...prev])
      setActiveEntry(newEntry)
    })
  }

  function handleClockOut() {
    if (!activeEntry) return
    startTransition(async () => {
      await clockOut(activeEntry.id)
      await load()
    })
  }

  function handleAddMaterial() {
    const cost = parseFloat(matCost)
    if (!matDesc.trim() || isNaN(cost) || cost <= 0) return
    startMatTransition(async () => {
      const mat = await addMaterial(jobId, matDesc.trim(), cost)
      setMaterials((prev) => [...prev, mat])
      setMatDesc('')
      setMatCost('')
    })
  }

  function handleDeleteMaterial(id: string) {
    startMatTransition(async () => {
      await deleteMaterial(id)
      setMaterials((prev) => prev.filter((m) => m.id !== id))
    })
  }

  const totalStr = entries.filter((e) => e.clocked_out_at).length > 0
    ? totalHours(entries)
    : null

  const totalMaterialCost = materials.reduce((sum, m) => sum + m.cost, 0)

  return (
    <>
      <button
        onClick={handleOpen}
        className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
          activeEntry
            ? 'bg-green-900/20 border-green-500/30 text-green-400'
            : 'bg-volturaNavy/40 border-volturaNavy text-gray-500'
        }`}
      >
        <span>{activeEntry ? '⏱️' : '🕐'}</span>
        <span className="flex-1 text-left">
          {activeEntry ? `Clocked In — ${elapsed}` : 'Labor & Materials'}
        </span>
        {totalStr && <span className="text-xs opacity-70">Time: {totalStr}</span>}
        {totalMaterialCost > 0 && <span className="text-xs opacity-70 ml-1">Mat: ${totalMaterialCost.toLocaleString()}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center">
          <div className="bg-volturaNavy w-full max-w-lg rounded-t-2xl overflow-hidden max-h-[80dvh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <h2 className="text-white font-bold text-base">Labor & Materials</h2>
              <button onClick={() => setOpen(false)} className="text-gray-500 text-xl">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 shrink-0">
              {(['time', 'materials'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                    tab === t ? 'text-volturaGold border-b-2 border-volturaGold' : 'text-gray-500'
                  }`}
                >
                  {t === 'time' ? `⏱ Time${totalStr ? ` (${totalStr})` : ''}` : `🧰 Materials${totalMaterialCost > 0 ? ` ($${totalMaterialCost.toLocaleString()})` : ''}`}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

              {/* TIME TAB */}
              {tab === 'time' && (
                <>
                  {activeEntry ? (
                    <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-4 text-center space-y-2">
                      <p className="text-green-400 text-xs uppercase tracking-wider">Currently Clocked In</p>
                      <p className="text-green-400 font-bold text-4xl font-mono">{elapsed}</p>
                      <button
                        onClick={handleClockOut}
                        disabled={isPending}
                        className="w-full bg-red-500/20 border border-red-500/40 text-red-400 font-bold py-3 rounded-xl text-sm"
                      >
                        {isPending ? 'Saving…' : 'Clock Out'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleClockIn}
                      disabled={isPending}
                      className="w-full bg-green-600 text-white font-bold py-4 rounded-xl text-base"
                    >
                      {isPending ? 'Starting…' : '▶ Clock In'}
                    </button>
                  )}

                  {loading && <p className="text-gray-500 text-sm text-center py-4">Loading…</p>}
                  {!loading && entries.filter((e) => e.clocked_out_at).length > 0 && (
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Log</p>
                      <div className="space-y-2">
                        {entries.filter((e) => e.clocked_out_at).map((e) => (
                          <div key={e.id} className="bg-volturaBlue/30 rounded-xl px-4 py-3 flex items-center justify-between">
                            <div>
                              <p className="text-white text-sm font-semibold">{formatDuration(e.clocked_in_at, e.clocked_out_at)}</p>
                              <p className="text-gray-500 text-xs">
                                {new Date(e.clocked_in_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                {' → '}
                                {new Date(e.clocked_out_at!).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </p>
                            </div>
                            <p className="text-gray-600 text-xs">
                              {new Date(e.clocked_in_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* MATERIALS TAB */}
              {tab === 'materials' && (
                <>
                  {/* Add material form */}
                  <div className="bg-volturaBlue/30 rounded-xl p-3 space-y-2">
                    <input
                      type="text"
                      value={matDesc}
                      onChange={e => setMatDesc(e.target.value)}
                      placeholder="Description (e.g. 20A breaker)"
                      className="w-full bg-volturaNavy text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-volturaGold/50"
                    />
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={matCost}
                          onChange={e => setMatCost(e.target.value)}
                          placeholder="Cost"
                          className="w-full bg-volturaNavy text-white rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-volturaGold/50"
                        />
                      </div>
                      <button
                        onClick={handleAddMaterial}
                        disabled={matPending || !matDesc.trim() || !matCost}
                        className="bg-volturaGold text-volturaBlue font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {loading && <p className="text-gray-500 text-sm text-center py-4">Loading…</p>}

                  {materials.length === 0 && !loading && (
                    <p className="text-gray-600 text-sm text-center py-4">No materials logged yet</p>
                  )}

                  {materials.length > 0 && (
                    <>
                      <div className="space-y-2">
                        {materials.map((m) => (
                          <div key={m.id} className="bg-volturaBlue/30 rounded-xl px-4 py-3 flex items-center justify-between">
                            <div className="flex-1 min-w-0 mr-3">
                              <p className="text-white text-sm truncate">{m.description}</p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-volturaGold font-semibold text-sm">${m.cost.toLocaleString()}</span>
                              <button
                                onClick={() => handleDeleteMaterial(m.id)}
                                disabled={matPending}
                                className="text-red-400/60 hover:text-red-400 text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center border-t border-white/10 pt-3">
                        <span className="text-gray-400 text-sm font-semibold">Total Materials</span>
                        <span className="text-volturaGold font-bold text-lg">${totalMaterialCost.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
