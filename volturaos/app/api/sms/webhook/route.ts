import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const OPT_OUT = new Set(['STOP','STOPALL','UNSUBSCRIBE','CANCEL','END','QUIT'])
const OPT_IN  = new Set(['START','YES','UNSTOP'])

export async function POST(req: NextRequest) {
  const text = await req.text()
  const params = new URLSearchParams(text)
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
