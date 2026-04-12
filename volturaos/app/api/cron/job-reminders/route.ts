import { createAdminClient } from '@/lib/supabase/admin'
import { sendSMS } from '@/lib/sms'
import { sendTelegram } from '@/lib/telegram'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const phone = process.env.VOLTURA_PHONE ?? '(719) 555-0100'

  // Today's date in YYYY-MM-DD (UTC date is fine — jobs are local-date strings)
  const today = new Date().toISOString().slice(0, 10)

  const { data: jobs, error } = await admin
    .from('jobs')
    .select('id, job_type, scheduled_time, customers(name, phone, sms_opt_out, address)')
    .eq('scheduled_date', today)
    .eq('status', 'Scheduled')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let sent = 0
  for (const job of jobs ?? []) {
    const customer = (job as Record<string, unknown>).customers as {
      name: string
      phone: string | null
      sms_opt_out: boolean
      address: string | null
    } | null
    if (!customer?.phone) continue

    const firstName = (customer.name ?? 'there').split(' ')[0]
    const timeStr = job.scheduled_time
      ? ` at ${String(job.scheduled_time).slice(0, 5)}`
      : ' today'
    const jobType = job.job_type as string

    const body =
      `Hi ${firstName}! Your Voltura Power Group technician is scheduled${timeStr} for your ${jobType}. ` +
      `To help us get started quickly, please: clear 3 ft in front of your electrical panel, ` +
      `unlock any gates or side access, and have a responsible adult home. ` +
      `Questions? Call or text us at ${phone}.`

    await sendSMS(customer.phone, body, customer.sms_opt_out)
    sent++
  }

  if (sent > 0) {
    void sendTelegram(`⏰ Day-of reminders sent for ${sent} job(s) scheduled today`)
  }

  return NextResponse.json({ sent, date: today })
}
