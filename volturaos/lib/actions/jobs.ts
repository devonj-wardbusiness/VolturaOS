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
        customer.sms_opt_out == null ? true : (customer.sms_opt_out as boolean),
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
}): Promise<(Job & { customer: { name: string }; invoiceTotal: number | null })[]> {
  await requireAuth()
  const admin = createAdminClient()
  let query = admin
    .from('jobs')
    .select('*, customers(name), invoices(id, total, status)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.customerId) query = query.eq('customer_id', filters.customerId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as Record<string, unknown>[]).map(({ customers, invoices: invs, ...j }) => {
    const invoicesArr = Array.isArray(invs) ? (invs as { total: number; status: string }[]) : []
    // Prefer latest invoice total (last in array)
    const invoiceTotal = invoicesArr.length > 0 ? invoicesArr[invoicesArr.length - 1].total : null
    return { ...j, customer: customers, invoiceTotal }
  }) as (Job & { customer: { name: string }; invoiceTotal: number | null })[]
}

export async function getJobById(id: string): Promise<Job & { customer: { id: string; name: string; phone: string | null; address: string | null; zip: string | null } }> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('jobs')
    .select('*, customers(id, name, phone, address, zip)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  const { customers, ...job } = data as Record<string, unknown>
  return { ...job, customer: customers } as Job & { customer: { id: string; name: string; phone: string | null; address: string | null; zip: string | null } }
}

export async function updateJob(id: string, updates: {
  jobType?: string
  scheduledDate?: string | null
  scheduledTime?: string | null
  notes?: string | null
  permitNumber?: string | null
  permitStatus?: string | null
}): Promise<void> {
  await requireAuth()
  const admin = createAdminClient()
  const payload: Record<string, unknown> = {}
  if (updates.jobType !== undefined) payload.job_type = updates.jobType
  if (updates.scheduledDate !== undefined) payload.scheduled_date = updates.scheduledDate
  if (updates.scheduledTime !== undefined) payload.scheduled_time = updates.scheduledTime
  if (updates.notes !== undefined) payload.notes = updates.notes
  if (updates.permitNumber !== undefined) payload.permit_number = updates.permitNumber
  if (updates.permitStatus !== undefined) payload.permit_status = updates.permitStatus
  const { error } = await admin.from('jobs').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Time tracking ─────────────────────────────────────────────────────────────

export async function clockIn(jobId: string): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('job_time_entries')
    .insert({ job_id: jobId, clocked_in_at: new Date().toISOString() })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return (data as { id: string }).id
}

export async function clockOut(entryId: string, notes?: string): Promise<void> {
  const admin = createAdminClient()
  const payload: Record<string, unknown> = { clocked_out_at: new Date().toISOString() }
  if (notes) payload.notes = notes
  const { error } = await admin.from('job_time_entries').update(payload).eq('id', entryId)
  if (error) throw new Error(error.message)
}

