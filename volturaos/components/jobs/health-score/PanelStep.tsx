'use client'

import type { WizardState } from './types'
import { PANEL_BRANDS, HAZARDOUS_BRANDS, SERVICE_SIZES, PANEL_CONDITIONS } from './constants'

interface PanelStepProps {
  state: WizardState
  onChange: (updates: Partial<WizardState>) => void
  onNext: () => void
}

export function PanelStep({ state, onChange, onNext }: PanelStepProps) {
  const isHazardous = HAZARDOUS_BRANDS.has(state.panelBrand)

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto space-y-5 pb-4">

        {/* Brand */}
        <div>
          <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Panel Brand</label>
          <div className="flex flex-wrap gap-2">
            {PANEL_BRANDS.map(brand => {
              const hazard = HAZARDOUS_BRANDS.has(brand)
              const selected = state.panelBrand === brand
              return (
                <button
                  key={brand}
                  onClick={() => onChange({ panelBrand: brand })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    selected && hazard ? 'bg-red-500 text-white border-red-500' :
                    selected ? 'bg-volturaGold text-volturaBlue border-volturaGold' :
                    hazard ? 'border-red-500/60 text-red-400' :
                    'bg-white/5 text-gray-400 border-white/10'
                  }`}
                >
                  {hazard && '⚠ '}{brand}
                </button>
              )
            })}
          </div>
          {isHazardous && (
            <div className="mt-2 bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-red-400 text-xs font-semibold">Known fire hazard</p>
              <p className="text-gray-400 text-xs mt-0.5">{state.panelBrand} panels have a documented history of failure. Replacement is strongly recommended.</p>
            </div>
          )}
        </div>

        {/* Service size */}
        <div>
          <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Service Size</label>
          <div className="flex gap-2">
            {SERVICE_SIZES.map(size => (
              <button
                key={size}
                onClick={() => onChange({ serviceSize: size })}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  state.serviceSize === size
                    ? 'bg-volturaGold text-volturaBlue border-volturaGold'
                    : size === 60
                    ? 'bg-white/5 text-red-400 border-red-500/40'
                    : 'bg-white/5 text-gray-400 border-white/10'
                }`}
              >
                {size}A
              </button>
            ))}
          </div>
        </div>

        {/* Panel age */}
        <div>
          <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">
            Panel Age — {state.panelAge} yrs
          </label>
          <input
            type="range" min={1} max={60} value={state.panelAge}
            onChange={(e) => onChange({ panelAge: +e.target.value })}
            className="w-full accent-amber-400"
          />
        </div>

        {/* Condition */}
        <div>
          <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Condition</label>
          <div className="grid grid-cols-4 gap-2">
            {PANEL_CONDITIONS.map(c => (
              <button
                key={c}
                onClick={() => onChange({ panelCondition: c })}
                className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  state.panelCondition === c
                    ? 'bg-volturaGold text-volturaBlue border-volturaGold'
                    : c === 'Replace'
                    ? 'bg-white/5 text-red-400 border-red-500/40'
                    : 'bg-white/5 text-gray-400 border-white/10'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

      </div>

      <button
        onClick={onNext}
        disabled={!state.panelBrand}
        className="w-full bg-volturaGold text-volturaBlue font-bold py-3.5 rounded-xl text-sm mt-4 disabled:opacity-40"
      >
        Next →
      </button>
    </div>
  )
}
