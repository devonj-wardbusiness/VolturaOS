'use client'

import { useState, useTransition } from 'react'
import { createInspection } from '@/lib/actions/inspections'
import type { InspectionInput } from '@/lib/actions/inspections'

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444'
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F'
  const r = 52
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#1e293b" strokeWidth="12" />
        <circle
          cx="64" cy="64" r={r} fill="none"
          stroke={color} strokeWidth="12"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 64 64)"
        />
        <text x="64" y="58" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold" fontFamily="sans-serif">{score}</text>
        <text x="64" y="78" textAnchor="middle" fill={color} fontSize="18" fontWeight="bold" fontFamily="sans-serif">{grade}</text>
      </svg>
      <p className="text-gray-400 text-xs">Electrical Health Score</p>
    </div>
  )
}

const PANEL_CONDITIONS = ['Good', 'Fair', 'Poor', 'Replace']
const WIRING_TYPES = ['Copper', 'Copper/Aluminum', 'Aluminum', 'Knob-and-Tube', 'Mixed']

interface HealthScoreProps {
  customerId: string
  jobId?: string
  customerName: string
}

export function HealthScore({ customerId, jobId, customerName }: HealthScoreProps) {
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  const [panelAge, setPanelAge] = useState(20)
  const [panelCondition, setPanelCondition] = useState('Fair')
  const [hasAfci, setHasAfci] = useState(false)
  const [hasGfci, setHasGfci] = useState(false)
  const [hasSurge, setHasSurge] = useState(false)
  const [groundingOk, setGroundingOk] = useState(false)
  const [wiringType, setWiringType] = useState('Copper')
  const [notes, setNotes] = useState('')

  function handleSave() {
    const input: InspectionInput = {
      customerId, jobId: jobId ?? null,
      panelBrand: '', serviceSize: 200,
      panelAge, panelCondition, hasAfci,
      hasGfci, hasSurge, groundingOk, wiringType,
      hasSmoke: false, smokeCount: 0, hasCo: false, hasOutdoorGfci: false,
      roomFlags: {}, notes,
    }
    startTransition(async () => {
      const inspection = await createInspection(input)
      setResult(inspection.score)
    })
  }

  function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-volturaGold' : 'bg-gray-700'}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full mx-0.5 transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-volturaNavy/60 border border-volturaGold/20 text-volturaGold font-semibold py-3 rounded-xl text-sm hover:bg-volturaGold/10 transition-colors"
      >
        <span>⚡</span>
        <span>Electrical Health Score</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center">
          <div className="bg-volturaNavy w-full max-w-lg rounded-t-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div>
                <h2 className="text-white font-bold text-base">⚡ Health Score</h2>
                <p className="text-gray-500 text-xs">{customerName}</p>
              </div>
              <button onClick={() => { setOpen(false); setResult(null) }} className="text-gray-500 text-xl">✕</button>
            </div>

            {result !== null ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 px-5 py-8">
                <ScoreRing score={result} />
                <div className="w-full space-y-2 text-sm">
                  {result < 70 && (
                    <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3">
                      <p className="text-red-400 font-semibold">Immediate attention recommended</p>
                      <p className="text-gray-400 text-xs mt-1">This home has safety risks that should be addressed soon.</p>
                    </div>
                  )}
                  <div className="bg-volturaBlue/30 rounded-xl px-4 py-3 text-gray-400 text-xs">
                    Score saved to customer record. Use this to present upgrade recommendations.
                  </div>
                </div>
                <button
                  onClick={() => { setResult(null) }}
                  className="text-gray-500 text-sm underline"
                >
                  Redo Inspection
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {/* Panel */}
                  <div className="bg-volturaBlue/20 rounded-2xl p-4 space-y-3">
                    <p className="text-white font-bold text-sm">Panel</p>
                    <div>
                      <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1.5">Age (years)</label>
                      <div className="flex items-center gap-3">
                        <input type="range" min={1} max={60} value={panelAge} onChange={(e) => setPanelAge(+e.target.value)} className="flex-1 accent-amber-400" />
                        <span className="text-volturaGold font-bold text-sm w-10 text-right">{panelAge}yr</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs uppercase tracking-wider block mb-2">Condition</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {PANEL_CONDITIONS.map((c) => (
                          <button key={c} onClick={() => setPanelCondition(c)}
                            className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                              panelCondition === c ? 'bg-volturaGold text-volturaBlue border-volturaGold' : 'bg-white/5 text-gray-400 border-white/10'
                            }`}>
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* AFCI */}
                  <div className="bg-volturaBlue/20 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-bold text-sm">AFCI Protection</p>
                        <p className="text-gray-600 text-xs">NEC 210.12</p>
                      </div>
                      <Toggle value={hasAfci} onChange={setHasAfci} />
                    </div>
                  </div>

                  {/* GFCI */}
                  <div className="bg-volturaBlue/20 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-bold text-sm">GFCI Protection</p>
                        <p className="text-gray-600 text-xs">NEC 210.8</p>
                      </div>
                      <Toggle value={hasGfci} onChange={setHasGfci} />
                    </div>
                  </div>

                  {/* Surge + Grounding */}
                  <div className="bg-volturaBlue/20 rounded-2xl p-4 space-y-3">
                    <p className="text-white font-bold text-sm">Protection & Grounding</p>
                    {[
                      { label: 'Whole-Home Surge Protector', sub: 'NEC 230.67', value: hasSurge, set: setHasSurge },
                      { label: 'Grounding System OK', sub: 'NEC 250', value: groundingOk, set: setGroundingOk },
                    ].map(({ label, sub, value, set }) => (
                      <div key={label} className="flex items-center justify-between">
                        <div><p className="text-white text-sm">{label}</p><p className="text-gray-600 text-xs">{sub}</p></div>
                        <Toggle value={value} onChange={set} />
                      </div>
                    ))}
                  </div>

                  {/* Wiring */}
                  <div className="bg-volturaBlue/20 rounded-2xl p-4 space-y-2">
                    <p className="text-white font-bold text-sm">Wiring Type</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {WIRING_TYPES.map((w) => (
                        <button key={w} onClick={() => setWiringType(w)}
                          className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                            wiringType === w ? 'bg-volturaGold text-volturaBlue border-volturaGold' : 'bg-white/5 text-gray-400 border-white/10'
                          }`}>
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional observations (optional)…"
                    rows={2}
                    className="w-full bg-volturaBlue/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-volturaGold/50 resize-none"
                  />
                </div>

                <div className="px-5 pb-8 pt-3 border-t border-white/10 shrink-0">
                  <button
                    onClick={handleSave}
                    disabled={isPending}
                    className="w-full bg-volturaGold text-volturaBlue font-bold py-3.5 rounded-xl text-sm disabled:opacity-60"
                  >
                    {isPending ? 'Calculating…' : 'Calculate Health Score'}
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
