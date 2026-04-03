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
  const today = new Date().toISOString().split('T')[0]
  const in30 = new Date()
  in30.setDate(in30.getDate() + 30)
  const in30Str = in30.toISOString().split('T')[0]

  // Step 1: Send reminders for agreements expiring within 30 days
  const { data: expiring } = await admin
    .from('maintenance_agreements')
    .select('*, customers(name, phone, sms_opt_out)')
    .eq('status', 'Active')
    .eq('renewal_reminder_sent', false)
    .lte('renewal_date', in30Str)

  let reminders = 0
  for (const a of expiring ?? []) {
    const customer = (a as Record<string, unknown>).customers as {
      name: string; phone: string | null; sms_opt_out: boolean
    } | null
    const name = customer?.name ?? 'Customer'
    const daysOut = Math.ceil(
      (new Date(a.renewal_date as string).getTime() - Date.now()) / 86400000
    )
    const renewalStr = new Date((a.renewal_date as string) + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    await sendTelegram(`🔄 Renewal in ${daysOut} days: ${name} — renews ${renewalStr}`)

    if (customer?.phone) {
      await sendSMS(
        customer.phone,
        `Hi ${name}, your Voltura Power Group annual maintenance plan renews on ${renewalStr}. Call us to schedule your inspection!`,
        customer.sms_opt_out
      )
    }

    const { error: updateErr } = await admin.from('maintenance_agreements')
      .update({ renewal_reminder_sent: true })
      .eq('id', a.id)

    if (updateErr) {
      console.error('[renewals cron] failed to mark agreement:', a.id, updateErr.message)
    } else {
      reminders++
    }
  }

  // Step 2: Expire overdue agreements
  const { data: expired } = await admin
    .from('maintenance_agreements')
    .update({ status: 'Expired' })
    .eq('status', 'Active')
    .lt('renewal_date', today)
    .select('id')

  return NextResponse.json({ reminders, expired: expired?.length ?? 0 })
}
