'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendSMS } from '@/lib/sms'
import type { Form, FormType } from '@/types'

export async function listJobForms(jobId: string): Promise<Form[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('estimates')
    .select('id, job_id, customer_id, form_type, status, line_items, signer_name, signature_data, signed_at, created_at')
    .eq('job_id', jobId)
    .not('form_type', 'is', null)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as Form[]
}

export async function createOrGetForm(
  jobId: string,
  customerId: string,
  formType: FormType
): Promise<Form> {
  const admin = createAdminClient()

  // Return existing form if one already exists for this job + type
  const { data: existing } = await admin
    .from('estimates')
    .select('id, job_id, customer_id, form_type, status, line_items, signer_name, signature_data, signed_at, created_at')
    .eq('job_id', jobId)
    .eq('form_type', formType)
    .maybeSingle()
  if (existing) return existing as unknown as Form

  const { data, error } = await admin
    .from('estimates')
    .insert({
      job_id: jobId,
      customer_id: customerId,
      form_type: formType,
      proposal_id: null,
      name: formType.replace(/_/g, ' '),
      status: 'Draft',
      total: 0,
      is_template: false,
    })
    .select('id, job_id, customer_id, form_type, status, line_items, signer_name, signature_data, signed_at, created_at')
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as Form
}

export async function saveMaterialList(
  formId: string,
  items: { name: string; qty: string }[]
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('estimates')
    .update({ line_items: items as unknown[] })
    .eq('id', formId)
  if (error) throw new Error(error.message)
}

// Advance form to 'Sent' and return the public URL.
// Uses a direct .update() — does NOT call updateEstimateStatus() to avoid its Telegram noise.
export async function publishForm(formId: string): Promise<string> {
  const admin = createAdminClient()
  const now = new Date().toISOString()
  const { error } = await admin
    .from('estimates')
    .update({ status: 'Sent', sent_at: now })
    .eq('id', formId)
  if (error) throw new Error(error.message)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://volturaos.vercel.app'
  return `${baseUrl}/estimates/${formId}/view`
}

// Fetches customer from DB, builds a form-specific SMS, calls publishForm internally.
// Does NOT call sendEstimateLinkSMS() — that sends "here's your estimate" copy.
export async function sendFormLinkSMS(formId: string): Promise<void> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('estimates')
    .select('customer_id, customers(name, phone, sms_opt_out)')
    .eq('id', formId)
    .single()
  if (error || !data) return

  const row = data as Record<string, unknown>
  const customer = row.customers as { name: string; phone: string | null; sms_opt_out: boolean } | null
  if (!customer?.phone) return

  const url = await publishForm(formId)
  const firstName = customer.name.split(' ')[0]
  const message = `Hi ${firstName}, here's your form to review and sign from Voltura Power Group: ${url}`
  await sendSMS(customer.phone, message, customer.sms_opt_out)
}

export async function deleteForm(formId: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('estimates')
    .delete()
    .eq('id', formId)
  if (error) throw new Error(error.message)
}
