# Electrical Health Score Revamp — Design Spec

## Overview

Replace the current single-scroll modal with a 5-step wizard that guides Devon through a full on-site electrical walkthrough. Output is a scored report with a prioritized upgrade checklist that maps directly to pricebook items and can generate an estimate in one tap or be shared with the customer.

---

## Goals

1. **More fields** — panel brand with hazard flags, service size, smoke/CO detectors, outdoor GFCI, per-room issue tracking
2. **Better scoring** — start-at-100 deduction model weighted by real safety risk; hazardous brands and knob-and-tube cause severe drops
3. **Prioritized checklist** — findings auto-map to pricebook job types grouped as Critical / Important / Recommended
4. **Estimate generation** — select items from checklist → one button creates a draft estimate
5. **Customer-facing** — "Share Report" button on final screen (Phase 2: public URL; for now, copy-able summary)

---

## Wizard Steps

### Step 1 — Panel
Fields:
- `panel_brand` — chip selector: Square D, Eaton, Leviton, Siemens, GE, Other, FPE/Stab-Lok ⚠, Zinsco ⚠, Pushmatic ⚠, Split-Bus ⚠
  - Hazardous brands render in red; selecting one shows inline warning banner
- `service_size` — chip selector: 60A, 100A, 150A, 200A, 400A
- `panel_age` — range slider 1–60 years
- `panel_condition` — chip selector: Good / Fair / Poor / Replace

### Step 2 — Safety Features
Toggle rows (label + NEC ref + on/off):
- AFCI Breakers — NEC 210.12
- GFCI Protection — NEC 210.8
- Whole-Home Surge Protector — NEC 230.67
- Grounding System OK — NEC 250
- Smoke Detectors — NFPA 72
- CO Detectors — state code

Wiring type chip selector: Copper / Copper+Aluminum / Aluminum / Knob-and-Tube ⚠ / Mixed

### Step 3 — Room Walkthrough
Room tiles in a 2-column grid. Rooms: Kitchen, Bathroom 1, Bathroom 2, Bedroom 1, Bedroom 2, Bedroom 3, Garage, Basement, Exterior.

Tapping a room opens a `RoomIssueSheet` (bottom sheet) with checkboxes:
- No GFCI outlets
- Outdated/damaged outlets
- No exhaust fan (bathrooms)
- Flickering or failing lights
- No outdoor GFCI outlet (exterior/garage)
- Missing cover plates

Flagged rooms show orange border and summary of issues on the tile.

### Step 4 — Score
- `ScoreRing` SVG (existing component, reused)
- Score number + letter grade (A ≥90, B ≥80, C ≥70, D ≥60, F <60)
- 3–5 key findings as bullet list, color-coded red/yellow/green
- Two CTAs: "See Upgrade Plan →" and "Save Only"

### Step 5 — Checklist & Estimate
- Findings grouped: ⚠ Critical → → Important → ✓ Recommended
- Each item: checkbox, job description, NEC/reason note, price from pricebook
- Running total of selected items shown at bottom
- "Create Estimate →" — creates draft estimate with selected items pre-loaded, navigates to estimate builder
- "Share Report with Customer" — Phase 2 (deferred); for now shows a read-only summary sheet

---

## Scoring Algorithm

Start at 100. Apply deductions in order. Clamp result to 0–100.

| Condition | Deduction | Notes |
|---|---|---|
| Hazardous panel brand (FPE/Stab-Lok, Zinsco, Pushmatic, Split-Bus) | −40 | Also caps maximum achievable score at 55 |
| Knob-and-tube wiring | −25 | |
| Panel condition = Replace | −20 | |
| No GFCI protection | −15 | |
| 60A service | −15 | |
| Panel condition = Poor | −10 | |
| No AFCI breakers | −10 | |
| Panel age > 40 years | −10 | |
| Aluminum wiring | −8 | |
| Panel age 25–40 years | −5 | |
| No whole-home surge protector | −5 | |
| No smoke detectors | −5 | |
| No CO detectors | −3 | |
| Each flagged room | −2 each | Max −10 total |

