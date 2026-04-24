# Electrical Health Score Revamp — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-scroll health score modal with a 5-step wizard (Panel → Safety → Rooms → Score → Checklist) that generates a prioritized upgrade checklist mapped to pricebook prices and creates estimates in one tap.

**Architecture:** All wizard state lives in `HealthScoreWizard.tsx` and is passed as props to step components. The server action `createInspection` is rewritten to accept new fields, apply a deduction-based scoring algorithm, look up pricebook prices for each finding, and return `InspectionResult` (score + inspection row + checklist). A new `createEstimateFromChecklist` action in `estimates.ts` converts selected checklist items into a draft estimate.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, Supabase (admin client), lucide-react, existing `BottomSheet` component at `components/ui/BottomSheet.tsx`.

---

## Pre-flight: Run DB Migration

Before starting, run this SQL in Supabase SQL Editor:

```sql
ALTER TABLE home_inspections
  ADD COLUMN IF NOT EXISTS panel_brand      text,
  ADD COLUMN IF NOT EXISTS service_size     integer,
  ADD COLUMN IF NOT EXISTS has_smoke        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS smoke_count      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_co           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_outdoor_gfci boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS room_flags       jsonb   NOT NULL DEFAULT '{}';
```

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `components/jobs/health-score/types.ts` | Create | WizardState, ChecklistItem, InspectionResult |
| `components/jobs/health-score/constants.ts` | Create | ROOMS, ROOM_ISSUES, HAZARDOUS_BRANDS, CHECKLIST_RULES |
| `components/jobs/health-score/ScoreRing.tsx` | Create | Extracted SVG ring (moved from HealthScore.tsx) |
| `components/jobs/health-score/PanelStep.tsx` | Create | Step 1: brand, service size, age, condition |
| `components/jobs/health-score/SafetyStep.tsx` | Create | Step 2: toggles + wiring type |
| `components/jobs/health-score/RoomIssueSheet.tsx` | Create | Bottom sheet: per-room issue checkboxes |
| `components/jobs/health-score/RoomsStep.tsx` | Create | Step 3: room grid + issue flagging |
| `components/jobs/health-score/ScoreStep.tsx` | Create | Step 4: score ring + key findings |
| `components/jobs/health-score/ChecklistStep.tsx` | Create | Step 5: prioritized checklist + estimate button |
| `components/jobs/HealthScoreWizard.tsx` | Create | Step orchestrator, holds all wizard state |
| `components/jobs/HealthScore.tsx` | Modify | Replace guts: entry button → opens wizard |
| `lib/actions/inspections.ts` | Modify | New fields, new scoring, checklist gen, InspectionResult return |
| `lib/actions/estimates.ts` | Modify | Add createEstimateFromChecklist() |
| `types/index.ts` | Modify | Add new fields to HomeInspection; add ChecklistItem |

---

## Task 1: Types and Constants

**Files:**
- Create: `components/jobs/health-score/types.ts`
- Create: `components/jobs/health-score/constants.ts`
- Modify: `types/index.ts`

- [ ] **Step 1: Create the types file**

```typescript
// components/jobs/health-score/types.ts
// ChecklistItem lives in @/types (single source of truth); import it here.
import type { ChecklistItem } from '@/types'
export type { ChecklistItem }

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
  checklist: ChecklistItem[]
  findings: { text: string; level: 'red' | 'yellow' | 'green' }[]
}
```

- [ ] **Step 2: Create the constants file**

```typescript
// components/jobs/health-score/constants.ts

export const HAZARDOUS_BRANDS = new Set([
  'FPE / Stab-Lok', 'Zinsco', 'Pushmatic', 'Bulldog / Pushmatic', 'Split-Bus',
])

export const PANEL_BRANDS = [
  'Square D', 'Eaton', 'Leviton', 'Siemens', 'GE', 'Homeline',
  'FPE / Stab-Lok', 'Zinsco', 'Pushmatic', 'Split-Bus', 'Other',
]

export const SERVICE_SIZES = [60, 100, 150, 200, 400]

export const PANEL_CONDITIONS = ['Good', 'Fair', 'Poor', 'Replace'] as const

export const WIRING_TYPES = ['Copper', 'Copper/Aluminum', 'Aluminum', 'Knob-and-Tube', 'Mixed'] as const
export const HAZARDOUS_WIRING = new Set(['Knob-and-Tube'])

export interface RoomDef {
  id: string
  label: string
  icon: string
}

export const ROOMS: RoomDef[] = [
  { id: 'kitchen',     label: 'Kitchen',     icon: '🍳' },
  { id: 'bathroom_1',  label: 'Bathroom 1',  icon: '🚿' },
  { id: 'bathroom_2',  label: 'Bathroom 2',  icon: '🚿' },
  { id: 'bedroom_1',   label: 'Bedroom 1',   icon: '🛏' },
  { id: 'bedroom_2',   label: 'Bedroom 2',   icon: '🛏' },
  { id: 'bedroom_3',   label: 'Bedroom 3',   icon: '🛏' },
  { id: 'garage',      label: 'Garage',      icon: '🚗' },
  { id: 'basement',    label: 'Basement',    icon: '🏚' },
  { id: 'exterior',    label: 'Exterior',    icon: '🌿' },
]

export interface IssueDef {
  id: string
  label: string
  rooms?: string[] // if omitted, available in all rooms
}

export const ROOM_ISSUES: IssueDef[] = [
  { id: 'no_gfci',          label: 'No GFCI outlets' },
  { id: 'old_outlets',      label: 'Outdated/damaged outlets' },
  { id: 'no_exhaust_fan',   label: 'No exhaust fan',     rooms: ['bathroom_1', 'bathroom_2'] },
  { id: 'flickering_lights', label: 'Flickering lights' },
  { id: 'no_outdoor_gfci',  label: 'No outdoor GFCI outlet', rooms: ['garage', 'exterior'] },
  { id: 'missing_covers',   label: 'Missing cover plates' },
]
```

