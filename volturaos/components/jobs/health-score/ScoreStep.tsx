'use client'

import { ScoreRing } from './ScoreRing'
import type { InspectionResult } from './types'

interface ScoreStepProps {
  result: InspectionResult
  onViewChecklist: () => void
  onDone: () => void
}

export function ScoreStep({ result, onViewChecklist, onDone }: ScoreStepProps) {
  const { score, findings, checklist } = result

  return (
    <div className="flex flex-col flex-1 items-center">
      <ScoreRing score={score} />

      {score < 70 && (
        <div className="w-full bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 mb-3">
          <p className="text-red-400 font-semibold text-sm">Immediate attention recommended</p>
          <p className="text-gray-400 text-xs mt-0.5">This home has safety issues that should be addressed soon.</p>
        </div>
      )}

      <div className="w-full space-y-0 divide-y divide-white/5 mb-4">
        {findings.map((f, i) => {
          const dotColor = f.level === 'red' ? 'bg-red-500' : f.level === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'
          return (
            <div key={i} className="flex items-start gap-3 py-2.5">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
              <p className="text-gray-300 text-xs">{f.text}</p>
            </div>
          )
        })}
      </div>

      <div className="w-full bg-volturaBlue/30 rounded-xl px-4 py-3 text-gray-400 text-xs mb-4">
        Score saved to customer record.
      </div>

      <div className="w-full space-y-2 mt-auto">
        {checklist.length > 0 && (
          <button
            onClick={onViewChecklist}
            className="w-full bg-volturaGold text-volturaBlue font-bold py-3.5 rounded-xl text-sm"
          >
            See Upgrade Plan ({checklist.length} item{checklist.length > 1 ? 's' : ''}) →
          </button>
        )}
        <button onClick={onDone} className="w-full text-gray-500 text-sm py-2">
          Done
        </button>
      </div>
    </div>
  )
}
