'use client'

import { useState } from 'react'
import { HealthScoreWizard } from './HealthScoreWizard'

interface HealthScoreProps {
  customerId: string
  jobId?: string
  customerName: string
}

export function HealthScore({ customerId, jobId, customerName }: HealthScoreProps) {
  const [open, setOpen] = useState(false)

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
        <HealthScoreWizard
          customerId={customerId}
          jobId={jobId}
          customerName={customerName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