- [ ] **Step 3: Add new fields to HomeInspection in types/index.ts**

Find the `HomeInspection` interface (around line 77) and add after `wiring_type`:

```typescript
  panel_brand: string | null
  service_size: number | null
  has_smoke: boolean
  smoke_count: number
  has_co: boolean
  has_outdoor_gfci: boolean
  room_flags: Record<string, string[]>
```

Also add `ChecklistItem` export after `HomeInspection`:

```typescript
export interface ChecklistItem {
  jobType: string
  description: string
  reason: string
  priority: 'critical' | 'important' | 'recommended'
  price: number | null
}
```

- [ ] **Step 4: Verify types compile**

```bash
cd volturaos && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only pre-existing errors unrelated to these files).

- [ ] **Step 5: Commit**

```bash
git add components/jobs/health-score/types.ts components/jobs/health-score/constants.ts types/index.ts
git commit -m "feat: add health score wizard types and constants"
```

---

## Task 2: Rewrite Server Action

**Files:**
- Modify: `lib/actions/inspections.ts`

The action gains new fields, a deduction-based scoring algorithm, pricebook price lookup, findings generation, and returns `InspectionResult` instead of `HomeInspection`.

- [ ] **Step 1: Replace inspections.ts entirely**

```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { HomeInspection, ChecklistItem } from '@/types'
import type { InspectionResult } from '@/components/jobs/health-score/types'
import { HAZARDOUS_BRANDS, HAZARDOUS_WIRING } from '@/components/jobs/health-score/constants'

export interface InspectionInput {
  customerId: string
  jobId?: string | null
  panelBrand: string
  serviceSize: number
  panelAge: number
  panelCondition: string
  hasAfci: boolean
  hasGfci: boolean
  hasSurge: boolean
  groundingOk: boolean
  wiringType: string
  hasSmoke: boolean
  smokeCount: number
  hasCo: boolean
  hasOutdoorGfci: boolean
  roomFlags: Record<string, string[]>
  notes: string
}

function calculateScore(input: InspectionInput): number {
  let score = 100

  // Panel brand — hazardous brands are a critical safety risk
  const isHazardousBrand = HAZARDOUS_BRANDS.has(input.panelBrand)
  if (isHazardousBrand) score -= 40

  // Wiring type
  if (HAZARDOUS_WIRING.has(input.wiringType)) score -= 25
  else if (input.wiringType === 'Aluminum') score -= 8

  // Panel condition
  if (input.panelCondition === 'Replace') score -= 20
  else if (input.panelCondition === 'Poor') score -= 10

  // Service size
  if (input.serviceSize <= 60) score -= 15

  // Panel age
  if (input.panelAge > 40) score -= 10
  else if (input.panelAge > 25) score -= 5

  // Safety features
  if (!input.hasGfci) score -= 15
  if (!input.hasAfci) score -= 10
  if (!input.hasSurge) score -= 5
  if (!input.hasSmoke) score -= 5
  if (!input.hasCo) score -= 3

  // Grounding
  if (!input.groundingOk) score -= 8

  // Flagged rooms (-2 each, max -10)
  const flaggedRoomCount = Object.values(input.roomFlags).filter(issues => issues.length > 0).length
  score -= Math.min(10, flaggedRoomCount * 2)

  // Bonuses for confirmed-present items
  if (input.hasSurge) score += 5
  if (input.hasSmoke) score += 5
  if (input.hasCo) score += 3

  // Hazardous brand caps max score at 55
  if (isHazardousBrand) score = Math.min(score, 55)

  return Math.min(100, Math.max(0, Math.round(score)))
}

