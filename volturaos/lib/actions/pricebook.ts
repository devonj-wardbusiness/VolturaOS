'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { PricebookEntry } from '@/types'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
}

export async function getAllPricebook(): Promise<PricebookEntry[]> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('pricebook')
    .select('*')
    .eq('active', true)
    .order('job_type')
  if (error) throw new Error(error.message)
  return data as PricebookEntry[]
}

export async function updatePricebookPrice(
  id: string,
  field: 'price_good' | 'price_better' | 'price_best',
  value: number
): Promise<void> {
  await requireAuth()
  const admin = createAdminClient()
  const { error } = await admin.from('pricebook').update({ [field]: value }).eq('id', id)
  if (error) throw new Error(error.message)
}
