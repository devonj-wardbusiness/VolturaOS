import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegram } from '@/lib/telegram'
import { sendSMS } from '@/lib/sms'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const appUrl = process.env.APP_URL ?? ''

  const { data: estimates, error } = await admin
    .from('estimates')
    .select('id, total, follow_up_days, sent_at, customers(name, phone, sms_opt_out)')
    .eq('status', 'Sent')
    .is('proposal_id', null)
    .is('follow_up_sent_at', null)
    .eq('follow_up_dismissed', false)
    .not('sent_at', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filter in JS because follow_up_days varies per row (can't do in SQL without a computed column)
  const now = Date.now()
  const due = (estimates ?? []).filter((e) => {
    const sentAt = new Date(e.sent_at as string).getTime()
    const days = (e.follow_up_days as number | null) ?? 3
    return sentAt + days * 86400000 <= now
  })

  let count = 0
  for (const est of due) {
    const customer = (est as Record<string, unknown>).customers as {
      name: string; phone: string | null; sms_opt_out: boolean
    } | null
    const name = customer?.name ?? 'Customer'
    const total = (est as Record<string, unknown>).total
    const link = `${appUrl}/estimates/${est.id}/view`

    await sendTelegram(`📋 Follow-up due: ${name} — $${total?.toLocaleString()} — ${link}`)

    if (customer?.phone) {
      await sendSMS(
        customer.phone,
        `Hi ${name}, just checking in on your estimate from Voltura Power Group. Review it here: ${link}. Call us at ${process.env.VOLTURA_PHONE ?? ''} with any questions!`,
        customer.sms_opt_out
      )
    }

    await admin.from('estimates')
      .update({ follow_up_sent_at: new Date().toISOString() })
      .eq('id', est.id)

    count++
  }

  return NextResponse.json({ sent: count })
}
