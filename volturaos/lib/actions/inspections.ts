'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { HomeInspection } from '@/types'

export interface InspectionInput {
  customerId: string
  jobId?: string | null
  panelAge: number
  panelCondition: string
  hasAfci: boolean
  afciRooms: number
  hasGfci: boolean
  gfciLocations: number
  hasSurge: boolean
  groundingOk: boolean
  wiringType: string
  notes: string
}

function calculateScore(input: InspectionInput): number {
  let score = 0

  // Panel condition (0–25)
  const panelPoints: Record<string, number> = { Good: 25, Fair: 15, Poor: 5, Replace: 0 }
  score += panelPoints[input.panelCondition] ?? 10
  // Age deduction
  if (input.panelAge > 40) score = Math.max(0, score - 10)
  else if (input.panelAge > 25) score = Math.max(0, score - 5)

  // AFCI (0–20)
  if (input.hasAfci) {
    score += Math.min(20, Math.round((input.afciRooms / 10) * 20))
  }

  // GFCI (0–20)
  if (input.hasGfci) {
    score += Math.min(20, Math.round((input.gfciLocations / 8) * 20))
  }

  // Surge protection (0–15)
  if (input.hasSurge) score += 15

  // Grounding (0–10)
  if (input.groundingOk) score += 10

  // Wiring type (0–10)
  const wiringPoints: Record<string, number> = {
    Copper: 10, 'Copper/Aluminum': 7, Aluminum: 4, 'Knob-and-Tube': 0, Mixed: 5,
  }
  score += wiringPoints[input.wiringType] ?? 5

  return Math.min(100, Math.max(0, score))
}

export async function createInspection(input: InspectionInput): Promise<HomeInspection> {
  const admin = createAdminClient()
  const score = calculateScore(input)

  const { data, error } = await admin
    .from('home_inspections')
    .insert({
      customer_id: input.customerId,
      job_id: input.jobId ?? null,
      score,
      panel_age: input.panelAge,
      panel_condition: input.panelCondition,
      has_afci: input.hasAfci,
      afci_rooms: input.afciRooms,
      has_gfci: input.hasGfci,
      gfci_locations: input.gfciLocations,
      has_surge: input.hasSurge,
      grounding_ok: input.groundingOk,
      wiring_type: input.wiringType,
      notes: input.notes || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as HomeInspection
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
