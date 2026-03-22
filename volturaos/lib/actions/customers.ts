'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { sendTelegram } from '@/lib/telegram'
import { syncToSheets } from '@/lib/sheets'
import type { Customer, CustomerEquipment } from '@/types'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
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

export async function searchCustomers(query: string): Promise<Customer[]> {
  await requireAuth()
  const admin = createAdminClient()
  if (!query.trim()) {
    const { data, error } = await admin.from('customers').select('*').order('name').limit(50)
    if (error) throw new Error(error.message)
    return data as Customer[]
  }
  const q = `%${query}%`
  const { data, error } = await admin
    .from('customers')
    .select('*')
    .or(`name.ilike.${q},phone.ilike.${q},address.ilike.${q}`)
    .order('name')
    .limit(20)
  if (error) throw new Error(error.message)
  return data as Customer[]
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

export async function deleteEquipment(id: string): Promise<void> {
  await requireAuth()
  const admin = createAdminClient()
  const { error } = await admin.from('customer_equipment').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