interface ChecklistRule {
  condition: (input: InspectionInput) => boolean
  jobType: string
  description: string
  reason: string
  priority: 'critical' | 'important' | 'recommended'
}

const CHECKLIST_RULES: ChecklistRule[] = [
  {
    condition: (i) => HAZARDOUS_BRANDS.has(i.panelBrand),
    jobType: 'Panel Rejuvenation',
    description: 'Panel Replacement',
    reason: `${'{panelBrand}'} panels are a known fire hazard — replacement strongly recommended`,
    priority: 'critical',
  },
  {
    condition: (i) => i.serviceSize <= 60,
    jobType: 'Service Upgrade',
    description: 'Service Upgrade (60A → 200A)',
    reason: '60A service is undersized for modern electrical loads',
    priority: 'critical',
  },
  {
    condition: (i) => !i.hasSurge,
    jobType: 'Whole-Home Surge Protector',
    description: 'Whole-Home Surge Protector',
    reason: 'NEC 230.67 — required on all service installations',
    priority: 'critical',
  },
  {
    condition: (i) => !i.hasGfci,
    jobType: 'GFCI Outlet Installation',
    description: 'GFCI Outlet Installation',
    reason: 'NEC 210.8 — required in kitchens, bathrooms, garages, and outdoors',
    priority: 'critical',
  },
  {
    condition: (i) => HAZARDOUS_WIRING.has(i.wiringType),
    jobType: 'Dedicated Circuit (Romex)',
    description: 'Wiring Update (Knob-and-Tube)',
    reason: 'Knob-and-tube wiring is a fire hazard and uninsurable in most cases',
    priority: 'critical',
  },
  {
    condition: (i) => !i.hasAfci,
    jobType: 'AFCI Breaker Installation',
    description: 'AFCI Breaker Installation',
    reason: 'NEC 210.12 — required in all living spaces',
    priority: 'important',
  },
  {
    condition: (i) => !i.hasSmoke,
    jobType: 'Smoke Detector Installation',
    description: 'Smoke Detector Installation',
    reason: 'NFPA 72 — required on every level and outside sleeping areas',
    priority: 'important',
  },
  {
    condition: (i) => !i.hasCo,
    jobType: 'CO Detector Installation',
    description: 'CO Detector Installation',
    reason: 'Colorado state code — required in homes with gas appliances or attached garages',
    priority: 'important',
  },
  {
    condition: (i) => i.panelCondition === 'Poor' || i.panelCondition === 'Replace',
    jobType: 'Panel Rejuvenation',
    description: 'Panel Service / Rejuvenation',
    reason: `Panel condition is ${'{panelCondition}'} — maintenance or replacement needed`,
    priority: 'important',
  },
  {
    condition: (i) => Object.values(i.roomFlags).some(issues => issues.includes('no_exhaust_fan')),
    jobType: 'Bathroom Fan Installation (new)',
    description: 'Bathroom Exhaust Fan',
    reason: 'Missing exhaust ventilation — moisture damage and mold risk',
    priority: 'recommended',
  },
  {
    condition: (i) => !i.hasOutdoorGfci,
    jobType: 'Weatherproof Box Install',
    description: 'Outdoor GFCI Outlet',
    reason: 'NEC 210.8 — at least one outdoor GFCI required front and back',
    priority: 'recommended',
  },
]

async function buildChecklist(input: InspectionInput): Promise<ChecklistItem[]> {
  const admin = createAdminClient()
  const triggered = CHECKLIST_RULES.filter(rule => rule.condition(input))
  if (triggered.length === 0) return []

  // Deduplicate by jobType (e.g. panel rejuvenation can fire twice)
  const seen = new Set<string>()
  const unique = triggered.filter(rule => {
    if (seen.has(rule.jobType)) return false
    seen.add(rule.jobType)
    return true
  })

  // Bulk pricebook lookup
  const jobTypes = unique.map(r => r.jobType)
  const { data: pbRows } = await admin
    .from('pricebook')
    .select('job_type, price_good')
    .in('job_type', jobTypes)
    .eq('active', true)

  const priceMap = new Map<string, number>()
  for (const row of pbRows ?? []) {
    priceMap.set(row.job_type, row.price_good ?? 0)
  }

  return unique.map(rule => ({
    jobType: rule.jobType,
    description: rule.description
      .replace('{panelBrand}', input.panelBrand)
      .replace('{panelCondition}', input.panelCondition),
    reason: rule.reason
      .replace('{panelBrand}', input.panelBrand)
      .replace('{panelCondition}', input.panelCondition),
    priority: rule.priority,
    price: priceMap.get(rule.jobType) ?? null,
  }))
}

