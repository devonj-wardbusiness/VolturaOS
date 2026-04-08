'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { sendTelegram } from '@/lib/telegram'
import { sendJobScheduledSMS, sendOnMyWaySMS, sendJobCompleteSMS } from '@/lib/sms'
import { syncToSheets } from '@/lib/sheets'
import type { Job, JobStatus } from '@/types'

async function requireAuth() { // auth disabled
  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user) redirect("/login")
}

export async function createJob(input: {
  customerId: string
  jobType: string
  scheduledDate?: string
  scheduledTime?: string
  notes?: string
}): Promise<Job> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin.from('jobs').insert({
    customer_id: input.customerId,
    job_type: input.jobType,
    scheduled_date: input.scheduledDate ?? null,
    scheduled_time: input.scheduledTime ?? null,
    notes: input.notes ?? null,
    status: input.scheduledDate ? 'Scheduled' : 'Lead',
  }).select().single()
  if (error) throw new Error(error.message)

  // Send scheduled SMS if job has a date
  if (input.scheduledDate) {
    const { data: customer } = await admin
      .from('customers')
      .select('phone, sms_opt_out')
      .eq('id', input.customerId)
      .single()
    if (customer) {
      void sendJobScheduledSMS(
        customer.phone as string | null,
        (customer.sms_opt_out as boolean) ?? true,
        input.scheduledDate,
        input.scheduledTime ?? null
      )
    }
  }

  return data as Job
}

export async function listJobs(filters?: {
  status?: JobStatus
  customerId?: string
}): Promise<(Job & { customer: { name: string } })[]> {
  await requireAuth()
  const admin = createAdminClient()
  let query = admin
    .from('jobs')
    .select('*, customers(name)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.customerId) query = query.eq('customer_id', filters.customerId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as Record<string, unknown>[]).map(({ customers, ...j }) => ({
    ...j, customer: customers,
  })) as (Job & { customer: { name: string } })[]
}

export async function getJobById(id: string): Promise<Job & { customer: { id: string; name: string; phone: string | null; address: string | null } }> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('jobs')
    .select('*, customers(id, name, phone, address)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  const { customers, ...job } = data as Record<string, unknown>
  return { ...job, customer: customers } as Job & { customer: { id: string; name: string; phone: string | null; address: string | null } }
}

export async function updateJob(id: string, updates: {
  jobType?: string
  scheduledDate?: string | null
  scheduledTime?: string | null
  notes?: string | null
}): Promise<void> {
  await requireAuth()
  const admin = createAdminClient()
  const payload: Record<string, unknown> = {}
  if (updates.jobType !== undefined) payload.job_type = updates.jobType
  if (updates.scheduledDate !== undefined) payload.scheduled_date = updates.scheduledDate
  if (updates.scheduledTime !== undefined) payload.scheduled_time = updates.scheduledTime
  if (updates.notes !== undefined) payload.notes = updates.notes
  const { error } = await admin.from('jobs').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateJobStatus(id: string, status: JobStatus): Promise<void> {
  await requireAuth()
  const admin = createAdminClient()
  const update: Record<string, unknown> = { status }
  if (status === 'Completed') update.completed_at = new Date().toISOString()

  const { error } = await admin.from('jobs').update(update).eq('id', id)
  if (error) throw new Error(error.message)

  // Fetch job details for notifications
  const { data } = await admin.from('jobs').select('job_type, customers(name, phone, sms_opt_out)').eq('id', id).single()
  if (data) {
    const customers = data.customers as unknown as Record<string, unknown> | null
    const customerName = (customers?.name as string) ?? 'Unknown'
    const jobType = data.job_type as string

    if (status === 'In Progress') {
      void sendTelegram(`🔧 Job started: ${customerName} — ${jobType}`)
      const phone = (customers?.phone as string | null) ?? null
      const optOut = customers == null ? true : (customers.sms_opt_out as boolean)
      void sendOnMyWaySMS(phone, optOut)
    }
    if (status === 'Completed') {
      void sendTelegram(`✅ Job completed: ${customerName} — ${jobType}`)
      const phone = (customers?.phone as string | null) ?? null
      const optOut = customers == null ? true : (customers.sms_opt_out as boolean)
      void sendJobCompleteSMS(phone, optOut)
    }

    void syncToSheets('Jobs', {
      Timestamp: new Date().toISOString(),
      JobID: id,
      CustomerName: customerName,
      JobType: jobType,
      Status: status,
    })
  }
}
