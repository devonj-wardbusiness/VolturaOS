'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendSMS } from '@/lib/sms'
import { revalidatePath } from 'next/cache'

export interface SmsMessage {
  id: string
  customer_id: string | null
  direction: 'inbound' | 'outbound'
  body: string
  phone: string
  created_at: string
}

export interface SmsThread {
  phone: string
  customer_id: string | null
  customer_name: string | null
  last_message: string
  last_at: string
  unread: boolean
  messages: SmsMessage[]
}

// ─── Save a message (called from inbound webhook + sendSMS wrapper) ───────────

export async function saveSmsMessage(data: {
  customer_id: string | null
  direction: 'inbound' | 'outbound'
  body: string
  phone: string
}) {
  const admin = createAdminClient()
  await admin.from('sms_messages').insert(data)
}

// ─── List threads (one row per unique phone, most recent first) ────────────────

export async function listSmsThreads(): Promise<SmsThread[]> {
  const admin = createAdminClient()

  const { data: messages } = await admin
    .from('sms_messages')
    .select('id, customer_id, direction, body, phone, created_at')
    .order('created_at', { ascending: false })

  if (!messages || messages.length === 0) return []

  // Get unique customer IDs for name lookup
  const customerIds = [...new Set(messages.map(m => m.customer_id).filter(Boolean))] as string[]
  const { data: customers } = customerIds.length
    ? await admin.from('customers').select('id, name').in('id', customerIds)
    : { data: [] }

  const nameMap: Record<string, string> = {}
  for (const c of customers ?? []) nameMap[c.id] = c.name

  // Group by phone
  const byPhone: Record<string, SmsMessage[]> = {}
  for (const m of messages) {
    if (!byPhone[m.phone]) byPhone[m.phone] = []
    byPhone[m.phone].push(m as SmsMessage)
  }

  return Object.entries(byPhone).map(([phone, msgs]) => {
    const latest = msgs[0] // already sorted desc
    const customerId = msgs.find(m => m.customer_id)?.customer_id ?? null
    return {
      phone,
      customer_id: customerId,
      customer_name: customerId ? (nameMap[customerId] ?? null) : null,
      last_message: latest.body,
      last_at: latest.created_at,
      unread: latest.direction === 'inbound',
      messages: [...msgs].reverse(), // asc for display
    }
  }).sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime())
}

// ─── Get single thread ────────────────────────────────────────────────────────

export async function getSmsThread(phone: string): Promise<SmsMessage[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('sms_messages')
    .select('*')
    .eq('phone', phone)
    .order('created_at', { ascending: true })
  return (data ?? []) as SmsMessage[]
}

// ─── Reply to a customer ──────────────────────────────────────────────────────

export async function replySms(phone: string, body: string, customerId: string | null) {
  await sendSMS(phone, body, false)
  await saveSmsMessage({ customer_id: customerId, direction: 'outbound', body, phone })
  revalidatePath('/messages')
}