function buildFindings(
  input: InspectionInput,
  score: number
): { text: string; level: 'red' | 'yellow' | 'green' }[] {
  const findings: { text: string; level: 'red' | 'yellow' | 'green' }[] = []

  if (HAZARDOUS_BRANDS.has(input.panelBrand)) {
    findings.push({ text: `${input.panelBrand} panel — known fire hazard, replacement needed`, level: 'red' })
  }
  if (HAZARDOUS_WIRING.has(input.wiringType)) {
    findings.push({ text: 'Knob-and-tube wiring — significant fire and insurance risk', level: 'red' })
  }
  if (!input.hasGfci) findings.push({ text: 'No GFCI protection — code violation, shock hazard', level: 'red' })
  if (!input.hasSurge) findings.push({ text: 'No whole-home surge protector — NEC 230.67 required', level: 'red' })
  if (!input.hasAfci) findings.push({ text: 'No AFCI breakers — NEC 210.12 required in living spaces', level: 'yellow' })
  if (!input.hasSmoke) findings.push({ text: 'No smoke detectors — NFPA 72 compliance needed', level: 'yellow' })
  if (!input.hasCo) findings.push({ text: 'No CO detectors — required by Colorado state code', level: 'yellow' })
  if (input.panelAge > 40) findings.push({ text: `Panel is ${input.panelAge} years old — consider inspection or upgrade`, level: 'yellow' })

  if (score >= 80) {
    findings.push({ text: 'Panel brand, age, and condition look good', level: 'green' })
  }
  if (input.hasSurge && input.hasGfci && input.hasAfci) {
    findings.push({ text: 'All major code protection features present', level: 'green' })
  }

  // Cap at 5 findings, prioritize red then yellow then green
  return findings
    .sort((a, b) => {
      const order = { red: 0, yellow: 1, green: 2 }
      return order[a.level] - order[b.level]
    })
    .slice(0, 5)
}

