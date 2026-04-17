'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegram } from '@/lib/telegram'
import type { ChangeOrder, LineItem } from '@/types'

export async function createChangeOrder(
  jobId: string,
  estimateId: string
): Promise<ChangeOrder> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('change_orders')
    .insert({ job_id: jobId, estimate_id: estimateId, status: 'Draft' })
    .select()
    .single()
  if (error) throw new Error(error.message)

  // Fetch job/customer for Telegram
  const { data: jobData } = await admin
    .from('jobs')
    .select('job_type, customers(name)')
    .eq('id', jobId)
    .single()
  const custName = (jobData?.customers as unknown as Record<string, unknown> | null)?.name as string ?? 'Unknown'
  void sendTelegram(`📋 Change order created — ${custName} — ${jobData?.job_type ?? ''}`)

  return data as ChangeOrder
}

export async function updateChangeOrderItems(
  id: string,
  lineItems: LineItem[],
  total: number
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('change_orders')
    .update({ line_items: lineItems, total })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function signChangeOrder(
  id: string,
  signatureData: string
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('change_orders')
    .update({ signature_data: signatureData, status: 'Signed' })
    .eq('id', id)
  if (error) throw new Error(error.message)

  // Fetch for Telegram
  const { data: co } = await admin
    .from('change_orders')
    .select('total, jobs(job_type, customers(name))')
    .eq('id', id)
    .single()
  const job = co?.jobs as unknown as Record<string, unknown> | null
  const custName = (job?.customers as unknown as Record<string, unknown> | null)?.name as string ?? 'Unknown'
  void sendTelegram(`✅ Change order signed — ${custName} — $${(co?.total as number)?.toLocaleString()}`)
}

export async function getChangeOrder(id: string): Promise<ChangeOrder & {
  job: { id: string; job_type: string; customer_id: string }
  customer: { name: string; address: string | null }
  originalEstimate: { line_items: LineItem[] | null; total: number; name: string } | null
}> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('change_orders')
    .select('*, jobs(id, job_type, customer_id, customers(name, address)), estimates(line_items, total, name)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  const { jobs: jobData, estimates: estData, ...co } = data as Record<string, unknown>
  const job = jobData as { id: string; job_type: string; customer_id: string; customers: { name: string; address: string | null } }
  return {
    ...(co as unknown as ChangeOrder),
    job: { id: job.id, job_type: job.job_type, customer_id: job.customer_id },
    customer: job.customers,
    originalEstimate: estData as { line_items: LineItem[] | null; total: number; name: string } | null,
  }
}

export async function listChangeOrdersForJob(jobId: string): Promise<ChangeOrder[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('change_orders')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as ChangeOrder[]
}
