import type { EstimateStatus } from '@/types'

const STEPS = ['Created', 'Sent', 'Viewed', 'Approved', 'Scheduled', 'Complete']

interface ProgressTrackerProps {
  sentAt: string | null
  viewedAt: string | null
  status: EstimateStatus
  hasLinkedJob?: boolean
  jobCompleted?: boolean
}

export function ProgressTracker({ sentAt, viewedAt, status, hasLinkedJob = false, jobCompleted = false }: ProgressTrackerProps) {
  if (status === 'Declined') {
    return (
      <div className="px-4 py-3">
        <span className="text-red-400 text-xs font-semibold">✕ Estimate Declined</span>
      </div>
    )
  }

  // Determine which step is "current" (1-indexed)
  let current = 1
  if (sentAt) current = 2
  if (viewedAt) current = 3
  if (status === 'Approved') current = 4
  if (hasLinkedJob) current = 5
  if (jobCompleted) current = 6

  return (
    <div className="flex items-start w-full py-3 px-4 overflow-x-auto">
      {STEPS.map((step, i) => {
        const stepNum = i + 1
        const done = stepNum < current
        const active = stepNum === current
        return (
          <div key={step} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                done ? 'bg-volturaGold border-volturaGold text-volturaBlue' :
                active ? 'bg-transparent border-volturaGold text-volturaGold' :
                'bg-transparent border-gray-600 text-gray-600'
              }`}>
                {done ? '✓' : stepNum}
              </div>
              <span className={`text-[9px] mt-1 text-center leading-tight whitespace-nowrap ${
                active ? 'text-volturaGold' : done ? 'text-white/60' : 'text-gray-600'
              }`}>{step}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mt-[-8px] ${done ? 'bg-volturaGold' : 'bg-gray-700'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