export async function createInspection(input: InspectionInput): Promise<InspectionResult> {
  const admin = createAdminClient()
  const score = calculateScore(input)
  const checklist = await buildChecklist(input)
  const findings = buildFindings(input, score)

  const { data, error } = await admin
    .from('home_inspections')
    .insert({
      customer_id: input.customerId,
      job_id: input.jobId ?? null,
      score,
      panel_age: input.panelAge,
      panel_condition: input.panelCondition,
      panel_brand: input.panelBrand || null,
      service_size: input.serviceSize,
      has_afci: input.hasAfci,
      afci_rooms: 0,
      has_gfci: input.hasGfci,
      gfci_locations: 0,
      has_surge: input.hasSurge,
      grounding_ok: input.groundingOk,
      wiring_type: input.wiringType,
      has_smoke: input.hasSmoke,
      smoke_count: input.smokeCount,
      has_co: input.hasCo,
      has_outdoor_gfci: input.hasOutdoorGfci,
      room_flags: input.roomFlags,
      notes: input.notes || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return { inspectionId: (data as HomeInspection).id, score, checklist, findings }
}

export async function getInspectionsByCustomer(customerId: string): Promise<HomeInspection[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('home_inspections')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as HomeInspection[]
}
```

Note: The CHECKLIST_RULES use template literal placeholders `{panelBrand}` and `{panelCondition}` as plain string markers — the `.replace()` calls swap them at runtime.

- [ ] **Step 2: Add createEstimateFromChecklist to lib/actions/estimates.ts**

Add this function at the end of `lib/actions/estimates.ts`:

```typescript
export async function createEstimateFromChecklist(
  customerId: string,
  jobId: string | undefined,
  items: import('@/types').ChecklistItem[],
): Promise<string> {
  const admin = createAdminClient()

  const lineItems: LineItem[] = items.map(item => ({
    description: item.description,
    price: item.price ?? 0,
    is_override: false,
    original_price: item.price ?? 0,
    pricebook_description: item.reason,
  }))

  const total = lineItems.reduce((sum, li) => sum + li.price, 0)

  const { data, error } = await admin
    .from('estimates')
    .insert({
      customer_id: customerId,
      job_id: jobId ?? null,
      status: 'Draft',
      name: 'Electrical Health Score Estimate',
      tier_selected: null,
      line_items: lineItems,
      total,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id as string
}
```

- [ ] **Step 3: Verify types compile**

```bash
cd volturaos && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/inspections.ts lib/actions/estimates.ts
git commit -m "feat: rewrite inspection scoring with deduction model + checklist generation"
```

---

## Task 3: ScoreRing Component

**Files:**
- Create: `components/jobs/health-score/ScoreRing.tsx`

- [ ] **Step 1: Extract ScoreRing from existing HealthScore.tsx**

```typescript
// components/jobs/health-score/ScoreRing.tsx
'use client'

interface ScoreRingProps {
  score: number
}

export function ScoreRing({ score }: ScoreRingProps) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444'
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F'
  const r = 52
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#1e293b" strokeWidth="12" />
        <circle
          cx="64" cy="64" r={r} fill="none"
          stroke={color} strokeWidth="12"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 64 64)"
        />
        <text x="64" y="58" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold" fontFamily="sans-serif">{score}</text>
        <text x="64" y="78" textAnchor="middle" fill={color} fontSize="18" fontWeight="bold" fontFamily="sans-serif">{grade}</text>
      </svg>
      <p className="text-gray-400 text-xs">Electrical Health Score</p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/jobs/health-score/ScoreRing.tsx
git commit -m "feat: extract ScoreRing into health-score subfolder"
```

---

## Task 4: PanelStep

**Files:**
- Create: `components/jobs/health-score/PanelStep.tsx`

- [ ] **Step 1: Create PanelStep**

```typescript
// components/jobs/health-score/PanelStep.tsx
'use client'

import type { WizardState } from './types'
import { PANEL_BRANDS, HAZARDOUS_BRANDS, SERVICE_SIZES, PANEL_CONDITIONS } from './constants'

interface PanelStepProps {
  state: WizardState
  onChange: (updates: Partial<WizardState>) => void
  onNext: () => void
}

export function PanelStep({ state, onChange, onNext }: PanelStepProps) {
  const isHazardous = HAZARDOUS_BRANDS.has(state.panelBrand)

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto space-y-5 pb-4">

        {/* Brand */}
        <div>
          <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Panel Brand</label>
          <div className="flex flex-wrap gap-2">
            {PANEL_BRANDS.map(brand => {
              const hazard = HAZARDOUS_BRANDS.has(brand)
              const selected = state.panelBrand === brand
              return (
                <button
                  key={brand}
                  onClick={() => onChange({ panelBrand: brand })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    selected && hazard ? 'bg-red-500 text-white border-red-500' :
                    selected ? 'bg-volturaGold text-volturaBlue border-volturaGold' :
                    hazard ? 'border-red-500/60 text-red-400' :
                    'bg-white/5 text-gray-400 border-white/10'
                  }`}
                >
                  {hazard && '⚠ '}{brand}
                </button>
              )
            })}
          </div>
          {isHazardous && (
            <div className="mt-2 bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-red-400 text-xs font-semibold">Known fire hazard</p>
              <p className="text-gray-400 text-xs mt-0.5">{state.panelBrand} panels have a documented history of failure. Replacement is strongly recommended.</p>
            </div>
          )}
        </div>

        {/* Service size */}
        <div>
          <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Service Size</label>
          <div className="flex gap-2">
            {SERVICE_SIZES.map(size => (
              <button
                key={size}
                onClick={() => onChange({ serviceSize: size })}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  state.serviceSize === size
                    ? 'bg-volturaGold text-volturaBlue border-volturaGold'
                    : size === 60
                    ? 'bg-white/5 text-red-400 border-red-500/40'
                    : 'bg-white/5 text-gray-400 border-white/10'
                }`}
              >
                {size}A
              </button>
            ))}
          </div>
        </div>

        {/* Panel age */}
        <div>
          <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">
            Panel Age — {state.panelAge} yrs
          </label>
          <input
            type="range" min={1} max={60} value={state.panelAge}
            onChange={(e) => onChange({ panelAge: +e.target.value })}
            className="w-full accent-amber-400"
          />
        </div>

        {/* Condition */}
        <div>
          <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Condition</label>
          <div className="grid grid-cols-4 gap-2">
            {PANEL_CONDITIONS.map(c => (
              <button
                key={c}
                onClick={() => onChange({ panelCondition: c })}
                className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  state.panelCondition === c
                    ? 'bg-volturaGold text-volturaBlue border-volturaGold'
                    : c === 'Replace'
                    ? 'bg-white/5 text-red-400 border-red-500/40'
                    : 'bg-white/5 text-gray-400 border-white/10'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

      </div>

      <button
        onClick={onNext}
        disabled={!state.panelBrand}
        className="w-full bg-volturaGold text-volturaBlue font-bold py-3.5 rounded-xl text-sm mt-4 disabled:opacity-40"
      >
        Next →
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/jobs/health-score/PanelStep.tsx
git commit -m "feat: add PanelStep wizard component"
```

---

## Task 5: SafetyStep

**Files:**
- Create: `components/jobs/health-score/SafetyStep.tsx`

- [ ] **Step 1: Create SafetyStep**

```typescript
// components/jobs/health-score/SafetyStep.tsx
'use client'

import type { WizardState } from './types'
import { WIRING_TYPES, HAZARDOUS_WIRING } from './constants'

interface SafetyStepProps {
  state: WizardState
  onChange: (updates: Partial<WizardState>) => void
  onNext: () => void
  onBack: () => void
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-volturaGold' : 'bg-gray-700'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full mx-0.5 transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

const TOGGLES: { key: keyof WizardState; label: string; sub: string }[] = [
  { key: 'hasAfci',        label: 'AFCI Breakers',            sub: 'NEC 210.12' },
  { key: 'hasGfci',        label: 'GFCI Protection',          sub: 'NEC 210.8' },
  { key: 'hasSurge',       label: 'Whole-Home Surge',         sub: 'NEC 230.67' },
  { key: 'groundingOk',    label: 'Grounding System OK',      sub: 'NEC 250' },
  { key: 'hasSmoke',       label: 'Smoke Detectors',          sub: 'NFPA 72' },
  { key: 'hasCo',          label: 'CO Detectors',             sub: 'State code' },
  { key: 'hasOutdoorGfci', label: 'Outdoor GFCI Outlets',     sub: 'NEC 210.8' },
]

export function SafetyStep({ state, onChange, onNext, onBack }: SafetyStepProps) {
  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto space-y-1 pb-4">

        {TOGGLES.map(({ key, label, sub }) => (
          <div key={key} className="flex items-center justify-between py-3 border-b border-white/5">
            <div>
              <p className="text-white text-sm">{label}</p>
              <p className="text-gray-600 text-xs">{sub}</p>
            </div>
            <Toggle
              value={state[key] as boolean}
              onChange={(v) => onChange({ [key]: v })}
            />
          </div>
        ))}

        <div className="pt-3">
          <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Wiring Type</label>
          <div className="flex flex-wrap gap-2">
            {WIRING_TYPES.map(w => {
              const hazard = HAZARDOUS_WIRING.has(w)
              return (
                <button
                  key={w}
                  onClick={() => onChange({ wiringType: w })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    state.wiringType === w && hazard ? 'bg-red-500 text-white border-red-500' :
                    state.wiringType === w ? 'bg-volturaGold text-volturaBlue border-volturaGold' :
                    hazard ? 'border-red-500/60 text-red-400' :
                    'bg-white/5 text-gray-400 border-white/10'
                  }`}
                >
                  {hazard && '⚠ '}{w}
                </button>
              )
            })}
          </div>
        </div>

      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={onBack} className="px-4 py-3.5 rounded-xl text-sm text-gray-400 border border-white/10">← Back</button>
        <button onClick={onNext} className="flex-1 bg-volturaGold text-volturaBlue font-bold py-3.5 rounded-xl text-sm">Next →</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/jobs/health-score/SafetyStep.tsx
git commit -m "feat: add SafetyStep wizard component"
```

---

## Task 6: RoomIssueSheet + RoomsStep

**Files:**
- Create: `components/jobs/health-score/RoomIssueSheet.tsx`
- Create: `components/jobs/health-score/RoomsStep.tsx`

- [ ] **Step 1: Create RoomIssueSheet**

```typescript
// components/jobs/health-score/RoomIssueSheet.tsx
'use client'

import { BottomSheet } from '@/components/ui/BottomSheet'
import { ROOM_ISSUES, ROOMS } from './constants'

interface RoomIssueSheetProps {
  roomId: string | null
  flags: Record<string, string[]>
  onChange: (roomId: string, issues: string[]) => void
  onClose: () => void
}

export function RoomIssueSheet({ roomId, flags, onChange, onClose }: RoomIssueSheetProps) {
  if (!roomId) return null
  const room = ROOMS.find(r => r.id === roomId)
  const current = flags[roomId] ?? []
  const availableIssues = ROOM_ISSUES.filter(issue =>
    !issue.rooms || issue.rooms.includes(roomId)
  )

  function toggle(issueId: string) {
    const next = current.includes(issueId)
      ? current.filter(i => i !== issueId)
      : [...current, issueId]
    onChange(roomId, next)
  }

  return (
    <BottomSheet open={!!roomId} onClose={onClose} title={`${room?.icon} ${room?.label}`}>
      <div className="space-y-2 pb-4">
        <p className="text-gray-500 text-xs mb-3">Tap any issues found in this room</p>
        {availableIssues.map(issue => {
          const selected = current.includes(issue.id)
          return (
            <button
              key={issue.id}
              onClick={() => toggle(issue.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                selected
                  ? 'bg-orange-900/20 border-orange-500/40 text-orange-400'
                  : 'bg-white/5 border-white/10 text-gray-300'
              }`}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                selected ? 'bg-orange-500 border-orange-500' : 'border-gray-600'
              }`}>
                {selected && <span className="text-white text-xs">✓</span>}
              </div>
              <span className="text-sm">{issue.label}</span>
            </button>
          )
        })}
        {current.length > 0 && (
          <button
            onClick={() => onChange(roomId, [])}
            className="w-full text-xs text-gray-500 py-2"
          >
            Clear all issues
          </button>
        )}
      </div>
    </BottomSheet>
  )
}
```

- [ ] **Step 2: Create RoomsStep**

```typescript
// components/jobs/health-score/RoomsStep.tsx
'use client'

import { useState } from 'react'
import type { WizardState } from './types'
import { ROOMS } from './constants'
import { RoomIssueSheet } from './RoomIssueSheet'

interface RoomsStepProps {
  state: WizardState
  onChange: (updates: Partial<WizardState>) => void
  onNext: () => void
  onBack: () => void
}

export function RoomsStep({ state, onChange, onNext, onBack }: RoomsStepProps) {
  const [openRoom, setOpenRoom] = useState<string | null>(null)

  function handleRoomIssues(roomId: string, issues: string[]) {
    const next = { ...state.roomFlags }
    if (issues.length === 0) {
      delete next[roomId]
    } else {
      next[roomId] = issues
    }
    onChange({ roomFlags: next })
  }

  const flaggedCount = Object.keys(state.roomFlags).length

  return (
    <div className="flex flex-col flex-1">
      <p className="text-gray-500 text-xs mb-3">Tap any room to flag issues found during walkthrough</p>

      <div className="flex-1 grid grid-cols-2 gap-2 content-start pb-4">
        {ROOMS.map(room => {
          const issues = state.roomFlags[room.id] ?? []
          const flagged = issues.length > 0
          return (
            <button
              key={room.id}
              onClick={() => setOpenRoom(room.id)}
              className={`rounded-xl p-3 text-left border transition-colors ${
                flagged
                  ? 'bg-orange-900/20 border-orange-500/40'
                  : 'bg-volturaNavy/30 border-white/5'
              }`}
            >
              <span className="text-2xl block mb-1">{room.icon}</span>
              <p className={`text-xs font-semibold ${flagged ? 'text-orange-400' : 'text-white'}`}>
                {room.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {flagged ? `${issues.length} issue${issues.length > 1 ? 's' : ''}` : 'No issues'}
              </p>
            </button>
          )
        })}
      </div>

      {flaggedCount > 0 && (
        <p className="text-orange-400 text-xs text-center mb-2">{flaggedCount} room{flaggedCount > 1 ? 's' : ''} flagged</p>
      )}

      <div className="flex gap-2 mt-2">
        <button onClick={onBack} className="px-4 py-3.5 rounded-xl text-sm text-gray-400 border border-white/10">← Back</button>
        <button onClick={onNext} className="flex-1 bg-volturaGold text-volturaBlue font-bold py-3.5 rounded-xl text-sm">
          Calculate Score →
        </button>
      </div>

      <RoomIssueSheet
        roomId={openRoom}
        flags={state.roomFlags}
        onChange={handleRoomIssues}
        onClose={() => setOpenRoom(null)}
      />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/jobs/health-score/RoomIssueSheet.tsx components/jobs/health-score/RoomsStep.tsx
git commit -m "feat: add RoomsStep and RoomIssueSheet components"
```

---

## Task 7: ScoreStep

**Files:**
- Create: `components/jobs/health-score/ScoreStep.tsx`

- [ ] **Step 1: Create ScoreStep**

```typescript
// components/jobs/health-score/ScoreStep.tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add components/jobs/health-score/ScoreStep.tsx
git commit -m "feat: add ScoreStep wizard component"
```

---

## Task 8: ChecklistStep

**Files:**
- Create: `components/jobs/health-score/ChecklistStep.tsx`

- [ ] **Step 1: Create ChecklistStep**

```typescript
// components/jobs/health-score/ChecklistStep.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createEstimateFromChecklist } from '@/lib/actions/estimates'
import type { ChecklistItem } from '@/types'

interface ChecklistStepProps {
  customerId: string
  jobId?: string
  checklist: ChecklistItem[]
  onBack: () => void
}

const PRIORITY_CONFIG = {
  critical:    { label: '⚠ Critical',    color: 'text-red-400' },
  important:   { label: '→ Important',   color: 'text-yellow-400' },
  recommended: { label: '✓ Recommended', color: 'text-green-400' },
} as const

export function ChecklistStep({ customerId, jobId, checklist, onBack }: ChecklistStepProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(
    new Set(checklist.filter(i => i.priority === 'critical').map(i => i.jobType))
  )
  const [isPending, startTransition] = useTransition()

  function toggle(jobType: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(jobType) ? next.delete(jobType) : next.add(jobType)
      return next
    })
  }

  const selectedItems = checklist.filter(i => selected.has(i.jobType))
  const total = selectedItems.reduce((sum, i) => sum + (i.price ?? 0), 0)

  function handleCreate() {
    startTransition(async () => {
      const id = await createEstimateFromChecklist(customerId, jobId, selectedItems)
      router.push(`/estimates/${id}`)
    })
  }

  const priorities: ('critical' | 'important' | 'recommended')[] = ['critical', 'important', 'recommended']

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto pb-4">
        {priorities.map(priority => {
          const items = checklist.filter(i => i.priority === priority)
          if (items.length === 0) return null
          const config = PRIORITY_CONFIG[priority]
          return (
            <div key={priority}>
              <p className={`text-xs font-bold uppercase tracking-wider py-2 ${config.color}`}>
                {config.label}
              </p>
              {items.map(item => (
                <button
                  key={item.jobType}
                  onClick={() => toggle(item.jobType)}
                  className="w-full flex items-center gap-3 py-3 border-b border-white/5"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    selected.has(item.jobType)
                      ? 'bg-volturaGold border-volturaGold'
                      : 'border-gray-600'
                  }`}>
                    {selected.has(item.jobType) && <span className="text-volturaBlue text-xs font-bold">✓</span>}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white text-sm">{item.description}</p>
                    <p className="text-gray-500 text-xs">{item.reason}</p>
                  </div>
                  <p className="text-volturaGold text-sm font-semibold shrink-0">
                    {item.price != null ? `$${item.price.toLocaleString()}` : '—'}
                  </p>
                </button>
              ))}
            </div>
          )
        })}
      </div>

      {selected.size > 0 && (
        <p className="text-center text-gray-500 text-xs mb-2">
          {selected.size} item{selected.size > 1 ? 's' : ''} selected · Est. ${total.toLocaleString()}
        </p>
      )}

      <div className="space-y-2">
        <button
          onClick={handleCreate}
          disabled={selected.size === 0 || isPending}
          className="w-full bg-volturaGold text-volturaBlue font-bold py-3.5 rounded-xl text-sm disabled:opacity-40"
        >
          {isPending ? 'Creating…' : `Create Estimate →`}
        </button>
        <button onClick={onBack} className="w-full text-gray-500 text-sm py-2">← Back to Score</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/jobs/health-score/ChecklistStep.tsx
git commit -m "feat: add ChecklistStep with estimate creation"
```

---

## Task 9: HealthScoreWizard + Updated HealthScore Entry

**Files:**
- Create: `components/jobs/HealthScoreWizard.tsx`
- Modify: `components/jobs/HealthScore.tsx`

- [ ] **Step 1: Create HealthScoreWizard**

```typescript
// components/jobs/HealthScoreWizard.tsx
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

        {/* Step progress */}
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
        <div className="flex-1 overflow-hidden flex flex-col px-5 py-4">
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
```

- [ ] **Step 2: Rewrite HealthScore.tsx to use the wizard**

Replace the entire content of `components/jobs/HealthScore.tsx`:

```typescript
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
```

- [ ] **Step 3: Verify types compile**

```bash
cd volturaos && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/jobs/HealthScoreWizard.tsx components/jobs/HealthScore.tsx
git commit -m "feat: wire up HealthScoreWizard — complete 5-step health score flow"
```

---

## Task 10: SQL Migration File

**Files:**
- Create: `scripts/add-health-score-columns.sql`

- [ ] **Step 1: Save the migration for the record**

```sql
-- Add new fields to home_inspections for health score revamp
-- Run in Supabase SQL Editor
ALTER TABLE home_inspections
  ADD COLUMN IF NOT EXISTS panel_brand      text,
  ADD COLUMN IF NOT EXISTS service_size     integer,
  ADD COLUMN IF NOT EXISTS has_smoke        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS smoke_count      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_co           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_outdoor_gfci boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS room_flags       jsonb   NOT NULL DEFAULT '{}';
```

- [ ] **Step 2: Commit**

```bash
git add scripts/add-health-score-columns.sql
git commit -m "chore: add health score DB migration script"
```

---

## Manual Test Checklist

After all tasks complete, test these flows on the job page:

- [ ] Tap "Electrical Health Score" button — wizard opens
- [ ] Step 1: Select "FPE / Stab-Lok" — red warning banner appears; score should tank
- [ ] Step 1: Select normal brand + 200A + Good — proceed to Step 2
- [ ] Step 2: Toggle all off — proceed to Step 3
- [ ] Step 3: Tap Kitchen — issue sheet opens; check "No GFCI"; tile turns orange
- [ ] Tap "Calculate Score" — loading state shows, then score step appears
- [ ] Score ring animates; findings list shows; "See Upgrade Plan" button appears
- [ ] Tap "See Upgrade Plan" — checklist shows with Critical items pre-checked
- [ ] Tap "Create Estimate" — redirects to estimate editor with line items pre-loaded
- [ ] Repeat with a clean home (all toggles on, no room issues) — score should be 90+
