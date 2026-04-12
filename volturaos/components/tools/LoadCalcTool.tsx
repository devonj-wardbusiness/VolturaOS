'use client'

import { useState, useMemo } from 'react'

// NEC 220.82 Optional Calculation Method for Existing Dwellings
// ─────────────────────────────────────────────────────────────
// General Load: 100% of first 10kVA + 40% of remainder
// Then add A/C OR heating (largest)
// Then add EV, appliances at 100%

interface Appliance {
  label: string
  va: number
  enabled: boolean
  qty: number
}

const DEFAULT_APPLIANCES: Appliance[] = [
  { label: 'Range / Oven (electric)', va: 12000, enabled: false, qty: 1 },
  { label: 'Dryer (electric)', va: 5000, enabled: false, qty: 1 },
  { label: 'Water Heater (electric)', va: 4500, enabled: false, qty: 1 },
  { label: 'Dishwasher', va: 1500, enabled: false, qty: 1 },
  { label: 'Refrigerator', va: 1200, enabled: false, qty: 1 },
  { label: 'Garbage Disposal', va: 1000, enabled: false, qty: 1 },
  { label: 'Microwave', va: 1500, enabled: false, qty: 1 },
  { label: 'Pool Pump', va: 2000, enabled: false, qty: 1 },
  { label: 'Hot Tub / Spa', va: 6000, enabled: false, qty: 1 },
]

function fmt(va: number) {
  return va >= 1000 ? `${(va / 1000).toFixed(1)} kVA` : `${va} VA`
}

