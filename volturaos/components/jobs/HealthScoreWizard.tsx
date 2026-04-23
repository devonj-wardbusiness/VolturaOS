'use client'

import { useState, useTransition } from 'react'
import { createInspection } from '@/lib/actions/inspections'
import type { InspectionInput } from '@/lib/actions/inspections'
import { WIZARD_DEFAULTS } from './health-score/types'
import type { WizardState, InspectionResult } from './health-score/types'
import { PanelStep } from './health-score/PanelStep'
import { SafetyStep } from './health-score/SafetyStep'
import { RoomsStep } from './health-score/RoomsStep'
import { ScoreStep } from './health-score/ScoreStep'
import { ChecklistStep } from './health-score/ChecklistStep'

type Step = 'panel' | 'safety' | 'rooms' | 'score' | 'checklist'
const STEPS: Step[] = ['panel', 'safety', 'rooms', 'score', 'checklist']
const STEP_LABELS: Record<Step, string> = {
  panel: 'Panel', safety: 'Safety', rooms: 'Rooms', score: 'Score', checklist: 'Estimate',
}

interface HealthScoreWizardProps {
  customerId: string
  jobId?: string
  customerName: string
  onClose: () => void
}

export function HealthScoreWizard({ customerId, jobId, customerName, onClose }: HealthScoreWizardProps) {
  const [step, setStep] = useState<Step>('panel')
  const [state, setState] = useState<WizardState>(WIZARD_DEFAULTS)
  const [result, setResult] = useState<InspectionResult | null>(null)
  const [isPending, startTransition] = useTransition()

  function update(updates: Partial<WizardState>) {
    setState(prev => ({ ...prev, ...updates }))
  }

  function goTo(s: Step) { setStep(s) }

  function handleCalculate() {
    const input: InspectionInput = {
      customerId, jobId: jobId ?? null,
      panelBrand: state.panelBrand,
      serviceSize: state.serviceSize,
      panelAge: state.panelAge,
      panelCondition: state.panelCondition,
      hasAfci: state.hasAfci,
      hasGfci: state.hasGfci,
      hasSurge: state.hasSurge,
      groundingOk: state.groundingOk,
      wiringType: state.wiringType,
      hasSmoke: state.hasSmoke,
      smokeCount: state.smokeCount,
      hasCo: state.hasCo,
      hasOutdoorGfci: state.hasOutdoorGfci,
      roomFlags: state.roomFlags,
      notes: state.notes,
    }
    startTransition(async () => {
      const r = await createInspection(input)
      setResult(r)
      setStep('score')
    })
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center">
      <div className="bg-volturaNavy w-full max-w-lg rounded-t-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-white font-bold text-base">⚡ Health Score</h2>
            <p className="text-gray-500 text-xs">{customerName}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 text-xl">✕</button>
        </div>

        {/* Step progress (only for steps 1–3) */}
        {step !== 'score' && step !== 'checklist' && (
          <div className="px-5 pt-3 pb-1 shrink-0">
            <div className="flex gap-1.5 mb-1">
              {STEPS.slice(0, 3).map((s, i) => (
                <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${
                  i < stepIndex ? 'bg-volturaGold/40' : i === stepIndex ? 'bg-volturaGold' : 'bg-white/10'
                }`} />
              ))}
            </div>
            <p className="text-gray-500 text-xs">{STEP_LABELS[step]}</p>
          </div>
        )}

        {/* Step content */}
        <div className="flex-1 overflow-hidden flex flex-col px-5 py-4 relative">
          {step === 'panel' && (
            <PanelStep state={state} onChange={update} onNext={() => goTo('safety')} />
          )}
          {step === 'safety' && (
            <SafetyStep state={state} onChange={update} onNext={() => goTo('rooms')} onBack={() => goTo('panel')} />
          )}
          {step === 'rooms' && (
            <RoomsStep state={state} onChange={update} onNext={handleCalculate} onBack={() => goTo('safety')} />
          )}
          {step === 'score' && result && (
            <ScoreStep result={result} onViewChecklist={() => goTo('checklist')} onDone={onClose} />
          )}
          {step === 'checklist' && result && (
            <ChecklistStep customerId={customerId} jobId={jobId} checklist={result.checklist} onBack={() => goTo('score')} />
          )}
          {isPending && (
            <div className="absolute inset-0 flex items-center justify-center bg-volturaNavy/80 rounded-t-2xl">
              <p className="text-volturaGold text-sm font-semibold animate-pulse">Calculating…</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
