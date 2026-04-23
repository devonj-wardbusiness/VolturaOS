'use client'

import type { WizardState } from './types'
import { WIRING_TYPES, HAZARDOUS_WIRING } from './constants'

interface SafetyStepProps {
  state: WizardState
  onChange: (updates: Partial<WizardState>) => void
  onNext: () => void
  onBack: () => void
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

const TOGGLES: { key: keyof WizardState; label: string; sub: string }[] = [
  { key: 'hasAfci',        label: 'AFCI Breakers',            sub: 'NEC 210.12' },
  { key: 'hasGfci',        label: 'GFCI Protection',          sub: 'NEC 210.8' },
  { key: 'hasSurge',       label: 'Whole-Home Surge',         sub: 'NEC 230.67' },
  { key: 'groundingOk',    label: 'Grounding System OK',      sub: 'NEC 250' },
  { key: 'hasSmoke',       label: 'Smoke Detectors',          sub: 'NFPA 72' },
  { key: 'hasCo',          label: 'CO Detectors',             sub: 'State code' },
  { key: 'hasOutdoorGfci', label: 'Outdoor GFCI Outlets',     sub: 'NEC 210.8' },
]

export function SafetyStep({ state, onChange, onNext, onBack }: SafetyStepProps) {
  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto space-y-1 pb-4">

        {TOGGLES.map(({ key, label, sub }) => (
          <div key={key} className="flex items-center justify-between py-3 border-b border-white/5">
            <div>
              <p className="text-white text-sm">{label}</p>
              <p className="text-gray-600 text-xs">{sub}</p>
            </div>
            <Toggle
              value={state[key] as boolean}
              onChange={(v) => onChange({ [key]: v })}
            />
          </div>
        ))}

        <div className="pt-3">
          <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Wiring Type</label>
          <div className="flex flex-wrap gap-2">
            {WIRING_TYPES.map(w => {
              const hazard = HAZARDOUS_WIRING.has(w)
              return (
                <button
                  key={w}
                  onClick={() => onChange({ wiringType: w })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    state.wiringType === w && hazard ? 'bg-red-500 text-white border-red-500' :
                    state.wiringType === w ? 'bg-volturaGold text-volturaBlue border-volturaGold' :
                    hazard ? 'border-red-500/60 text-red-400' :
                    'bg-white/5 text-gray-400 border-white/10'
                  }`}
                >
                  {hazard && '⚠ '}{w}
                </button>
              )
            })}
          </div>
        </div>

      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={onBack} className="px-4 py-3.5 rounded-xl text-sm text-gray-400 border border-white/10">← Back</button>
        <button onClick={onNext} className="flex-1 bg-volturaGold text-volturaBlue font-bold py-3.5 rounded-xl text-sm">Next →</button>
      </div>
    </div>
  )
}
