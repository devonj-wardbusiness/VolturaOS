'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegram } from '@/lib/telegram'
import { revalidatePath } from 'next/cache'
import type { MaintenanceAgreement, LineItem } from '@/types'

export async function createAgreement(customerId: string): Promise<void> {
  const admin = createAdminClient()

  const { data: customer } = await admin
    .from('customers')
    .select('name')
    .eq('id', customerId)
    .single()
  const name = customer?.name ?? 'Customer'

  const lineItems: LineItem[] = [{
    description: 'Annual Maintenance Plan',
    price: 199,
    is_override: false,
    original_price: 199,
  }]
  const { data: invoice, error: invErr } = await admin
    .from('invoices')
    .insert({
      customer_id: customerId,
      line_items: lineItems,
      total: 199,
      status: 'Unpaid',
    })
    .select('id')
    .single()
  if (invErr) throw new Error(invErr.message)

  const renewalDate = new Date()
  renewalDate.setFullYear(renewalDate.getFullYear() + 1)

  const { error } = await admin.from('maintenance_agreements').insert({
    customer_id: customerId,
    price: 199,
    renewal_date: renewalDate.toISOString().split('T')[0],
    invoice_id: invoice.id,
  })
  if (error) throw new Error(error.message)

  void sendTelegram(`🛡 New maintenance agreement: ${name} — $199/yr`)
  revalidatePath(`/customers/${customerId}`)
  revalidatePath('/agreements')
}

export async function cancelAgreement(id: string, customerId: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('maintenance_agreements')
    .update({ status: 'Cancelled' })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/customers/${customerId}`)
  revalidatePath('/agreements')
}

export async function getActiveAgreement(customerId: string): Promise<MaintenanceAgreement | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('maintenance_agreements')
    .select('*')
    .eq('customer_id', customerId)
    .eq('status', 'Active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as MaintenanceAgreement) ?? null
}

export async function listAgreements(
  filter?: 'Active' | 'Expired' | 'Cancelled' | 'Expiring'
): Promise<(MaintenanceAgreement & { customer: { name: string } })[]> {
  const admin = createAdminClient()
  let query = admin
    .from('maintenance_agreements')
    .select('*, customers(name)')
    .order('renewal_date', { ascending: true })

  if (filter === 'Expiring') {
    const in30 = new Date()
    in30.setDate(in30.getDate() + 30)
    query = query
      .eq('status', 'Active')
      .lte('renewal_date', in30.toISOString().split('T')[0])
  } else if (filter) {
    query = query.eq('status', filter)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as Record<string, unknown>[]).map(({ customers, ...a }) => ({
    ...a, customer: customers,
  })) as (MaintenanceAgreement & { customer: { name: string } })[]
}
