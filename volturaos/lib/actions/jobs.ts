'use server'
// Phase 1 stub — full implementation in Phase 2
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Job } from '@/types'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
}

export async function createJob(input: { customerId: string; jobType: string; scheduledDate?: string; notes?: string }): Promise<Job> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin.from('jobs').insert({ customer_id: input.customerId, job_type: input.jobType, scheduled_date: input.scheduledDate ?? null, notes: input.notes ?? null, status: 'Lead' }).select().single()
  if (error) throw new Error(error.message)
  return data as Job
}

export async function updateJobStatus(id: string, status: Job['status']): Promise<void> {
  await requireAuth()
  const admin = createAdminClient()
  const update: Record<string, unknown> = { status }
  if (status === 'Completed') update.completed_at = new Date().toISOString()
  const { error } = await admin.from('jobs').update(update).eq('id', id)
  if (error) throw new Error(error.message)
}
