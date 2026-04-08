export async function sendSMS(to: string, body: string, optOut: boolean): Promise<void> {
  if (optOut) return
  if (!to || !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_FROM_NUMBER) return

  const message = body.includes('Reply STOP') ? body : `${body} Reply STOP to opt out.`

  const params = new URLSearchParams({
    To: to,
    From: process.env.TWILIO_FROM_NUMBER!,
    Body: message,
  })

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(
            `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
          ).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      console.error('[SMS] send failed:', err)
    }
  } catch (err) {
    console.error('[SMS] network error:', err)
  }
}

export async function sendJobScheduledSMS(
  phone: string | null | undefined,
  optOut: boolean,
  date: string,
  time: string | null
): Promise<void> {
  if (!phone) return
  const dateStr = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const timeStr = time ? ` at ${time.slice(0, 5)}` : ''
  await sendSMS(
    phone,
    `Your job with Voltura Power Group is scheduled for ${dateStr}${timeStr}. We'll see you then!`,
    optOut
  )
}

export async function sendOnMyWaySMS(
  phone: string | null | undefined,
  optOut: boolean
): Promise<void> {
  if (!phone) return
  await sendSMS(phone, `We're on our way! Your Voltura Power Group technician is headed your way.`, optOut)
}

export async function sendJobCompleteSMS(
  phone: string | null | undefined,
  optOut: boolean
): Promise<void> {
  if (!phone) return
  const reviewLink = process.env.GOOGLE_REVIEW_LINK ?? 'https://g.page/r/YOUR_REVIEW_LINK'
  await sendSMS(
    phone,
    `Job complete! Thank you for choosing Voltura Power Group. Mind leaving us a quick review? ${reviewLink}`,
    optOut
  )
}
