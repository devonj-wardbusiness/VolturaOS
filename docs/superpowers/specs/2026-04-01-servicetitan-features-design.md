# VolturaOS Phase 4 — ServiceTitan-Inspired Features Design
**Date:** 2026-04-01
**Status:** Approved for implementation

---

## Overview

Three features inspired by ServiceTitan's highest-value small-contractor workflows:

1. **Estimate follow-up automation** — configurable per-estimate follow-up timer, Telegram ping + in-app badge + customer SMS
2. **Dispatch SMS notification** — auto-text customer when job moves to "In Progress"
3. **Maintenance agreements** — annual electrical plans with auto-renewal reminders

All SMS delivery uses Twilio. A daily Vercel Cron job drives follow-up and renewal checks.

---

## Shared Infrastructure: Twilio SMS

### Setup (one-time, done by contractor)
1. Sign up at twilio.com — free trial gives ~$15 credit
2. Get Account SID, Auth Token, and a Twilio phone number
3. Add to Vercel env vars (and `volturaos/.env.local` for local dev):
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_FROM_NUMBER` — E.164 format, e.g. `+15551234567`
   - `VOLTURA_PHONE` — contractor's business phone shown in SMS body
   - `CRON_SECRET` — random secret string for securing cron routes
   - `APP_URL` — e.g. `https://voltura.vercel.app` (no trailing slash, server-only, no NEXT_PUBLIC_ prefix)
4. In the Twilio Console: Phone Numbers → Active Numbers → your number → Messaging Configuration → set **"A message comes in"** webhook to `https://[APP_URL]/api/sms/webhook` (HTTP POST)

### SMS helper

Create `volturaos/lib/sms.ts`:

```typescript
export async function sendSMS(to: string, body: string, optOut: boolean): Promise<void>
```

- Accepts `optOut: boolean` — callers are responsible for passing the customer's `sms_opt_out` value; if `true`, returns immediately without sending
- Uses Twilio REST API directly via `fetch` (no SDK needed)
- POST to `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`
- Appends `" Reply STOP to opt out."` to body if not already present
- Logs errors to console but does NOT throw (SMS failure must never crash a job action)

### Customer opt-out webhook

Create `volturaos/app/api/sms/webhook/route.ts`:
- Receives Twilio HTTP POST when customer texts the Twilio number
- Parses `Body` field from form-encoded body (Twilio sends `application/x-www-form-urlencoded`)
- Normalizes body to uppercase and trims whitespace
- Opt-out keywords: `STOP`, `STOPALL`, `UNSUBSCRIBE`, `CANCEL`, `END`, `QUIT` → set `sms_opt_out = true`
- Opt-in keywords: `START`, `YES`, `UNSTOP` → set `sms_opt_out = false`
- Looks up customer by `From` phone number using `.limit(1)` (not `.single()` — phone is not unique); updates all matching rows
- Returns 200 with empty TwiML: `<Response></Response>` and `Content-Type: text/xml`
- Note: Twilio handles carrier-level STOP compliance automatically; this webhook only syncs the flag into the DB

### DB changes for SMS

```sql
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_opt_out boolean NOT NULL DEFAULT false;
```

---

## Feature 1: Estimate Follow-Up Automation

### Goal
Sent estimates that go unanswered get a follow-up nudge after a configurable number of days.

### Scope note
Follow-up only applies to **anchor estimates** (those that are themselves proposals or solo estimates — i.e. where `proposal_id IS NULL`). Proposal child estimates are not eligible for individual follow-up. This simplifies badge display on the grouped estimates list.

### DB migration

```sql
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS follow_up_days integer NOT NULL DEFAULT 3;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS follow_up_sent_at timestamptz DEFAULT NULL;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS follow_up_dismissed boolean NOT NULL DEFAULT false;
```

### Trigger logic — cron job

Route: `GET /api/cron/follow-ups`
Schedule: `0 14 * * *` (14:00 UTC — 9:00 AM EST / 10:00 AM EDT; acceptable drift for a nudge feature)
Security: checks `Authorization: Bearer ${CRON_SECRET}` header — returns 401 if missing/wrong

Query:
```sql
SELECT e.*, c.name, c.phone, c.sms_opt_out
FROM estimates e
JOIN customers c ON c.id = e.customer_id
WHERE e.status = 'Sent'
  AND e.proposal_id IS NULL
  AND e.follow_up_sent_at IS NULL
  AND e.follow_up_dismissed = false
  AND e.sent_at IS NOT NULL
  AND e.sent_at + (e.follow_up_days * interval '1 day') <= now()
```