export async function getTimeEntries(jobId: string): Promise<import('@/types').JobTimeEntry[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('job_time_entries')
    .select('*')
    .eq('job_id', jobId)
    .order('clocked_in_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as import('@/types').JobTimeEntry[]
}

export async function getJobsForMonth(year: number, month: number): Promise<(Job & { customer: { name: string } })[]> {
  await requireAuth()
  const admin = createAdminClient()

  // month is 1-indexed (1 = January)
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  // Use Date arithmetic — handles December → January correctly
  // JS Date month param is 0-indexed, so passing `month` (1-based) = next month
  const nextMonthDate = new Date(year, month, 1)
  const end = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`

  const { data, error } = await admin
    .from('jobs')
    .select('id, job_type, status, scheduled_date, scheduled_time, customers(name)')
    .gte('scheduled_date', start)
    .lt('scheduled_date', end)
    .not('scheduled_date', 'is', null)
    .order('scheduled_date', { ascending: true })

  if (error) throw new Error(error.message)

  return (data as Record<string, unknown>[]).map(({ customers, ...j }) => ({
    ...j, customer: customers,
  })) as (Job & { customer: { name: string } })[]
}

export async function getNeighborhoodCustomers(jobId: string): Promise<{
  id: string; name: string; phone: string; address: string | null; zip: string | null
}[]> {
  const admin = createAdminClient()
  // Get this job's customer zip
  const { data: jobData } = await admin
    .from('jobs')
    .select('customer_id, customers(zip, id)')
    .eq('id', jobId)
    .single()

  const customerId = jobData?.customer_id as string | null
  const cusRaw = jobData?.customers as unknown
  const zip = (cusRaw && !Array.isArray(cusRaw) ? (cusRaw as Record<string, unknown>).zip : null) as string | null
  if (!zip) return []

  // Find other customers in same zip with a phone, not opted out
  const { data } = await admin
    .from('customers')
    .select('id, name, phone, address, zip')
    .eq('zip', zip)
    .eq('sms_opt_out', false)
    .not('phone', 'is', null)
    .neq('id', customerId ?? '')
    .limit(20)

  return ((data ?? []) as Record<string, unknown>[]).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    phone: c.phone as string,
    address: c.address as string | null,
    zip: c.zip as string | null,
  }))
}

export async function sendBlitzSMS(
  customerIds: string[],
  jobType: string,
  zip: string
): Promise<number> {
  const admin = createAdminClient()
  const { sendSMS: _sendSMS } = await import('@/lib/sms')
  const phone = process.env.VOLTURA_PHONE ?? '(719) 555-0100'

  const { data: customers } = await admin
    .from('customers')
    .select('phone, sms_opt_out')
    .in('id', customerIds)

  let sent = 0
  for (const c of customers ?? []) {
    const customer = c as { phone: string | null; sms_opt_out: boolean }
    if (!customer.phone || customer.sms_opt_out) continue
    await _sendSMS(
      customer.phone,
      `Hi! Voltura Power Group just finished a ${jobType} near you in ${zip}. ` +
      `If you've been thinking about electrical work — panel upgrade, EV charger, new circuits, or a safety check — ` +
      `we're in the area and have openings this week. Call/text ${phone} for a free estimate.`,
      false
    )
    sent++
  }
  return sent
}

// ── Material cost tracking ─────────────────────────────────────────────────

export interface JobMaterial {
  id: string
  job_id: string
  description: string
  cost: number
  created_at: string
}

export async function addMaterial(jobId: string, description: string, cost: number): Promise<JobMaterial> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('job_materials')
    .insert({ job_id: jobId, description, cost })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as JobMaterial
}

export async function getMaterials(jobId: string): Promise<JobMaterial[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('job_materials')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as JobMaterial[]
}

export async function deleteMaterial(materialId: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('job_materials').delete().eq('id', materialId)
  if (error) throw new Error(error.message)
}

export async function sendCrewSMS(jobId: string, crewPhone: string): Promise<void> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('jobs')
    .select('job_type, scheduled_date, scheduled_time, notes, customers(name, address, phone)')
    .eq('id', jobId)
    .single()
  if (error) throw new Error(error.message)

  const job = data as Record<string, unknown>
  const cust = job.customers as { name: string; address: string | null; phone: string | null } | null

  const dateStr = job.scheduled_date
    ? new Date((job.scheduled_date as string) + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'TBD'
  const timeStr = job.scheduled_time ? (job.scheduled_time as string).slice(0, 5) : ''

  const body = [
    `📋 JOB DETAILS`,
    `Customer: ${cust?.name ?? 'Unknown'}`,
    `Job: ${job.job_type as string}`,
    `Date: ${dateStr}${timeStr ? ' at ' + timeStr : ''}`,
    cust?.address ? `Address: ${cust.address}` : null,
    cust?.phone ? `Phone: ${cust.phone}` : null,
    (job.notes as string | null) ? `Notes: ${job.notes as string}` : null,
    `— Voltura Power Group`,
  ].filter(Boolean).join('\n')

  const { sendSMS: _sendSMS } = await import('@/lib/sms')
  await _sendSMS(crewPhone, body, false)
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

      // Only send review/referral SMS once per job
      const { data: jobRow } = await admin
        .from('jobs')
        .select('review_requested_at')
        .eq('id', id)
        .single()

      const phone = (customers?.phone as string | null) ?? null
      const optOut = customers == null ? true : (customers.sms_opt_out as boolean)

      if (!jobRow?.review_requested_at) {
        void sendJobCompleteSMS(phone, optOut, jobType)
        await admin.from('jobs').update({ review_requested_at: new Date().toISOString() }).eq('id', id)
      }
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

export async function deleteJob(id: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('jobs').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
