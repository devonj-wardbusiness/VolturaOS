import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegram } from '@/lib/telegram'
import { sendSMS } from '@/lib/sms'
import Anthropic from '@anthropic-ai/sdk'

const ai = new Anthropic()

// Twilio signature validation — prevents spoofed webhooks
function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) return false

  // Sort params alphabetically and concatenate
  const sorted = Object.keys(params).sort().map((k) => `${k}${params[k]}`).join('')
  const str = url + sorted
  const expected = crypto
    .createHmac('sha1', authToken)
    .update(Buffer.from(str, 'utf-8'))
    .digest('base64')

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

async function qualifyLead(message: string, fromPhone: string): Promise<{
  intent: string
  jobType: string
  urgency: 'Low' | 'Medium' | 'High'
  reply: string
}> {
  const volturaPhone = process.env.VOLTURA_PHONE ?? '(719) 555-0100'

  const msg = await ai.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content:
          `You are the AI receptionist for Voltura Power Group, a licensed electrical contractor ` +
          `in Colorado Springs, CO. A potential customer just texted this number.\n\n` +
          `Customer phone: ${fromPhone}\n` +
          `Message: "${message}"\n\n` +
          `Respond with JSON only:\n` +
          `{\n` +
          `  "intent": "lead | existing_customer | spam | other",\n` +
          `  "jobType": "Panel Upgrade | EV Charger | New Circuit | Service Call | Inspection | Unknown",\n` +
          `  "urgency": "Low | Medium | High",\n` +
          `  "reply": "...(friendly, professional SMS reply under 160 chars. Sign as Voltura Power Group. Include ${volturaPhone} to call.)"\n` +
          `}\n` +
          `JSON only — no explanation.`,
      },
    ],
  })

  try {
    const block = msg.content[0]
    if (block.type !== 'text') throw new Error()
    const raw = block.text.match(/\{[\s\S]*\}/)
    if (!raw) throw new Error()
    return JSON.parse(raw[0])
  } catch {
    return {
      intent: 'lead',
      jobType: 'Unknown',
      urgency: 'Medium',
      reply: `Hi! Thanks for reaching out to Voltura Power Group. We'll get back to you shortly. Call us at ${process.env.VOLTURA_PHONE ?? ''} for faster service.`,
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const params = Object.fromEntries(new URLSearchParams(body))

    // Validate Twilio signature (skip in dev if no auth token configured)
    const signature = req.headers.get('x-twilio-signature') ?? ''
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/inbound`
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (authToken && signature && !validateTwilioSignature(signature, url, params)) {
      console.warn('[twilio/inbound] Invalid signature')
      return new NextResponse('Forbidden', { status: 403 })
    }

    const fromPhone = params.From ?? ''
    const messageBody = (params.Body ?? '').trim()
    const toPhone = params.To ?? ''

    if (!fromPhone || !messageBody) {
      return new NextResponse('OK', { status: 200 })
    }

    // Handle opt-out
    if (/^STOP$/i.test(messageBody)) {
      const admin = createAdminClient()
      await admin.from('customers').update({ sms_opt_out: true }).eq('phone', fromPhone)
      return new NextResponse('OK', { status: 200 })
    }

    // Qualify the lead with AI
    const { intent, jobType, urgency, reply } = await qualifyLead(messageBody, fromPhone)

    // Skip spam
    if (intent === 'spam') {
      return new NextResponse('OK', { status: 200 })
    }

    // Check if customer already exists
    const admin = createAdminClient()
    const { data: existing } = await admin
      .from('customers')
      .select('id, name')
      .eq('phone', fromPhone)
      .maybeSingle()

    let customerName = existing?.name ?? fromPhone
    let customerId = existing?.id ?? null

    // Create customer if new lead
    if (!existing && intent === 'lead') {
      const { data: newCustomer } = await admin
        .from('customers')
        .insert({
          name: `Lead — ${fromPhone}`,
          phone: fromPhone,
          notes: `Inbound lead via SMS: "${messageBody}"`,
        })
        .select('id, name')
        .single()

      if (newCustomer) {
        customerId = newCustomer.id
        customerName = newCustomer.name
      }
    }

    // Send auto-reply
    await sendSMS(fromPhone, reply, false)

    // Telegram alert
    const urgencyEmoji = urgency === 'High' ? '🔴' : urgency === 'Medium' ? '🟡' : '🟢'
    const customerLink = customerId ? `\nhttps://volturaos.vercel.app/customers/${customerId}` : ''
    await sendTelegram(
      `${urgencyEmoji} Inbound SMS Lead\n` +
      `From: ${fromPhone}\n` +
      `Job: ${jobType} · ${urgency} urgency\n` +
      `Message: "${messageBody}"` +
      customerLink
    )

    return new NextResponse('OK', { status: 200 })
  } catch (err) {
    console.error('[twilio/inbound]', err)
    return new NextResponse('Error', { status: 500 })
  }
}
