'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

const ACTIONS = [
  { label: '+ Job', href: '/jobs/new' },
  { label: '+ Estimate', href: '/estimates/new' },
  { label: '+ Customer', href: '/customers/new' },
]

export function FAB() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="flex flex-col items-end gap-2">
          {ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              onClick={() => setOpen(false)}
              className="bg-volturaNavy border border-volturaGold/50 text-volturaGold font-semibold text-sm px-4 py-2 rounded-full shadow-lg whitespace-nowrap"
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-12 h-12 rounded-full bg-volturaGold text-volturaBlue flex items-center justify-center shadow-lg text-2xl font-bold leading-none"
        aria-label="Quick actions"
      >
        {open ? '×' : '+'}
      </button>
    </div>
  )
}
