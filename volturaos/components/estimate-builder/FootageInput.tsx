'use client'

import { useState } from 'react'

interface FootageInputProps {
  footageGroup: string
  brackets: { label: string; price: number }[]
  perFootRate: number
  selectedBracketIndex: number | null
  customFootage: number | null
  onBracketSelect: (index: number, price: number) => void
  onCustomFootage: (footage: number, price: number) => void
}

export function FootageInput({
  footageGroup,
  brackets,
  perFootRate,
  selectedBracketIndex,
  customFootage,
  onBracketSelect,
  onCustomFootage,
}: FootageInputProps) {
  const [customValue, setCustomValue] = useState(customFootage?.toString() ?? '')

  function handleCustomChange(value: string) {
    setCustomValue(value)
    const ft = parseFloat(value)
    if (!isNaN(ft) && ft > 0) {
      const price = Math.round(perFootRate * ft)
      onCustomFootage(ft, price)
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <p className="text-gray-500 text-xs">{footageGroup} — select length</p>
      <div className="flex gap-2">
        {brackets.map((b, i) => (
          <button
            key={b.label}
            onClick={() => onBracketSelect(i, b.price)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              selectedBracketIndex === i && customFootage === null
                ? 'bg-volturaGold text-volturaBlue'
                : 'bg-volturaNavy/50 text-gray-400'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={customValue}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="Custom ft"
          className={`flex-1 bg-volturaNavy text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-volturaGold/50 ${
            customFootage !== null ? 'ring-1 ring-volturaGold/50' : ''
          }`}
        />
        {customFootage !== null && (
          <span className="text-volturaGold text-sm font-semibold whitespace-nowrap">
            ${Math.round(perFootRate * customFootage).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  )
}
