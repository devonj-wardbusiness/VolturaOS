'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { sendTelegram } from '@/lib/telegram'
import { syncToSheets } from '@/lib/sheets'
import { sendSMS } from '@/lib/sms'
import type { Estimate, EstimateStatus, LineItem, Addon } from '@/types'

async function requireAuth() { // auth disabled
  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user) redirect("/login")
}

export async function createEstimate(input: {
  customerId: string
  jobId?: string
}): Promise<Estimate> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('estimates')
    .insert({ customer_id: input.customerId, job_id: input.jobId ?? null, status: 'Draft', name: 'Estimate', tier_selected: null })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Estimate
}

export async function saveEstimate(id: string, updates: {
  name?: string
  lineItems?: LineItem[]
  addons?: Addon[]
  subtotal?: number
  total?: number
  notes?: string
  includesPermit?: boolean
  includesCleanup?: boolean
  includesWarranty?: boolean
  followUpDays?: number
}): Promise<Estimate> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('estimates')
    .update({
      tier_selected: null,
      name: updates.name?.trim() || 'Estimate',
      line_items: updates.lineItems,
      addons: updates.addons,
      subtotal: updates.subtotal,
      total: updates.total,
      notes: updates.notes,
      includes_permit: updates.includesPermit ?? false,
      includes_cleanup: updates.includesCleanup ?? true,
      includes_warranty: updates.includesWarranty ?? true,
      follow_up_days: updates.followUpDays ?? 3,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Estimate
}

export async function duplicateEstimate(sourceId: string): Promise<Estimate> {
  await requireAuth()
  const admin = createAdminClient()

  const { data: source, error: fetchErr } = await admin
    .from('estimates')
    .select('*')
    .eq('id', sourceId)
    .single()
  if (fetchErr || !source) throw new Error('Estimate not found')

  const anchorId: string = (source as Record<string, unknown>).proposal_id as string ?? sourceId

  const { count, error: countErr } = await admin
    .from('estimates')
    .select('*', { count: 'exact', head: true })
    .or(`id.eq.${anchorId},proposal_id.eq.${anchorId}`)
  if (countErr) throw new Error(countErr.message)
  if ((count ?? 0) >= 3) throw new Error('Proposal already has 3 estimates')

  const sourceName = ((source as Record<string, unknown>).name as string) ?? 'Estimate'
  const newName = sourceName.slice(0, 93) + ' (Copy)'

  const { data: newEst, error: insertErr } = await admin
    .from('estimates')
    .insert({
      customer_id: (source as Record<string, unknown>).customer_id,
      job_id: (source as Record<string, unknown>).job_id ?? null,
      line_items: (source as Record<string, unknown>).line_items ?? null,
      addons: (source as Record<string, unknown>).addons ?? null,
      notes: (source as Record<string, unknown>).notes ?? null,
      subtotal: (source as Record<string, unknown>).subtotal ?? null,
      total: (source as Record<string, unknown>).total ?? null,
      name: newName,
      proposal_id: anchorId,
      status: 'Draft',
      tier_selected: null,
      includes_permit: (source as Record<string, unknown>).includes_permit ?? false,
      includes_cleanup: (source as Record<string, unknown>).includes_cleanup ?? true,
      includes_warranty: (source as Record<string, unknown>).includes_warranty ?? true,
    })
    .select()
    .single()
  if (insertErr) throw new Error(insertErr.message)
  return newEst as Estimate
}

export async function getProposalEstimates(estimateId: string): Promise<Estimate[]> {
  const admin = createAdminClient()

  const { data: est, error: fetchErr } = await admin
    .from('estimates')
    .select('proposal_id')
    .eq('id', estimateId)
    .single()
  if (fetchErr || !est) return []

  const anchorId: string = (est as Record<string, unknown>).proposal_id as string ?? estimateId

  const { data, error } = await admin
    .from('estimates')
    .select('*')
    .or(`id.eq.${anchorId},proposal_id.eq.${anchorId}`)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
  if (error) return []
  return (data ?? []) as Estimate[]
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

export async function approvePublicEstimate(approvedId: string): Promise<void> {
  const group = await getProposalEstimates(approvedId)
  if (!group.length) return

  // no-op if already settled
  const alreadySettled = group.some((e) => e.status === 'Approved' || e.status === 'Declined')
  if (alreadySettled) return

  const admin = createAdminClient()
  const now = new Date().toISOString()

  for (const est of group) {
    if (est.id === approvedId) {
      await admin.from('estimates').update({ status: 'Approved', approved_at: now }).eq('id', est.id)
    } else {
      await admin.from('estimates').update({ status: 'Declined', declined_at: now }).eq('id', est.id)
    }
  }

  // Notifications for the approved estimate only
  const approved = group.find((e) => e.id === approvedId)
  if (approved) {
    const { data } = await admin
      .from('estimates')
      .select('*, customers(name), jobs(job_type)')
      .eq('id', approvedId)
      .single()
    if (data) {
      const row = data as Record<string, unknown>
      const customerName = ((row.customers as Record<string, unknown> | null)?.name as string) ?? 'Unknown'
      const jobType = ((row.jobs as Record<string, unknown> | null)?.job_type as string) ?? 'Service'
      const total = (row.total as number) ?? 0
      void sendTelegram(`ESTIMATE APPROVED: ${customerName} — ${jobType} — $${total.toLocaleString()} — CLOSE IT!`)
      void syncToSheets('Estimates', { Timestamp: now, EstimateID: approvedId, CustomerName: customerName, JobType: jobType, Total: total, Status: 'Approved' })
    }
  }
}

export async function getEstimateById(id: string): Promise<Estimate & { customer: { name: string; phone: string | null; id: string } }> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin.from('estimates').select('*, customers(id, name, phone)').eq('id', id).single()
  if (error) throw new Error(error.message)
  const { customers, ...estimate } = data as Record<string, unknown>
  return { ...estimate, customer: customers } as Estimate & { customer: { name: string; phone: string | null; id: string } }
}

export async function getPublicEstimate(id: string): Promise<{ estimates: Estimate[]; customer: { name: string; phone: string | null } } | null> {
  const admin = createAdminClient()

  // Load the full proposal group
  const group = await getProposalEstimates(id)
  if (!group.length) return null

  // Must have at least one estimate accessible from a public URL
  const anchor = group[0]
  const allowedStatuses: EstimateStatus[] = ['Sent', 'Viewed', 'Approved', 'Declined']
  if (!allowedStatuses.includes(anchor.status)) return null

  // Stamp anchor as Viewed if it was just Sent
  if (anchor.status === 'Sent') {
    await admin.from('estimates').update({ status: 'Viewed', viewed_at: new Date().toISOString() }).eq('id', anchor.id)
    anchor.status = 'Viewed'
  }

  // Fetch customer from anchor
  const { data: custData } = await admin
    .from('estimates')
    .select('customers(name, phone)')
    .eq('id', anchor.id)
    .single()
  const customers = custData ? (custData as Record<string, unknown>).customers as { name: string; phone: string | null } : { name: 'Customer', phone: null }

  return { estimates: group, customer: customers }
}

export async function getLinkedInvoice(estimateId: string): Promise<{ id: string } | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('invoices')
    .select('id')
    .eq('estimate_id', estimateId)
    .maybeSingle()
  return data ? { id: data.id as string } : null
}

