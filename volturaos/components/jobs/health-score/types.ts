// components/jobs/health-score/types.ts
// ChecklistItem lives in @/types (single source of truth); import it here.
import type { InspectionChecklistItem } from '@/types'
export type { InspectionChecklistItem as ChecklistItem }

export interface WizardState {
  // Step 1 — Panel
  panelBrand: string
  serviceSize: number
  panelAge: number
  panelCondition: string
  // Step 2 — Safety
  hasAfci: boolean
  hasGfci: boolean
  hasSurge: boolean
  groundingOk: boolean
  wiringType: string
  hasSmoke: boolean
  smokeCount: number
  hasCo: boolean
  hasOutdoorGfci: boolean
  // Step 3 — Rooms
  roomFlags: Record<string, string[]>
  // Notes
  notes: string
}

export const WIZARD_DEFAULTS: WizardState = {
  panelBrand: '',
  serviceSize: 200,
  panelAge: 20,
  panelCondition: 'Fair',
  hasAfci: false,
  hasGfci: false,
  hasSurge: false,
  groundingOk: true,
  wiringType: 'Copper',
  hasSmoke: false,
  smokeCount: 0,
  hasCo: false,
  hasOutdoorGfci: false,
  roomFlags: {},
  notes: '',
}

export interface InspectionResult {
  inspectionId: string
  score: number
  checklist: InspectionChecklistItem[]
  findings: { text: string; level: 'red' | 'yellow' | 'green' }[]
}