Bonuses (applied after deductions):
- Surge protector present: +5
- Smoke detectors present: +5
- CO detectors present: +3

Hazardous brand cap: if panel_brand is in the hazardous set, `score = Math.min(score, 55)` after all calculations.

---

## Checklist → Pricebook Mapping

Each finding maps to a `job_type` string. The action does a case-insensitive `ilike` lookup in the pricebook at save time and stores the matched price. If no match is found, price is stored as `null` and the UI shows "—" with a note to set price in Settings.

| Finding | job_type lookup | Priority |
|---|---|---|
| Hazardous panel brand | `Panel Rejuvenation` | Critical |
| 60A service | `Service Upgrade` | Critical |
| No surge protector | `Whole-Home Surge Protector` | Critical |
| No GFCI (per flagged room) | `GFCI Outlet Installation` | Critical |
| Knob-and-tube wiring | `Dedicated Circuit (Romex)` | Critical |
| No AFCI | `AFCI Breaker Installation` | Important |
| No smoke detectors | `Smoke Detector Installation` | Important |
| No CO detectors | `CO Detector Installation` | Important |
| Panel condition Poor/Replace | `Panel Rejuvenation` | Important |
| Flagged room — no exhaust fan | `Bathroom Fan Installation (new)` | Recommended |
| No outdoor GFCI | `Weatherproof Box Install` | Recommended |

---

## Data Model

### New columns on `home_inspections`

```sql
ALTER TABLE home_inspections
  ADD COLUMN panel_brand        text,
  ADD COLUMN service_size       integer,
  ADD COLUMN has_smoke          boolean NOT NULL DEFAULT false,
  ADD COLUMN smoke_count        integer NOT NULL DEFAULT 0,
  ADD COLUMN has_co             boolean NOT NULL DEFAULT false,
  ADD COLUMN has_outdoor_gfci   boolean NOT NULL DEFAULT false,
  ADD COLUMN room_flags         jsonb   NOT NULL DEFAULT '{}';
```

`room_flags` shape:
```json
{
  "kitchen": ["no_gfci", "old_outlets"],
  "bathroom_1": ["no_exhaust_fan"],
  "garage": ["no_gfci", "no_outdoor_outlet"]
}
```

### Updated `InspectionInput` type

```typescript
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
```

---

## Component Structure

```
components/jobs/
  HealthScore.tsx              — entry point button; opens wizard; unchanged API
  HealthScoreWizard.tsx        — step state machine, renders active step
  health-score/
    PanelStep.tsx
    SafetyStep.tsx
    RoomsStep.tsx
    ScoreStep.tsx
    ChecklistStep.tsx
    RoomIssueSheet.tsx         — bottom sheet for per-room issue selection
    ScoreRing.tsx              — extracted from current HealthScore.tsx (no changes)
    types.ts                   — WizardState, ChecklistItem interfaces
```

---

## Architecture Notes

- All wizard state lives in `HealthScoreWizard.tsx` — steps receive state slices + setter callbacks as props
- Server action `createInspection()` extended with new fields; scoring function rewritten entirely
- Checklist generation happens in the server action: after scoring, build `ChecklistItem[]` from findings, look up pricebook prices, return alongside score
- "Create Estimate" navigates to `/estimates/new?customerId=X` with line items pre-encoded in query params (same pattern as other estimate entry points)
- Room tiles and issue checkboxes are data-driven from a constant `ROOMS` array — adding a new room or issue type is a one-line config change
- No new DB tables; new columns are nullable so existing inspection records remain valid

---

## What's Deferred

- Public shareable report URL (`/inspections/[id]/report`) — Phase 2
- PDF export of the health report — Phase 2
- Historical score trend chart on customer profile — Phase 2