For each matching estimate:
1. Send Telegram: `📋 Follow-up due: [Customer Name] — $[Total] — ${APP_URL}/estimates/[id]/view`
2. Send customer SMS (if phone exists): `Hi [Name], just checking in on your estimate from Voltura Power Group. Review it here: ${APP_URL}/estimates/[id]/view. Call us at [VOLTURA_PHONE] with any questions!`
3. Set `follow_up_sent_at = now()`

### In-app badge

On the `/estimates` list page, show a 🔔 badge on any estimate group card where the anchor estimate has:
- `follow_up_sent_at IS NOT NULL`
- `status = 'Sent'`
- `follow_up_dismissed = false`

The `listEstimates()` action already returns estimate data — add these three fields to the select and pass through to the UI.

On the estimate detail page (`EstimateBuilder`), show a dismissible banner: `"🔔 Follow-up sent — [date]"` with a "Dismiss" button that calls `dismissFollowUp(estimateId)` (sets `follow_up_dismissed = true`).

### UI — EstimateBuilder

Below the estimate name input, add:
```
Follow up in [___] days
```
Number input, min 1, max 30, default 3. Saved with the estimate via `saveEstimate`.

### Server actions to add to `estimates.ts`

```typescript
export async function dismissFollowUp(estimateId: string): Promise<void>
// Sets follow_up_dismissed = true on the given estimate
```

---

## Feature 2: Dispatch SMS Notification

### Goal
When a job moves to "In Progress", the customer automatically receives an SMS.

### Trigger

In `volturaos/lib/actions/jobs.ts`, the existing `updateJobStatus(jobId, status)` action. When `status === 'In Progress'`:
1. Fetch the job joined with customer: `id, name, phone, sms_opt_out`
2. If `customer.phone` exists, call `sendSMS(customer.phone, message, customer.sms_opt_out)`:
   > `Hi [Name], your Voltura Power Group technician is on the way! Reply STOP to opt out.`
3. SMS failure must not block the status update — wrap in try/catch, log error only

### No new UI
Fully automatic from the existing status change button in `JobDetail.tsx`.

---

## Feature 3: Maintenance Agreements

### Goal
Sell and track annual electrical maintenance plans ($199/year). Remind contractor + customer 30 days before renewal. Auto-expire agreements past their renewal date.

### Plan contents (display only — not stored in DB)
- Annual panel inspection
- Safety walkthrough / GFCI + AFCI test
- Priority scheduling (jump the queue)
- 10% labor discount on all jobs
- Free Level 1 diagnostic call

### DB migration

```sql
CREATE TABLE IF NOT EXISTS maintenance_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  price numeric NOT NULL DEFAULT 199,
  status text NOT NULL DEFAULT 'Active',  -- 'Active' | 'Expired' | 'Cancelled'
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  renewal_date date NOT NULL,             -- set to start_date + 1 year on insert
  renewal_reminder_sent boolean NOT NULL DEFAULT false,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Auto-renewal behavior

The system does **not** auto-renew agreements. When `renewal_date` passes, the agreement is marked `Expired`. The contractor manually creates a new agreement (and new invoice) for the next year. `renewal_reminder_sent` never needs to reset because a new agreement row is created each year.

### Server actions — `volturaos/lib/actions/agreements.ts` (new file)

```typescript
export async function createAgreement(customerId: string): Promise<void>
// Inserts agreement with renewal_date = CURRENT_DATE + interval '1 year'
// Creates invoice: line_items = [{ description: 'Annual Maintenance Plan', price: 199, is_override: false, original_price: 199 }], total = 199
// Stores invoice id in agreement.invoice_id
// Sends Telegram: "🛡 New maintenance agreement: [Customer Name] — $199"

export async function cancelAgreement(id: string): Promise<void>
// Sets status = 'Cancelled'

export async function getActiveAgreement(customerId: string): Promise<MaintenanceAgreement | null>
// Returns active agreement for customer, or null

export async function listAgreements(filter?: 'Active' | 'Expired' | 'Cancelled' | 'Expiring'): Promise<(MaintenanceAgreement & { customer: { name: string } })[]>
// 'Expiring' = Active agreements where renewal_date <= now() + 30 days
// Ordered by renewal_date ascending

