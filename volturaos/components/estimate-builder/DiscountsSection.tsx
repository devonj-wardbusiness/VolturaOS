'use client'

import { useState } from 'react'

interface DiscountsSectionProps {
  subtotal: number
  onAddDiscount: (description: string, amount: number) => void
}

export function DiscountsSection({ subtotal, onAddDiscount }: DiscountsSectionProps) {
  const [mode, setMode] = useState<'pct' | 'amt'>('pct')
  const [customPct, setCustomPct] = useState('')
  const [customAmt, setCustomAmt] = useState('')

  function applyPreset(label: string, pct: number) {
    if (subtotal <= 0) return
    const amount = Math.round(subtotal * pct) / 100
    onAddDiscount(`${label} Discount (${pct}%)`, -amount)
  }

  function applyCustom() {
    if (mode === 'pct') {
      const pct = parseFloat(customPct)
      if (!pct || pct <= 0 || subtotal <= 0) return
      const amount = Math.round(subtotal * pct) / 100
      onAddDiscount(`Discount (${pct}%)`, -amount)
      setCustomPct('')
    } else {
      const amount = parseFloat(customAmt)
      if (!amount || amount <= 0) return
      onAddDiscount('Discount', -amount)
      setCustomAmt('')
    }
  }

  return (
    <div>
      <label className="block text-gray-400 text-sm mb-2">Discounts</label>
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => applyPreset('Military/Senior', 5)}
          className="flex-1 bg-volturaNavy rounded-lg py-2.5 text-sm text-white font-medium active:opacity-70"
        >
          Military/Senior 5%
        </button>
        <button
          onClick={() => applyPreset('Cash', 6)}
          className="flex-1 bg-volturaNavy rounded-lg py-2.5 text-sm text-white font-medium active:opacity-70"
        >
          Cash 6%
        </button>
      </div>
      <div className="flex gap-2">
        <div className="flex rounded-lg overflow-hidden border border-volturaNavy">
          <button
            onClick={() => setMode('pct')}
            className={`px-3 py-2 text-xs font-bold transition-colors ${mode === 'pct' ? 'bg-volturaGold text-volturaBlue' : 'bg-volturaNavy text-gray-400'}`}
          >
            %
          </button>
          <button
            onClick={() => setMode('amt')}
            className={`px-3 py-2 text-xs font-bold transition-colors ${mode === 'amt' ? 'bg-volturaGold text-volturaBlue' : 'bg-volturaNavy text-gray-400'}`}
          >
            $
          </button>
        </div>
        {mode === 'pct' ? (
          <input
            type="number"
            min="0"
            max="100"
            inputMode="decimal"
            value={customPct}
            onChange={(e) => setCustomPct(e.target.value)}
            placeholder="Custom %"
            className="flex-1 bg-volturaNavy text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold"
          />
        ) : (
          <input
            type="number"
            min="0"
            inputMode="decimal"
            value={customAmt}
            onChange={(e) => setCustomAmt(e.target.value)}
            placeholder="Amount $"
            className="flex-1 bg-volturaNavy text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold"
          />
        )}
        <button
          onClick={applyCustom}
          className="bg-volturaNavy text-volturaGold px-4 py-2 rounded-lg text-sm font-semibold active:opacity-70"
        >
          Apply
        </button>
      </div>
    </div>
  )
}
