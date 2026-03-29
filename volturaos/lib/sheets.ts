// Server-only: never import from client components
import { createSign } from 'crypto'

export type SheetsTab = 'Jobs' | 'Estimates' | 'Invoices' | 'Customers' | 'Payments'

function base64url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function getAccessToken(): Promise<string | null> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) return null

  let sa: { client_email: string; private_key: string }
  try {
    sa = JSON.parse(raw)
  } catch {
    console.warn('[Sheets] Invalid GOOGLE_SERVICE_ACCOUNT_JSON')
    return null
  }

  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }))

  const signing = `${header}.${payload}`
  const sign = createSign('RSA-SHA256')
  sign.update(signing)
  const sig = base64url(sign.sign(sa.private_key))
  const jwt = `${signing}.${sig}`

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    })
    const data = await res.json() as { access_token?: string }
    return data.access_token ?? null
  } catch {
    return null
  }
}

// Column order per tab — matches the header row in the Google Sheet
const TAB_COLUMNS: Record<SheetsTab, string[]> = {
  Jobs: ['Timestamp', 'JobID', 'CustomerName', 'JobType', 'Status', 'ScheduledDate', 'Notes'],
  Estimates: ['Timestamp', 'EstimateID', 'CustomerName', 'JobType', 'Total', 'Status'],
  Invoices: ['Timestamp', 'InvoiceID', 'CustomerName', 'Total', 'AmountPaid', 'Balance', 'Status'],
  Customers: ['Timestamp', 'CustomerID', 'Name', 'Phone', 'Email', 'Address', 'City', 'PropertyType'],
  Payments: ['Timestamp', 'InvoiceID', 'CustomerName', 'Amount', 'Method', 'Notes'],
}

export async function syncToSheets(tab: SheetsTab, data: Record<string, unknown>): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEETS_ID
  if (!sheetId) return // graceful no-op until configured

  const token = await getAccessToken()
  if (!token) return

  const columns = TAB_COLUMNS[tab]
  const row = columns.map((col) => {
    const val = data[col]
    if (val === null || val === undefined) return ''
    return String(val)
  })

  try {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tab)}!A1:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [row] }),
      }
    )
  } catch {
    console.warn(`[Sheets] Failed to sync to ${tab} tab`)
  }
}
