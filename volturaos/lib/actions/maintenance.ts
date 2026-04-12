'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { MaintenancePlan } from '@/types'

export interface MaintenancePlanInput {
  customerId: string
  planName: string
  startDate: string
  nextDue: string
  price: number
  notes?: string | null
}

export async function createMaintenancePlan(input: MaintenancePlanInput): Promise<MaintenancePlan> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('maintenance_plans')
    .insert({
      customer_id: input.customerId,
      plan_name: input.planName,
      start_date: input.startDate,
      next_due: input.nextDue,
      price: input.price,
      status: 'Active',
      notes: input.notes ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as MaintenancePlan
}

export async function getMaintenancePlansByCustomer(customerId: string): Promise<MaintenancePlan[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('maintenance_plans')
    .select('*')
    .eq('customer_id', customerId)
    .order('next_due', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as MaintenancePlan[]
}

export async function getAllActivePlans(): Promise<(MaintenancePlan & { customers: { name: string; phone: string | null } })[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('maintenance_plans')
    .select('*, customers(name, phone)')
    .eq('status', 'Active')
    .order('next_due', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as (MaintenancePlan & { customers: { name: string; phone: string | null } })[]
}

export async function updateMaintenancePlan(
  planId: string,
  updates: Partial<{ status: string; next_due: string; notes: string | null }>
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('maintenance_plans')
    .update(updates)
    .eq('id', planId)
  if (error) throw new Error(error.message)
}

export async function cancelMaintenancePlan(planId: string): Promise<void> {
  await updateMaintenancePlan(planId, { status: 'Cancelled' })
}
