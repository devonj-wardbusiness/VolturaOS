import { createAdminClient } from '@/lib/supabase/admin'
import { sendSMS } from '@/lib/sms'
import { sendTelegram } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const admin = createAdminClient()

  // Get plans due within 30 days and not yet reminded
  const today = new Date().toISOString().slice(0, 10)
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  const { data: plans, error } = await admin
    .from('maintenance_plans')
    .select('*, customers(name, phone, sms_opt_out)')
    .eq('status', 'Active')
    .gte('next_due', today)
    .lte('next_due', in30)

  if (error) {
    console.error('Maintenance cron error:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  for (const plan of plans ?? []) {
    const customer = plan.customers as { name: string; phone: string | null; sms_opt_out?: boolean } | null
    if (!customer?.phone || customer.sms_opt_out) continue
    const optOut = customer.sms_opt_out ?? false

    const serviceDate = new Date(plan.next_due + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    })

    const body =
      `🔧 ${customer.name} — Your annual electrical maintenance with Voltura Power Group is coming up!\n\n` +
      `📅 Scheduled: ${serviceDate}\n` +
      `Plan: ${plan.plan_name}\n\n` +
      `We'll reach out soon to confirm your appointment time.\n` +
      `Questions? Call/text us: (719) 659-9300\n\n` +
      `Reply STOP to unsubscribe.`

    await sendSMS(customer.phone, body, optOut)
    sent++
  }

  await sendTelegram(`🔧 Maintenance reminders: ${sent} SMS sent for upcoming plans (within 30 days)`)

  return Response.json({ ok: true, sent })
}
