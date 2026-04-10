'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { sendTelegram } from '@/lib/telegram'
import { syncToSheets } from '@/lib/sheets'
import type { Invoice, InvoicePayment, PaymentMethod, LineItem } from '@/types'

async function requireAuth() { // auth disabled
  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user) redirect("/login")
}

export async function createInvoice(input: {
  customerId: string
  estimateId?: string
  jobId?: string
  lineItems: LineItem[]
  total: number
  dueDate?: string
  notes?: string
}): Promise<Invoice> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin.from('invoices').insert({
    customer_id: input.customerId,
    estimate_id: input.estimateId ?? null,
    job_id: input.jobId ?? null,
    line_items: input.lineItems,
    total: input.total,
    due_date: input.dueDate ?? null,
    notes: input.notes ?? null,
    status: 'Unpaid',
  }).select().single()
  if (error) throw new Error(error.message)
  void sendTelegram(`💰 New invoice created — $${input.total.toLocaleString()}`)
  return data as Invoice
}

export async function createInvoiceFromEstimate(estimateId: string): Promise<Invoice> {
  await requireAuth()
  const admin = createAdminClient()
  const { data: est, error: estErr } = await admin
    .from('estimates')
    .select('*, customers(name)')
    .eq('id', estimateId)
    .single()
  if (estErr || !est) throw new Error('Estimate not found')

  const { data, error } = await admin.from('invoices').insert({
    customer_id: est.customer_id,
    estimate_id: estimateId,
    line_items: est.line_items,
    total: est.total,
    status: 'Unpaid',
  }).select().single()
  if (error) throw new Error(error.message)

  // Update estimate status to Invoiced if it exists as a job status concept
  const customerName = (est.customers as Record<string, unknown>)?.name ?? 'Unknown'
  void sendTelegram(`💰 Invoice created from estimate — ${customerName} — $${(est.total as number)?.toLocaleString()}`)

  return data as Invoice
}

export async function getInvoiceById(id: string): Promise<Invoice & {
  customer: { name: string; phone: string | null; address: string | null }
  payments: InvoicePayment[]
}> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('invoices')
    .select('*, customers(name, phone, address), invoice_payments(*)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  const { customers, invoice_payments, ...invoice } = data as Record<string, unknown>
  return {
    ...invoice,
    customer: customers,
    payments: ((invoice_payments ?? []) as InvoicePayment[]).sort(
      (a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime()
    ),
  } as Invoice & { customer: { name: string; phone: string | null; address: string | null }; payments: InvoicePayment[] }
}

export async function listInvoices(filters?: {
  status?: string
}): Promise<(Invoice & { customer: { name: string } })[]> {
  await requireAuth()
  const admin = createAdminClient()
  let query = admin
    .from('invoices')
    .select('*, customers(name)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (filters?.status) query = query.eq('status', filters.status)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as Record<string, unknown>[]).map(({ customers, ...inv }) => ({
    ...inv, customer: customers,
  })) as (Invoice & { customer: { name: string } })[]
}

export async function getPublicInvoice(id: string): Promise<{
  invoice: Invoice & { line_items: LineItem[] | null }
  customer: { name: string; address: string | null }
} | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('invoices')
    .select('id, total, amount_paid, balance, status, line_items, customers(name, address)')
    .eq('id', id)
    .single()
  if (error || !data) return null
  const { customers, ...invoice } = data as Record<string, unknown>
  if (!customers) return null
  return {
    invoice: invoice as unknown as Invoice & { line_items: LineItem[] | null },
    customer: customers as { name: string; address: string | null },
  }
}

export async function recordPayment(input: {
  invoiceId: string
  amount: number
  paymentMethod: PaymentMethod
  notes?: string
}): Promise<void> {
  await requireAuth()
  const admin = createAdminClient()

  // Insert payment record
  const { error: payErr } = await admin.from('invoice_payments').insert({
    invoice_id: input.invoiceId,
    amount: input.amount,
    payment_method: input.paymentMethod,
    notes: input.notes ?? null,
  })
  if (payErr) throw new Error(payErr.message)

  // Get current invoice totals
  const { data: inv, error: invErr } = await admin
    .from('invoices')
    .select('total, amount_paid, customers(name)')
    .eq('id', input.invoiceId)
    .single()
  if (invErr) throw new Error(invErr.message)

  const newAmountPaid = ((inv.amount_paid as number) || 0) + input.amount
  const total = inv.total as number
  const status = newAmountPaid >= total ? 'Paid' : 'Partial'

  await admin.from('invoices').update({
    amount_paid: newAmountPaid,
    status,
  }).eq('id', input.invoiceId)

  const customers = inv.customers as unknown as Record<string, unknown> | null
  const customerName = (customers?.name as string) ?? 'Unknown'
  void sendTelegram(
    `💵 Payment: $${input.amount} via ${input.paymentMethod} — ${customerName} — ${status === 'Paid' ? 'PAID IN FULL' : `$${(total - newAmountPaid).toFixed(2)} remaining`}`
  )
  void syncToSheets('Payments', {
    Timestamp: new Date().toISOString(),
    InvoiceID: input.invoiceId,
    Amount: input.amount,
    Method: input.paymentMethod,
    Status: status,
  })
}
