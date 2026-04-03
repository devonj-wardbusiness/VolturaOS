import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

const OPT_OUT = new Set(['STOP','STOPALL','UNSUBSCRIBE','CANCEL','END','QUIT'])
const OPT_IN  = new Set(['START','YES','UNSTOP'])

function validateTwilioSignature(
  authToken: string,
  twilioSignature: string,
  url: string,
  params: URLSearchParams
): boolean {
  // Sort params alphabetically and concatenate: url + key1value1key2value2...
  const sortedKeys = Array.from(params.keys()).sort()
  const data = url + sortedKeys.map(k => k + (params.get(k) ?? '')).join('')
  const expected = createHmac('sha1', authToken).update(data).digest('base64')
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== twilioSignature.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ twilioSignature.charCodeAt(i)
  }
  return diff === 0
}

export async function POST(req: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const twilioSignature = req.headers.get('x-twilio-signature') ?? ''
  const url = req.url

  const text = await req.text()
  const params = new URLSearchParams(text)

  // Validate signature when authToken is configured (skip in local dev when token is empty)
  if (authToken) {
    const valid = validateTwilioSignature(authToken, twilioSignature, url, params)
    if (!valid) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  const from = params.get('From') ?? ''
  const body = (params.get('Body') ?? '').trim().toUpperCase()

  if (from) {
    const admin = createAdminClient()
    const optOut = OPT_OUT.has(body)
    const optIn  = OPT_IN.has(body)
    if (optOut || optIn) {
      await admin.from('customers')
        .update({ sms_opt_out: optOut })
        .eq('phone', from)
    }
  }

  return new NextResponse('<Response></Response>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}
