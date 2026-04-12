'use client'

import { useState, useTransition } from 'react'
import { updateJob } from '@/lib/actions/jobs'
import type { PermitStatus } from '@/types'

const PERMIT_STATUSES: PermitStatus[] = ['Not Applied', 'Applied', 'Approved', 'Inspected', 'Final']

const STATUS_STYLE: Record<PermitStatus, string> = {
  'Not Applied': 'text-gray-500 bg-gray-800/40 border-gray-700',
  'Applied':     'text-blue-400 bg-blue-900/20 border-blue-500/30',
  'Approved':    'text-yellow-400 bg-yellow-900/20 border-yellow-500/30',
  'Inspected':   'text-orange-400 bg-orange-900/20 border-orange-500/30',
  'Final':       'text-green-400 bg-green-900/20 border-green-500/30',
}

interface PermitTrackerProps {
  jobId: string
  initialPermitNumber: string | null
  initialPermitStatus: string | null
}

export function PermitTracker({ jobId, initialPermitNumber, initialPermitStatus }: PermitTrackerProps) {
  const [open, setOpen] = useState(false)
  const [permitNumber, setPermitNumber] = useState(initialPermitNumber ?? '')
  const [permitStatus, setPermitStatus] = useState<PermitStatus>(
    (initialPermitStatus as PermitStatus) ?? 'Not Applied'
  )
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const hasPermit = permitStatus !== 'Not Applied' || permitNumber

  function handleSave() {
    startTransition(async () => {
      await updateJob(jobId, {
        permitNumber: permitNumber || null,
        permitStatus,
      })
      setSaved(true)
      setTimeout(() => { setSaved(false); setOpen(false) }, 1200)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
          hasPermit
            ? STATUS_STYLE[permitStatus as PermitStatus] ?? STATUS_STYLE['Not Applied']
            : 'bg-volturaNavy/40 border-volturaNavy text-gray-500'
        }`}
      >
        <span>📄</span>
        <span className="flex-1 text-left">
          {permitNumber ? `Permit #${permitNumber}` : 'Track Permit'}
        </span>
        <span className="text-xs opacity-70">{permitStatus}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center">
          <div className="bg-volturaNavy w-full max-w-lg rounded-t-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <h2 className="text-white font-bold text-base">📄 Permit Tracker</h2>
                <p className="text-gray-500 text-xs">PPRBD — Pikes Peak Regional Building Dept.</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 text-xl">✕</button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1.5">Permit Number</label>
                <input
                  value={permitNumber}
                  onChange={(e) => setPermitNumber(e.target.value)}
                  placeholder="e.g. B2024-001234"
                  className="w-full bg-volturaBlue text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold/50"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs uppercase tracking-wider block mb-2">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {PERMIT_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setPermitStatus(s)}
                      className={`py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                        permitStatus === s
                          ? STATUS_STYLE[s]
                          : 'bg-white/5 text-gray-500 border-white/10'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-volturaBlue/30 rounded-xl px-4 py-3 text-xs text-gray-500 space-y-1">
                <p>🔗 PPRBD Online: <a href="https://permits.pprbd.org" target="_blank" rel="noreferrer" className="text-volturaGold underline">permits.pprbd.org</a></p>
                <p>📞 PPRBD: (719) 327-2880</p>
              </div>
            </div>

            <div className="px-5 pb-8 pt-2">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="w-full bg-volturaGold text-volturaBlue font-bold py-3.5 rounded-xl text-sm disabled:opacity-60"
              >
                {saved ? '✓ Saved' : isPending ? 'Saving…' : 'Save Permit Info'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