export interface MaintenanceAgreement {
  id: string
  customer_id: string
  price: number
  status: string
  start_date: string
  renewal_date: string
  renewal_reminder_sent: boolean
  invoice_id: string | null
  notes: string | null
  created_at: string
}
```

### UI — Customer detail page

Add to `CustomerDetail.tsx`:
- If no active agreement: show "🛡 Add Maintenance Plan ($199/yr)" button
- Tapping shows a confirmation sheet listing the 5 plan benefits + price
- Confirming calls `createAgreement(customerId)` and shows success message
- If active agreement exists: show a green "🛡 Maintenance Plan Active — renews [date]" badge with a "Cancel" option

### UI — Agreements list page

New route: `volturaos/app/(app)/agreements/page.tsx`
`export const dynamic = 'force-dynamic'`

Layout:
- Header: "Agreements"
- Filter tabs: All | Active | Expiring | Expired
- Each row: customer name, renewal date, status badge, price
- Tap row: links to customer detail page

### Navigation

Add Agreements to the **Settings area** rather than the bottom nav (which is already at 5 tabs and would overflow on small phones at 6).

On the dashboard (`app/(app)/page.tsx`), add a third settings link alongside Pricebook and Templates:
```tsx
<Link href="/agreements" className="text-gray-500 text-xs underline">🛡 Agreements</Link>
```

Also add a link from the customer detail page (via the active agreement badge).

### Renewal cron

Route: `GET /api/cron/renewals`
Schedule: `0 14 * * *`
Security: same `CRON_SECRET` bearer token check

**Step 1 — Send reminders:**
```sql
SELECT ma.*, c.name, c.phone, c.sms_opt_out
FROM maintenance_agreements ma
JOIN customers c ON c.id = ma.customer_id
WHERE ma.status = 'Active'
  AND ma.renewal_reminder_sent = false
  AND ma.renewal_date <= CURRENT_DATE + interval '30 days'
```
For each:
1. Send Telegram: `🔄 Renewal in [days] days: [Customer Name] — renewal [date]`
2. Send customer SMS: `Hi [Name], your Voltura Power Group annual maintenance plan renews on [date]. Call us to schedule your inspection!`
3. Set `renewal_reminder_sent = true`

**Step 2 — Expire overdue agreements:**
```sql
UPDATE maintenance_agreements
SET status = 'Expired'
WHERE status = 'Active'
  AND renewal_date < CURRENT_DATE
```

---

## Full DB Migrations

```sql
-- Twilio SMS opt-out
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_opt_out boolean NOT NULL DEFAULT false;

-- Estimate follow-up
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS follow_up_days integer NOT NULL DEFAULT 3;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS follow_up_sent_at timestamptz DEFAULT NULL;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS follow_up_dismissed boolean NOT NULL DEFAULT false;

-- Maintenance agreements
CREATE TABLE IF NOT EXISTS maintenance_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  price numeric NOT NULL DEFAULT 199,
  status text NOT NULL DEFAULT 'Active',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  renewal_date date NOT NULL,
  renewal_reminder_sent boolean NOT NULL DEFAULT false,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

---

## Vercel Cron Configuration

Update `volturaos/vercel.json`:
```json
{
  "framework": "nextjs",
  "crons": [
    { "path": "/api/cron/follow-ups", "schedule": "0 14 * * *" },
    { "path": "/api/cron/renewals",   "schedule": "0 14 * * *" }
  ]
}
```

---

## New Environment Variables

| Variable | Where set | Purpose |
|----------|-----------|---------|
| `TWILIO_ACCOUNT_SID` | Vercel + .env.local | Twilio account ID |
| `TWILIO_AUTH_TOKEN` | Vercel + .env.local | Twilio auth token |
| `TWILIO_FROM_NUMBER` | Vercel + .env.local | Twilio phone number (E.164) |
| `VOLTURA_PHONE` | Vercel + .env.local | Business phone shown in SMS |
| `CRON_SECRET` | Vercel only | Secures cron route |
| `APP_URL` | Vercel + .env.local | App base URL, no trailing slash |

---

## Build Order

1. Twilio SMS helper (`lib/sms.ts`) + opt-out webhook (`/api/sms/webhook`) + DB migration for `sms_opt_out`
2. Dispatch SMS — hook into `updateJobStatus` in `lib/actions/jobs.ts`
3. Estimate follow-up — DB migration, `saveEstimate` update, EstimateBuilder UI, `dismissFollowUp` action, badge on list, cron route
4. Maintenance agreements — DB migration, `lib/actions/agreements.ts`, customer detail UI
5. Agreements list page (`/agreements`) + dashboard nav link
6. Renewal cron route (`/api/cron/renewals`)
7. Update `vercel.json` with cron schedules, push, deploy
