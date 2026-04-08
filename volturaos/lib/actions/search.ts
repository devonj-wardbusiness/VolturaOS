'use server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function searchAll(query: string) {
  if (!query || query.trim().length < 2) return null
  const q = query.trim()
  const admin = createAdminClient()

  const [customers, jobs, estimates, invoices] = await Promise.all([
    admin.from('customers').select('id, name, phone, address, property_type').ilike('name', `%${q}%`).limit(5),
    admin.from('jobs').select('id, job_type, status, scheduled_date, customers(name)').ilike('job_type', `%${q}%`).limit(5),
    admin.from('estimates').select('id, name, total, status, customers(name)').ilike('name', `%${q}%`).limit(5),
    admin.from('invoices').select('id, total, status, created_at, customers!inner(name)').ilike('customers.name', `%${q}%`).limit(5),
  ])

  return {
    customers: customers.data ?? [],
    jobs: jobs.data ?? [],
    estimates: estimates.data ?? [],
    invoices: invoices.data ?? [],
  }
}
