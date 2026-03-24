'use client'

import type { JobStatus } from '@/types'

const STEPS: JobStatus[] = ['Lead', 'Scheduled', 'In Progress', 'Completed', 'Invoiced', 'Paid']

export function StatusStepper({ status }: { status: JobStatus }) {
  const currentIndex = STEPS.indexOf(status)
  const isCancelled = status === 'Cancelled'

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 rounded-xl">
        <span className="text-red-400 text-sm font-semibold">Cancelled</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => {
        const isActive = i <= currentIndex
        const isCurrent = i === currentIndex
        return (
          <div key={step} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-full h-1.5 rounded-full ${
                  isActive ? 'bg-volturaGold' : 'bg-white/10'
                }`}
              />
              <span
                className={`text-[10px] mt-1 ${
                  isCurrent ? 'text-volturaGold font-semibold' : isActive ? 'text-white/60' : 'text-white/20'
                }`}
              >
                {step}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
