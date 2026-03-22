'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { sendTelegram } from '@/lib/telegram'
import { syncToSheets } from '@/lib/sheets'
import type { Estimate, EstimateStatus, LineItem, Addon } from '@/types'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
}

export async function createEstimate(input: {
  customerId: string
  jobId?: string
}): Promise<Estimate> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('estimates')
    .insert({ customer_id: input.customerId, job_id: input.jobId ?? null, status: 'Draft' })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Estimate
}

export async function saveEstimate(id: string, updates: {
  tierSelected?: string
  lineItems?: LineItem[]
  addons?: Addon[]
  subtotal?: number
  total?: number
  notes?: string
}): Promise<Estimate> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('estimates')
    .update({
      tier_selected: updates.tierSelected,
      line_items: updates.lineItems,
      addons: updates.addons,
      subtotal: updates.subtotal,
      total: updates.total,
      notes: updates.notes,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Estimate
}

export async function updateEstimateStatus(id: string, status: EstimateStatus): Promise<void> {
  await requireAuth()
  const admin = createAdminClient()
  const now = new Date().toISOString()
  const update: Record<string, unknown> = { status }
  if (status === 'Sent') update.sent_at = now
  if (status === 'Viewed') update.viewed_at = now
  if (status === 'Approved') update.approved_at = now
  if (status === 'Declined') update.declined_at = now

  const { data, error } = await admin
    .from('estimates')
    .update(update)
    .eq('id', id)
    .select('*, customers(name), jobs(job_type)')
    .single()
  if (error) throw new Error(error.message)

  const est = data as Record<string, unknown>
  const customers = est.customers as Record<string, unknown> | null
  const jobs = est.jobs as Record<string, unknown> | null
  const customerName = (customers?.name as string) ?? 'Unknown'
  const jobType = (jobs?.job_type as string) ?? 'Service'
  const total = (est.total as number) ?? 0

  if (status === 'Sent') void sendTelegram(`Estimate sent to ${customerName} — ${jobType} — $${total.toLocaleString()}`)
  if (status === 'Approved') void sendTelegram(`ESTIMATE APPROVED: ${customerName} — ${jobType} — $${total.toLocaleString()} — CLOSE IT!`)
  if (status === 'Declined') void sendTelegram(`Estimate declined: ${customerName} — ${jobType} — $${total.toLocaleString()}`)

  void syncToSheets('Estimates', { Timestamp: now, EstimateID: id, CustomerName: customerName, JobType: jobType, Total: total, Status: status })
}

export async function getEstimateById(id: string): Promise<Estimate & { customer: { name: string; phone: string | null; id: string } }> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin.from('estimates').select('*, customers(id, name, phone)').eq('id', id).single()
  if (error) throw new Error(error.message)
  const { customers, ...estimate } = data as Record<string, unknown>
  return { ...estimate, customer: customers } as Estimate & { customer: { name: string; phone: string | null; id: string } }
}

export async function getPublicEstimate(id: string): Promise<(Estimate & { customer: { name: string; phone: string | null } }) | null> {
  const admin = createAdminClient()
  const { data, error } = await admin.from('estimates').select('*, customers(name, phone)').eq('id', id).single()
  if (error || !data) return null
  const row = data as Record<string, unknown>
  const allowedStatuses: EstimateStatus[] = ['Sent', 'Viewed', 'Approved', 'Declined']
  if (!allowedStatuses.includes(row.status as EstimateStatus)) return null
  if (row.status === 'Sent') {
    await admin.from('estimates').update({ status: 'Viewed', viewed_at: new Date().toISOString() }).eq('id', id)
    row.status = 'Viewed'
  }
  const { customers, ...estimate } = row
  return { ...estimate, customer: customers } as Estimate & { customer: { name: string; phone: string | null } }
}

export async function listEstimates(): Promise<(Estimate & { customer: { name: string } })[]> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin.from('estimates').select('*, customers(name)').order('created_at', { ascending: false }).limit(100)
  if (error) throw new Error(error.message)
  return (data as Record<string, unknown>[]).map(({ customers, ...e }) => ({ ...e, customer: customers })) as (Estimate & { customer: { name: string } })[]
}
