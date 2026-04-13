import { createAdminClient } from '@/lib/supabase/admin'
import { sendSMS } from '@/lib/sms'
import { sendTelegram } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

// Runs daily at 9AM MT — sends SMS reminders at 14, 30, and 60 days overdue
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const admin = createAdminClient()

  const { data: invoices, error } = await admin
    .from('invoices')
    .select('*, customers(name, phone, sms_opt_out)')
    .in('status', ['Unpaid', 'Partial'])

  if (error) {
    console.error('Invoice reminder cron error:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }

  const volturaPhone = process.env.VOLTURA_PHONE ?? '(719) 659-9300'
  let sent = 0

  for (const inv of invoices ?? []) {
    const customer = inv.customers as { name: string; phone: string | null; sms_opt_out: boolean } | null
    if (!customer?.phone || customer.sms_opt_out) continue

    // Calculate days since invoice created (or since due date)
    const dueMs = inv.due_date
      ? new Date(inv.due_date + 'T00:00:00').getTime()
      : new Date(inv.created_at).getTime() + 30 * 86400000
    const daysOverdue = Math.floor((Date.now() - dueMs) / 86400000)

    // Only send at specific milestones
    if (![14, 30, 60].includes(daysOverdue)) continue

    const balance = `$${(inv.balance ?? inv.total).toLocaleString()}`
    const shortId = inv.id.slice(0, 8).toUpperCase()

    let body = ''
    if (daysOverdue === 14) {
      body =
        `Hi ${customer.name}! This is a friendly reminder that invoice #${shortId} from Voltura Power Group has a balance of ${balance} due.\n\n` +
        `Questions? Call/text us at ${volturaPhone}\n\n` +
        `Reply STOP to unsubscribe.`
    } else if (daysOverdue === 30) {
      body =
        `${customer.name}, invoice #${shortId} from Voltura Power Group is 30 days past due — balance ${balance}.\n\n` +
        `Please call or text us at ${volturaPhone} to make a payment or set up a payment plan.\n\n` +
        `Reply STOP to unsubscribe.`
    } else if (daysOverdue === 60) {
      body =
        `URGENT — ${customer.name}, invoice #${shortId} from Voltura Power Group is 60 days past due — balance ${balance}.\n\n` +
        `Please contact us immediately at ${volturaPhone} to avoid further action.\n\n` +
        `Reply STOP to unsubscribe.`
    }

    if (!body) continue
    await sendSMS(customer.phone, body, false)
    sent++

    // Telegram ping for each one
    void sendTelegram(`💸 Invoice reminder sent — ${customer.name} — ${balance} — ${daysOverdue}d overdue`)
  }

  return Response.json({ ok: true, sent })
}
