'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { PricebookEntry } from '@/types'

async function requireAuth() { // auth disabled
  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user) redirect("/login")
}

export async function getAllPricebook(): Promise<PricebookEntry[]> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('pricebook')
    .select('*')
    .eq('active', true)
    .order('category')
    .order('job_type')
  if (error) throw new Error(error.message)
  return data as PricebookEntry[]
}

export async function getPricebookByCategory(): Promise<Record<string, PricebookEntry[]>> {
  const entries = await getAllPricebook()
  const grouped: Record<string, PricebookEntry[]> = {}
  for (const entry of entries) {
    const cat = entry.category || 'Uncategorized'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(entry)
  }
  return grouped
}

export async function updatePricebookPrice(
  id: string,
  field: 'price_good' | 'price_better' | 'price_best',
  value: number
): Promise<void> {
  await requireAuth()
  const admin = createAdminClient()
  const rounded = Math.round(value)
  const { error } = await admin.from('pricebook').update({ [field]: rounded }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getRecentPricebookItems(limit = 6): Promise<PricebookEntry[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('pricebook')
    .select('*')
    .eq('active', true)
    .order('use_count', { ascending: false })
    .order('last_used_at', { ascending: false, nullsFirst: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []) as PricebookEntry[]
}

export async function searchPricebook(query: string): Promise<PricebookEntry[]> {
  if (!query.trim()) return []
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('pricebook')
    .select('*')
    .eq('active', true)
    .ilike('job_type', `%${query}%`)
    .order('use_count', { ascending: false })
    .limit(12)
  if (error) throw new Error(error.message)
  return (data ?? []) as PricebookEntry[]
}

export async function incrementPricebookUseCount(ids: string[]): Promise<void> {
  if (!ids.length) return
  const admin = createAdminClient()
  for (const id of ids) {
    const { data: row } = await admin.from('pricebook').select('use_count').eq('id', id).single()
    await admin.from('pricebook').update({
      use_count: ((row?.use_count as number) ?? 0) + 1,
      last_used_at: new Date().toISOString(),
    }).eq('id', id)
  }
}
