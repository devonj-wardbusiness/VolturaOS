'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegram } from '@/lib/telegram'
import type { Referral } from '@/types'

export async function createReferral(input: {
  estimateId: string
  name: string
  phone: string
  projectNotes?: string
}): Promise<Referral> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('referrals')
    .insert({
      estimate_id: input.estimateId,
      name: input.name,
      phone: input.phone,
      project_notes: input.projectNotes ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)

  void sendTelegram(
    `👥 New referral!\nName: ${input.name}\nPhone: ${input.phone}${input.projectNotes ? `\nProject: ${input.projectNotes}` : ''}`
  )

  return data as Referral
}
