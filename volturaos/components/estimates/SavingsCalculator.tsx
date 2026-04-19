'use client'

import { useState, useMemo } from 'react'
import type { LineItem, Addon } from '@/types'

interface SavingsCalculatorProps {
  lineItems: LineItem[]
  addons: Addon[]
}

// Colorado Springs average electricity rate: ~$0.13/kWh (Xcel Energy)
const RATE_PER_KWH = 0.13
// Colorado average gas price: ~$3.40/gal, avg EV does ~3.5 mi/kWh vs 30 mpg car
const GAS_PRICE = 3.40
const MPG = 30
const EV_EFFICIENCY = 3.5 // miles per kWh
const AVG_ANNUAL_MILES = 12000

function detectFromItems(lineItems: LineItem[], addons: Addon[]) {
  const all = [...lineItems.map((l) => l.description), ...addons.filter((a) => a.selected).map((a) => a.name)]
    .join(' ')
    .toLowerCase()

  return {
    hasEV: /ev|charger|electric vehicle|evse|level 2/.test(all),
    hasPanel: /panel|service upgrade|200a|200 amp|150a/.test(all),
    hasLED: /led|lighting|fixture|light/.test(all),
    hasSurge: /surge/.test(all),
    hasGenerator: /generator|generator transfer|standby/.test(all),
  }
}

export function SavingsCalculator({ lineItems, addons }: SavingsCalculatorProps) {
  const [open, setOpen] = useState(false)
  const [numBulbs, setNumBulbs] = useState(20)
  const [annualMiles, setAnnualMiles] = useState(AVG_ANNUAL_MILES)

  const detected = useMemo(() => detectFromItems(lineItems, addons), [lineItems, addons])

  // LED savings: 60W incandescent → 9W LED, avg 3 hrs/day
  const ledSavingsPerBulb = (60 - 9) / 1000 * 3 * 365 * RATE_PER_KWH
  const ledAnnual = ledSavingsPerBulb * numBulbs

  // EV savings: gas cost vs electricity cost per mile
  const gasCostPerMile = GAS_PRICE / MPG
  const evCostPerMile = RATE_PER_KWH / EV_EFFICIENCY
  const evAnnual = (gasCostPerMile - evCostPerMile) * annualMiles

  // Surge protection: avg appliance loss from surge = $2,000 value, 1-in-50 annual risk
  const surgeProtectionValue = (2000 / 50)

  const totalAnnual =
    (detected.hasLED || numBulbs > 0 ? ledAnnual : 0) +
    (detected.hasEV ? evAnnual : 0)

  const rows: { label: string; annual: number; note: string; active: boolean }[] = [
    {
      label: 'LED Lighting Upgrade',
      annual: ledAnnual,
      note: `${numBulbs} bulbs × 51W saved × 3 hrs/day`,
      active: detected.hasLED || numBulbs > 0,
    },
    {
      label: 'EV Charger vs Gas',
      annual: evAnnual,
      note: `${annualMiles.toLocaleString()} mi/yr · $${GAS_PRICE}/gal vs $${(evCostPerMile * 100).toFixed(1)}¢/mi electric`,
      active: detected.hasEV,
    },
    {
      label: 'Surge Protection Value',
      annual: surgeProtectionValue,
      note: 'Avg appliance replacement risk · NEC 230.67 required',
      active: detected.hasSurge,
    },
  ]

  const hasAny = rows.some((r) => r.active)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-9 h-9 text-base text-gray-400 hover:text-volturaGold transition-colors rounded-lg hover:bg-white/5"
        title="Savings calculator"
        aria-label="Savings calculator"
      >
        ⚡
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center">
          <div className="bg-volturaNavy w-full max-w-lg rounded-t-2xl overflow-hidden max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div>
                <h2 className="text-white font-bold text-base">⚡ Projected Savings</h2>
                <p className="text-gray-500 text-xs">Based on Colorado Springs avg rates</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 text-xl">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Inputs */}
              <div className="space-y-3">
                <div className="bg-volturaBlue/50 rounded-xl p-4 space-y-3">
                  <div>
                    <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1.5">
                      Number of bulbs being upgraded to LED
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min={0} max={100} value={numBulbs}
                        onChange={(e) => setNumBulbs(Number(e.target.value))}
                        className="flex-1 accent-amber-400"
                      />
                      <span className="text-volturaGold font-bold text-sm w-8 text-right">{numBulbs}</span>
                    </div>
                  </div>
                  {detected.hasEV && (
                    <div>
                      <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1.5">
                        Annual miles driven
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range" min={5000} max={30000} step={1000} value={annualMiles}
                          onChange={(e) => setAnnualMiles(Number(e.target.value))}
                          className="flex-1 accent-amber-400"
                        />
                        <span className="text-volturaGold font-bold text-sm w-16 text-right">
                          {(annualMiles / 1000).toFixed(0)}k mi
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Savings rows */}
              {!hasAny && numBulbs === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">
                  Set bulb count above or add LED/EV items to the estimate to see savings.
                </p>
              )}

              <div className="space-y-2">
                {rows.map((row) => (
                  (row.active || row.label === 'LED Lighting Upgrade') && (
                    <div
                      key={row.label}
                      className={`rounded-xl p-4 border ${
                        row.active
                          ? 'bg-green-900/20 border-green-500/30'
                          : 'bg-volturaBlue/30 border-white/5 opacity-40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-white font-semibold text-sm">{row.label}</p>
                        <p className="text-green-400 font-bold text-base">
                          +${row.annual.toLocaleString('en-US', { maximumFractionDigits: 0 })}/yr
                        </p>
                      </div>
                      <p className="text-gray-500 text-xs">{row.note}</p>
                    </div>
                  )
                ))}
              </div>

              {/* Total */}
              {totalAnnual > 0 && (
                <div className="bg-volturaGold/10 border border-volturaGold/40 rounded-2xl px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-volturaGold font-bold text-lg">Total Annual Savings</p>
                      <p className="text-gray-400 text-xs">Colorado Springs avg rates · Xcel Energy</p>
                    </div>
                    <div className="text-right">
                      <p className="text-volturaGold font-bold text-3xl">
                        ${totalAnnual.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-gray-500 text-xs">
                        ${(totalAnnual / 12).toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-gray-600 text-xs text-center pb-2">
                Estimates only. Actual savings vary by usage. Based on Xcel Energy CO avg $0.13/kWh.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