export function LoadCalcTool() {
  const [sqft, setSqft] = useState(1800)
  const [smallApplCircuits, setSmallApplCircuits] = useState(2)
  const [hasLaundry, setHasLaundry] = useState(true)
  const [hvacCooling, setHvacCooling] = useState(0)  // VA
  const [hvacHeating, setHvacHeating] = useState(0)  // VA
  const [evCharger, setEvCharger] = useState(false)
  const [evAmps, setEvAmps] = useState(32)
  const [appliances, setAppliances] = useState<Appliance[]>(DEFAULT_APPLIANCES)
  const [voltage] = useState(240)

  function toggleAppl(i: number) {
    setAppliances((prev) => prev.map((a, idx) => idx === i ? { ...a, enabled: !a.enabled } : a))
  }

  const calc = useMemo(() => {
    // Step 1: General load (NEC 220.82(B)(1))
    const generalLighting = sqft * 3  // 3 VA/sq ft
    const smallAppl = smallApplCircuits * 1500  // 1500 VA each
    const laundry = hasLaundry ? 1500 : 0
    const generalTotal = generalLighting + smallAppl + laundry

    // Step 2: Apply demand factor (NEC 220.82(B))
    const generalDemand = generalTotal <= 10000
      ? generalTotal
      : 10000 + (generalTotal - 10000) * 0.40

    // Step 3: Appliances at 100%
    const applianceVA = appliances
      .filter((a) => a.enabled)
      .reduce((sum, a) => sum + a.va * a.qty, 0)

    // Step 4: HVAC — largest of A/C or heat (NEC 220.82(C)(6))
    const hvac = Math.max(hvacCooling, hvacHeating)

    // Step 5: EV at 100% of nameplate (NEC 625.40)
    const evVA = evCharger ? evAmps * voltage * 1.25 : 0  // 125% continuous

    const totalVA = generalDemand + applianceVA + hvac + evVA
    const totalAmps = totalVA / voltage

    // Recommended service size
    let serviceSize = 100
    if (totalAmps > 60) serviceSize = 100
    if (totalAmps > 80) serviceSize = 125
    if (totalAmps > 100) serviceSize = 150
    if (totalAmps > 120) serviceSize = 200
    if (totalAmps > 160) serviceSize = 225
    if (totalAmps > 180) serviceSize = 400

    return {
      generalLighting, smallAppl, laundry, generalTotal,
      generalDemand, applianceVA, hvac, evVA,
      totalVA, totalAmps, serviceSize,
    }
  }, [sqft, smallApplCircuits, hasLaundry, hvacCooling, hvacHeating, evCharger, evAmps, appliances, voltage])

  const statusColor = calc.totalAmps > 160
    ? 'text-red-400' : calc.totalAmps > 100
    ? 'text-yellow-400' : 'text-green-400'

  return (
    <div className="px-4 pb-8 space-y-4 max-w-lg mx-auto">
      {/* Info banner */}
      <div className="bg-volturaGold/10 border border-volturaGold/30 rounded-xl px-4 py-3">
        <p className="text-volturaGold text-xs font-bold uppercase tracking-wider mb-0.5">NEC 220.82 — Optional Method</p>
        <p className="text-gray-400 text-xs">Existing dwelling units only. Accepts lower calculated load for permit submissions to PPRBD.</p>
      </div>

      {/* General loads */}
      <div className="bg-volturaNavy/60 rounded-2xl p-4 space-y-4">
        <p className="text-white font-bold text-sm">General Load</p>

        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1.5">
            Conditioned Floor Area (sq ft)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range" min={500} max={6000} step={50} value={sqft}
              onChange={(e) => setSqft(Number(e.target.value))}
              className="flex-1 accent-amber-400"
            />
            <span className="text-volturaGold font-bold text-sm w-16 text-right">{sqft.toLocaleString()}</span>
          </div>
          <p className="text-gray-600 text-xs mt-1">{sqft} sq ft × 3 VA = {fmt(sqft * 3)}</p>
        </div>

        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1.5">
            Small Appliance Circuits (20A kitchen/dining)
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setSmallApplCircuits(n)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  smallApplCircuits === n
                    ? 'bg-volturaGold text-volturaBlue border-volturaGold'
                    : 'bg-white/5 text-gray-400 border-white/10'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-gray-600 text-xs mt-1">{smallApplCircuits} × 1,500 VA = {fmt(smallApplCircuits * 1500)}</p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm">Laundry Circuit</p>
            <p className="text-gray-600 text-xs">1,500 VA (NEC 220.52(B))</p>
          </div>
          <button
            onClick={() => setHasLaundry(!hasLaundry)}
            className={`w-12 h-6 rounded-full transition-colors ${hasLaundry ? 'bg-volturaGold' : 'bg-gray-700'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full mx-0.5 transition-transform ${hasLaundry ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* HVAC */}
      <div className="bg-volturaNavy/60 rounded-2xl p-4 space-y-3">
        <p className="text-white font-bold text-sm">HVAC — Largest of A/C or Heating</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'A/C (VA)', value: hvacCooling, set: setHvacCooling },
            { label: 'Heat (VA)', value: hvacHeating, set: setHvacHeating },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="text-gray-400 text-xs block mb-1">{label}</label>
              <input
                type="number"
                value={value}
                onChange={(e) => set(Number(e.target.value))}
                placeholder="e.g. 5000"
                className="w-full bg-volturaBlue text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-volturaGold/50"
              />
            </div>
          ))}
        </div>
        <p className="text-gray-600 text-xs">Nameplate VA from equipment label. Using: {fmt(Math.max(hvacCooling, hvacHeating))}</p>
      </div>

      {/* EV Charger */}
      <div className="bg-volturaNavy/60 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-sm">EV Charger (Level 2)</p>
            <p className="text-gray-600 text-xs">NEC 625.40 — 125% of nameplate</p>
          </div>
          <button
            onClick={() => setEvCharger(!evCharger)}
            className={`w-12 h-6 rounded-full transition-colors ${evCharger ? 'bg-volturaGold' : 'bg-gray-700'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full mx-0.5 transition-transform ${evCharger ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
        {evCharger && (
          <div>
            <label className="text-gray-400 text-xs block mb-1">Charger Amperage</label>
            <div className="flex gap-2 flex-wrap">
              {[16, 24, 32, 40, 48, 50].map((a) => (
                <button
                  key={a}
                  onClick={() => setEvAmps(a)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    evAmps === a
                      ? 'bg-volturaGold text-volturaBlue border-volturaGold'
                      : 'bg-white/5 text-gray-400 border-white/10'
                  }`}
                >
                  {a}A
                </button>
              ))}
            </div>
            <p className="text-gray-600 text-xs mt-1">
              {evAmps}A × 240V × 1.25 = {fmt(evAmps * 240 * 1.25)} demand
            </p>
          </div>
        )}
      </div>

      {/* Fixed Appliances */}
      <div className="bg-volturaNavy/60 rounded-2xl p-4 space-y-2">
        <p className="text-white font-bold text-sm mb-1">Fixed Appliances (100%)</p>
        {appliances.map((appl, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleAppl(i)}
                className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                  appl.enabled ? 'bg-volturaGold border-volturaGold' : 'border-gray-600'
                }`}
              >
                {appl.enabled && <span className="text-volturaBlue text-xs font-bold">✓</span>}
              </button>
              <span className="text-white text-sm">{appl.label}</span>
            </div>
            <span className="text-gray-500 text-xs">{fmt(appl.va)}</span>
          </div>
        ))}
      </div>

      {/* Results */}
      <div className="bg-volturaNavy border border-volturaNavy rounded-2xl p-4 space-y-3">
        <p className="text-white font-bold text-sm">Calculation Breakdown</p>
        {[
          { label: 'General load (after demand factor)', va: calc.generalDemand },
          { label: 'Fixed appliances', va: calc.applianceVA },
          { label: 'HVAC (largest)', va: calc.hvac },
          { label: 'EV charger (125%)', va: calc.evVA },
        ].filter(r => r.va > 0).map((row) => (
          <div key={row.label} className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-gray-400 text-sm">{row.label}</span>
            <span className="text-white text-sm font-semibold">{fmt(row.va)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between pt-1">
          <span className="text-white font-bold">Total Calculated Load</span>
          <span className="text-volturaGold font-bold">{fmt(calc.totalVA)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white font-bold">At 240V =</span>
          <span className={`font-bold text-xl ${statusColor}`}>{calc.totalAmps.toFixed(1)}A</span>
        </div>
      </div>

      {/* Recommendation */}
      <div className={`rounded-2xl p-5 text-center border ${
        calc.serviceSize >= 200
          ? 'bg-red-900/20 border-red-500/30'
          : calc.serviceSize >= 150
          ? 'bg-yellow-900/20 border-yellow-500/30'
          : 'bg-green-900/20 border-green-500/30'
      }`}>
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Minimum Service Size</p>
        <p className={`font-black text-5xl ${statusColor}`}>{calc.serviceSize}A</p>
        <p className="text-gray-500 text-xs mt-2">NEC 220.82 Optional Method · {voltage}V single-phase</p>
        {evCharger && calc.serviceSize < 200 && (
          <p className="text-yellow-400 text-xs mt-2 font-semibold">
            ⚡ Recommend 200A for EV charger headroom
          </p>
        )}
      </div>

      <p className="text-gray-600 text-xs text-center">
        For permit submission to PPRBD. Load calc is engineer-of-record responsibility — verify before submission.
      </p>
    </div>
  )
}
