'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { sendTelegram } from '@/lib/telegram'
import { syncToSheets } from '@/lib/sheets'
import type { Customer, CustomerEquipment, HistoryItem } from '@/types'

async function requireAuth() { // auth disabled
  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user) redirect("/login")
}

export async function createCustomer(input: {
  name: string
  phone?: string
  email?: string
  address?: string
  city?: string
  zip?: string
  property_type?: string
  notes?: string
}): Promise<Customer> {
  if (!input.name?.trim()) throw new Error('Name is required')
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('customers')
    .insert({
      name: input.name.trim(),
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      city: input.city || 'Colorado Springs',
      zip: input.zip || null,
      property_type: input.property_type || 'residential',
      notes: input.notes || null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  const customer = data as Customer
  void sendTelegram(`👤 New customer: ${customer.name} — ${customer.city}`)
  void syncToSheets('Customers', {
    Timestamp: new Date().toISOString(),
    CustomerID: customer.id,
    Name: customer.name,
    Phone: customer.phone ?? '',
    Email: customer.email ?? '',
    Address: customer.address ?? '',
    PropertyType: customer.property_type,
    TotalJobCount: 0,
    TotalRevenue: 0,
  })
  return customer
}

export async function updateCustomer(id: string, updates: Partial<Omit<Customer, 'id' | 'created_at'>>): Promise<Customer> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin.from('customers').update(updates).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as Customer
}

export async function getCustomerById(id: string): Promise<Customer & { equipment: CustomerEquipment[] }> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin.from('customers').select('*, customer_equipment(*)').eq('id', id).single()
  if (error) throw new Error(error.message)
  const { customer_equipment, ...customer } = data
  return { ...customer, equipment: customer_equipment ?? [] }
}

export async function searchCustomers(query: string): Promise<(Customer & { jobCount: number })[]> {
  await requireAuth()
  const admin = createAdminClient()
  if (!query.trim()) {
    const { data, error } = await admin.from('customers').select('*, jobs(id)').order('name').limit(50)
    if (error) throw new Error(error.message)
    return (data as Record<string, unknown>[]).map(({ jobs: jobList, ...c }) => ({
      ...(c as unknown as Customer),
      jobCount: Array.isArray(jobList) ? jobList.length : 0,
    }))
  }
  const q = `%${query}%`
  const { data, error } = await admin
    .from('customers')
    .select('*, jobs(id)')
    .or(`name.ilike.${q},phone.ilike.${q},address.ilike.${q}`)
    .order('name')
    .limit(20)
  if (error) throw new Error(error.message)
  return (data as Record<string, unknown>[]).map(({ jobs: jobList, ...c }) => ({
    ...(c as unknown as Customer),
    jobCount: Array.isArray(jobList) ? jobList.length : 0,
  }))
}

export async function createEquipment(input: { customer_id: string; type: string; brand?: string; amperage?: string; age_years?: number; notes?: string }): Promise<CustomerEquipment> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin.from('customer_equipment').insert({
    customer_id: input.customer_id,
    type: input.type,
    brand: input.brand || null,
    amperage: input.amperage || null,
    age_years: input.age_years ?? null,
    notes: input.notes || null,
  }).select().single()
  if (error) throw new Error(error.message)
  return data as CustomerEquipment
}

export async function deleteCustomer(id: string): Promise<void> {
  await requireAuth()
  const admin = createAdminClient()
  const { error } = await admin.from('customers').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteEquipment(id: string): Promise<void> {
  await requireAuth()
  const admin = createAdminClient()
  const { error } = await admin.from('customer_equipment').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getCustomerHistory(customerId: string): Promise<HistoryItem[]> {
  await requireAuth()
  const admin = createAdminClient()

  const [jobs, invoices, estimates] = await Promise.all([
    admin.from('jobs').select('id, job_type, status, scheduled_date, created_at').eq('customer_id', customerId).order('created_at', { ascending: false }),
    admin.from('invoices').select('id, total, status, created_at').eq('customer_id', customerId).order('created_at', { ascending: false }),
    admin.from('estimates').select('id, name, total, status, created_at').eq('customer_id', customerId).order('created_at', { ascending: false }),
  ])

  if (jobs.error) throw new Error(jobs.error.message)
  if (invoices.error) throw new Error(invoices.error.message)
  if (estimates.error) throw new Error(estimates.error.message)

  const items: HistoryItem[] = [
    ...(jobs.data ?? []).map((j: Record<string, unknown>) => ({
      type: 'job' as const,
      id: j.id as string,
      title: (j.job_type as string) || 'Job',
      status: j.status as string,
      date: j.created_at as string,
      href: `/jobs/${j.id}`,
    })),
    ...(invoices.data ?? []).map((inv: Record<string, unknown>) => ({
      type: 'invoice' as const,
      id: inv.id as string,
      title: 'Invoice',
      status: inv.status as string,
      amount: (inv.total as number) ?? 0,
      date: inv.created_at as string,
      href: `/invoices/${inv.id}`,
    })),
    ...(estimates.data ?? []).map((e: Record<string, unknown>) => ({
      type: 'estimate' as const,
      id: e.id as string,
      title: (e.name as string) || 'Estimate',
      status: e.status as string,
      amount: (e.total as number) ?? 0,
      date: e.created_at as string,
      href: `/estimates/${e.id}`,
    })),
  ]

  return items.sort((a, b) => b.date.localeCompare(a.date))
}
