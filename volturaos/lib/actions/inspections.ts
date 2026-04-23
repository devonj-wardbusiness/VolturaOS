'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { HomeInspection, InspectionChecklistItem } from '@/types'
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

  const isHazardousBrand = HAZARDOUS_BRANDS.has(input.panelBrand)
  if (isHazardousBrand) score -= 40

  if (HAZARDOUS_WIRING.has(input.wiringType)) score -= 25
  else if (input.wiringType === 'Aluminum') score -= 8

  if (input.panelCondition === 'Replace') score -= 20
  else if (input.panelCondition === 'Poor') score -= 10

  if (input.serviceSize <= 60) score -= 15

  if (input.panelAge > 40) score -= 10
  else if (input.panelAge > 25) score -= 5

  if (!input.hasGfci) score -= 15
  if (!input.hasAfci) score -= 10
  if (!input.hasSurge) score -= 5
  if (!input.hasSmoke) score -= 5
  if (!input.hasCo) score -= 3

  if (!input.groundingOk) score -= 8

  const flaggedRoomCount = Object.values(input.roomFlags).filter(issues => issues.length > 0).length
  score -= Math.min(10, flaggedRoomCount * 2)

  if (input.hasSurge) score += 5
  if (input.hasSmoke) score += 5
  if (input.hasCo) score += 3

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
    jobType: '42 Circuit Panel Rejuvenation',
    description: 'Panel Replacement',
    reason: `{panelBrand} panels are a known fire hazard — replacement strongly recommended`,
    priority: 'critical',
  },
  {
    condition: (i) => i.serviceSize <= 60,
    jobType: '200A Service Upgrade',
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
    jobType: 'GFCI Outlet — 20A',
    description: 'GFCI Outlet Installation',
    reason: 'NEC 210.8 — required in kitchens, bathrooms, garages, and outdoors',
    priority: 'critical',
  },
  {
    condition: (i) => HAZARDOUS_WIRING.has(i.wiringType),
    jobType: '15-20 Amp Dedicated Up To 30 Ft.',
    description: 'Wiring Update (Knob-and-Tube)',
    reason: 'Knob-and-tube wiring is a fire hazard and uninsurable in most cases',
    priority: 'critical',
  },
  {
    condition: (i) => !i.hasAfci,
    jobType: 'AFCI Breaker — Single Pole 20A',
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
    jobType: '20 Circuit Panel Rejuvenation',
    description: 'Panel Service / Rejuvenation',
    reason: `Panel condition is {panelCondition} — maintenance or replacement needed`,
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

async function buildChecklist(input: InspectionInput): Promise<InspectionChecklistItem[]> {
  const admin = createAdminClient()
  const triggered = CHECKLIST_RULES.filter(rule => rule.condition(input))
  if (triggered.length === 0) return []

  const seen = new Set<string>()
  const unique = triggered.filter(rule => {
    if (seen.has(rule.jobType)) return false
    seen.add(rule.jobType)
    return true
  })

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