export async function sendEstimateLinkSMS(
  estimateId: string,
  customerPhone: string,
  customerName: string,
  smsOptOut: boolean
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://volturaos.vercel.app'
  const link = `${baseUrl}/estimates/${estimateId}/view`
  const message = `Hi ${customerName.split(' ')[0]}, here's your estimate from Voltura Power Group: ${link}`
  await sendSMS(customerPhone, message, smsOptOut)
  await updateEstimateStatus(estimateId, 'Sent')
}

export async function signEstimate(
  id: string,
  signerName: string,
  signatureData: string
): Promise<void> {
  const admin = createAdminClient()
  const now = new Date().toISOString()
  const { error } = await admin
    .from('estimates')
    .update({
      status: 'Approved',
      approved_at: now,
      signer_name: signerName,
      signature_data: signatureData,
      signed_at: now,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  void sendTelegram(`✍️ Estimate signed in person by ${signerName}`)
}

export async function deleteEstimate(id: string): Promise<void> {
  await requireAuth()
  const admin = createAdminClient()
  const { error } = await admin.from('estimates').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function saveAsTemplate(estimateId: string, name: string): Promise<void> {
  const admin = createAdminClient()
  const { data: src, error: srcErr } = await admin
    .from('estimates')
    .select('*')
    .eq('id', estimateId)
    .single()
  if (srcErr || !src) throw new Error('Estimate not found')
  const { error } = await admin.from('estimates').insert({
    name,
    is_template: true,
    line_items: src.line_items,
    addons: src.addons,
    includes_permit: src.includes_permit,
    includes_cleanup: src.includes_cleanup,
    includes_warranty: src.includes_warranty,
    customer_id: src.customer_id,
    status: 'Draft',
    total: src.total,
    subtotal: src.subtotal,
  })
  if (error) throw new Error(error.message)
}

export async function getTemplates(): Promise<Pick<Estimate, 'id' | 'name' | 'total' | 'line_items'>[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('estimates')
    .select('id, name, total, line_items')
    .eq('is_template', true)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as Pick<Estimate, 'id' | 'name' | 'total' | 'line_items'>[]
}

export async function deleteTemplate(id: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('estimates').delete().eq('id', id).eq('is_template', true)
  if (error) throw new Error(error.message)
}

export async function dismissFollowUp(estimateId: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('estimates')
    .update({ follow_up_dismissed: true })
    .eq('id', estimateId)
  if (error) throw new Error(error.message)
}

export async function createEstimateFromTemplate(
  templateId: string,
  customerId: string,
): Promise<string> {
  const admin = createAdminClient()
  const { data: tpl, error: tplErr } = await admin
    .from('estimates')
    .select('*')
    .eq('id', templateId)
    .eq('is_template', true)
    .single()
  if (tplErr || !tpl) throw new Error('Template not found')
  const { data, error } = await admin.from('estimates').insert({
    name: tpl.name,
    customer_id: customerId,
    line_items: tpl.line_items,
    addons: tpl.addons,
    includes_permit: tpl.includes_permit,
    includes_cleanup: tpl.includes_cleanup,
    includes_warranty: tpl.includes_warranty,
    total: tpl.total,
    subtotal: tpl.subtotal,
    status: 'Draft',
    is_template: false,
  }).select('id').single()
  if (error) throw new Error(error.message)
  return (data as { id: string }).id
}

export async function getEstimatesByCustomer(customerId: string): Promise<Pick<Estimate, 'id' | 'name' | 'total' | 'status' | 'line_items' | 'addons' | 'notes' | 'includes_permit' | 'includes_cleanup' | 'includes_warranty'>[]> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('estimates')
    .select('id, name, total, status, line_items, addons, notes, includes_permit, includes_cleanup, includes_warranty')
    .eq('customer_id', customerId)
    .eq('is_template', false)
    .not('status', 'eq', 'Declined')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw new Error(error.message)
  return (data ?? []) as Pick<Estimate, 'id' | 'name' | 'total' | 'status' | 'line_items' | 'addons' | 'notes' | 'includes_permit' | 'includes_cleanup' | 'includes_warranty'>[]
}

export async function listEstimates(): Promise<(Estimate & { customer: { name: string } })[]> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin.from('estimates').select('*, customers(name)').eq('is_template', false).order('created_at', { ascending: false }).limit(100)
  if (error) throw new Error(error.message)
  return (data as Record<string, unknown>[]).map(({ customers, ...e }) => ({ ...e, customer: customers })) as (Estimate & { customer: { name: string } })[]
}
