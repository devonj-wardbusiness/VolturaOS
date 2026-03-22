'use client'

import { useState, useRef } from 'react'

interface EditablePriceProps {
  value: number
  onChange: (v: number) => void
  originalValue?: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

function formatPrice(n: number) {
  return '$' + n.toLocaleString('en-US')
}

export function EditablePrice({ value, onChange, originalValue, className = '', size = 'md' }: EditablePriceProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl font-bold',
  }

  const isOverridden = originalValue !== undefined && value !== originalValue

  function startEdit() {
    setDraft(String(value))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commitEdit() {
    const parsed = parseFloat(draft)
    const next = isNaN(parsed) ? value : Math.max(0, parsed)
    onChange(next)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <span className={`text-gray-400 ${sizeClasses[size]}`}>$</span>
        <input
          ref={inputRef}
          type="number"
          value={draft}
          min={0}
          step={1}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false) }}
          className={`price-input bg-volturaNavy text-volturaGold rounded-lg px-2 w-28 focus:outline-none focus:ring-2 focus:ring-volturaGold ${sizeClasses[size]}`}
          autoFocus
        />
      </div>
    )
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <button
        type="button"
        onClick={startEdit}
        className={`flex items-center gap-1.5 text-volturaGold border-b border-volturaGold/40 hover:border-volturaGold transition-colors ${sizeClasses[size]}`}
        aria-label="edit price"
      >
        <span className="font-semibold">{formatPrice(value)}</span>
        <svg className="w-3.5 h-3.5 opacity-60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-.9.524l-3.535.884.884-3.535a2 2 0 01.523-.9z" />
        </svg>
      </button>
      {isOverridden && (
        <span className="text-gray-500 line-through text-xs mt-0.5">{formatPrice(originalValue!)}</span>
      )}
    </div>
  )
}
