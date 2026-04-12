'use client'

import { useState, useTransition, useEffect } from 'react'
import { clockIn, clockOut, getTimeEntries } from '@/lib/actions/jobs'
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
  const [entries, setEntries] = useState<JobTimeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [activeEntry, setActiveEntry] = useState<JobTimeEntry | null>(null)
  const [elapsed, setElapsed] = useState('')
  const [isPending, startTransition] = useTransition()

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
      const data = await getTimeEntries(jobId)
      setEntries(data)
      setActiveEntry(data.find((e) => !e.clocked_out_at) ?? null)
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

  const totalStr = entries.filter((e) => e.clocked_out_at).length > 0
    ? totalHours(entries)
    : null

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
          {activeEntry ? `Clocked In — ${elapsed}` : 'Labor Timer'}
        </span>
        {totalStr && <span className="text-xs opacity-70">Total: {totalStr}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center">
          <div className="bg-volturaNavy w-full max-w-lg rounded-t-2xl overflow-hidden max-h-[75vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div>
                <h2 className="text-white font-bold text-base">🕐 Labor Tracker</h2>
                {totalStr && <p className="text-volturaGold text-xs font-semibold">Total logged: {totalStr}</p>}
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 text-xl">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {/* Active clock */}
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

              {/* Entry history */}
              {loading && <p className="text-gray-500 text-sm text-center py-4">Loading entries…</p>}
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
            </div>
          </div>
        </div>
      )}
    </>
  )
}
