# Phase 4 — Follow-up Automation, Dispatch SMS & Maintenance Agreements

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three ServiceTitan-inspired features: automated estimate follow-ups via Telegram + SMS, dispatch notifications when a job goes "In Progress", and annual maintenance agreement tracking with renewal reminders.

**Architecture:** Twilio REST API (no SDK) handles SMS. A `lib/sms.ts` helper is the single send point. Two Vercel Cron routes fire daily at 14:00 UTC. Maintenance agreements live in a new DB table with server actions in `lib/actions/agreements.ts`. All features share the `customers.sms_opt_out` column for opt-out compliance.

**Tech Stack:** Next.js 15 App Router, Supabase (postgres), TypeScript, Tailwind CSS, Twilio REST API, Vercel Cron, existing `lib/telegram.ts` pattern for notifications.

---

## Pre-flight: DB migrations (run in Supabase SQL Editor before starting)

```sql
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_opt_out boolean NOT NULL DEFAULT false;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS follow_up_days integer NOT NULL DEFAULT 3;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS follow_up_sent_at timestamptz DEFAULT NULL;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS follow_up_dismissed boolean NOT NULL DEFAULT false;

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

## Environment Variables (add in Vercel + `.env.local`)

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+15551234567
VOLTURA_PHONE=+17205551234
CRON_SECRET=any-random-string-you-pick
APP_URL=https://your-app.vercel.app
```

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `volturaos/lib/sms.ts` | Create | Single Twilio send helper |
| `volturaos/app/api/sms/webhook/route.ts` | Create | STOP/UNSTOP opt-out webhook |
| `volturaos/lib/actions/jobs.ts` | Modify | Send dispatch SMS on "In Progress" |
| `volturaos/types/index.ts` | Modify | Add `sms_opt_out` to Customer, follow-up fields to Estimate, MaintenanceAgreement type |
| `volturaos/lib/actions/estimates.ts` | Modify | Add follow-up fields to saveEstimate, add `dismissFollowUp` |
| `volturaos/app/(app)/estimates/[id]/page.tsx` | Modify | Pass follow-up fields to EstimateBuilder |
| `volturaos/components/estimate-builder/EstimateBuilder.tsx` | Modify | Follow-up days input + dismiss banner (prop type update required) |
| `volturaos/app/(app)/estimates/page.tsx` | Modify | 🔔 badge on follow-up due estimates |
| `volturaos/app/api/cron/follow-ups/route.ts` | Create | Daily follow-up cron |
| `volturaos/lib/actions/agreements.ts` | Create | CRUD for maintenance agreements |
| `volturaos/components/customers/CustomerDetail.tsx` | Modify | Add maintenance plan button/badge |
| `volturaos/app/(app)/agreements/page.tsx` | Create | Agreements list with filter tabs |
| `volturaos/app/api/cron/renewals/route.ts` | Create | Daily renewal reminder cron |
| `volturaos/vercel.json` | Modify | Add cron schedule entries |
| `volturaos/app/(app)/page.tsx` | Modify | Add 🛡 Agreements link |

---

## Task 1: Twilio SMS Helper + Opt-out Webhook

**Files:**
- Create: `volturaos/lib/sms.ts`
- Create: `volturaos/app/api/sms/webhook/route.ts`

- [ ] **Step 1: Create SMS helper**

Create `volturaos/lib/sms.ts`:
```typescript
export async function sendSMS(to: string, body: string, optOut: boolean): Promise<void> {
  if (optOut) return
  if (!to || !process.env.TWILIO_ACCOUNT_SID) return

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
```

- [ ] **Step 2: Create opt-out webhook**

Create `volturaos/app/api/sms/webhook/route.ts`:
```typescript
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
```

- [ ] **Step 3: TypeScript check**
```bash
cd volturaos && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 4: Commit**
```bash
git add volturaos/lib/sms.ts volturaos/app/api/sms/webhook/route.ts
git commit -m "feat: add Twilio SMS helper and opt-out webhook"
```

---

## Task 2: Dispatch SMS on Job "In Progress"

**Files:**
- Modify: `volturaos/types/index.ts`
- Modify: `volturaos/lib/actions/jobs.ts`

- [ ] **Step 1: Add `sms_opt_out` to Customer type**

In `volturaos/types/index.ts`, add to the `Customer` interface:
```typescript
sms_opt_out: boolean
```

- [ ] **Step 2: Hook into updateJobStatus**

In `volturaos/lib/actions/jobs.ts`, the existing `updateJobStatus` already does a second DB query on line 97 to fetch job details for Telegram/Sheets:
```typescript
const { data } = await admin.from('jobs').select('job_type, customers(name)').eq('id', id).single()
```

**Extend this existing query** to also select `phone` and `sms_opt_out` from customers — no third query needed:

Add `import { sendSMS } from '@/lib/sms'` at the top of the file.

Change the existing select on line 97 from:
```typescript
const { data } = await admin.from('jobs').select('job_type, customers(name)').eq('id', id).single()
```
To:
```typescript
const { data } = await admin.from('jobs').select('job_type, customers(name, phone, sms_opt_out)').eq('id', id).single()
```

Then inside the `if (data)` block, after the existing `'In Progress'` Telegram line, add:
```typescript
if (status === 'In Progress') {
  try {
    const phone = (customers?.phone as string | null) ?? null
    const optOut = (customers?.sms_opt_out as boolean) ?? false
    if (phone) {
      await sendSMS(
        phone,
        `Hi ${customerName}, your Voltura Power Group technician is on the way!`,
        optOut
      )
    }
  } catch (err) {
    console.error('[Dispatch SMS] failed:', err)
  }
}
```

IMPORTANT: Read the existing `updateJobStatus` implementation before editing — preserve all existing logic (status update, Telegram notification, etc.). Only ADD the SMS block, do not replace anything.

- [ ] **Step 3: TypeScript check**
```bash
cd volturaos && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 4: Commit**
```bash
git add volturaos/types/index.ts volturaos/lib/actions/jobs.ts
git commit -m "feat: send dispatch SMS when job moves to In Progress"
```

---

## Task 3: Estimate Follow-Up — Types, Actions, and UI

**Files:**
- Modify: `volturaos/types/index.ts`
- Modify: `volturaos/lib/actions/estimates.ts`
- Modify: `volturaos/components/estimate-builder/EstimateBuilder.tsx`
- Modify: `volturaos/app/(app)/estimates/page.tsx`

- [ ] **Step 1: Add follow-up fields to Estimate type**

In `volturaos/types/index.ts`, add to `Estimate` interface:
```typescript
follow_up_days: number
follow_up_sent_at: string | null
follow_up_dismissed: boolean
```

- [ ] **Step 2: Update saveEstimate to persist follow_up_days**

In `volturaos/lib/actions/estimates.ts`, find `saveEstimate`. Add `followUpDays?: number` to its input type and write it to the DB:
```typescript
follow_up_days: input.followUpDays ?? 3,
```

- [ ] **Step 3: Add dismissFollowUp action**

In `volturaos/lib/actions/estimates.ts`, add (note: `requireAuth()` is already defined at the top of that file):
```typescript
export async function dismissFollowUp(estimateId: string): Promise<void> {
  await requireAuth()
  const admin = createAdminClient()
  const { error } = await admin
    .from('estimates')
    .update({ follow_up_dismissed: true })
    .eq('id', estimateId)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 4: Update estimates/[id]/page.tsx to pass follow-up fields**

In `volturaos/app/(app)/estimates/[id]/page.tsx`, read the file first. Find where `initialEstimate` is constructed and passed to `<EstimateBuilder>`. The estimate object fetched from `getEstimateById` now includes `follow_up_days`, `follow_up_sent_at`, and `follow_up_dismissed` (they're in the DB and in the `Estimate` type). Ensure these fields are passed through — they should be automatically if the full estimate object is spread. Check and confirm they reach `EstimateBuilder`.

- [ ] **Step 5: Update EstimateBuilder prop type and add follow-up UI**

In `volturaos/components/estimate-builder/EstimateBuilder.tsx`:

1. Find the `initialEstimate` prop type definition (an inline object type in the props interface, around lines 36-45). Add the three new fields:
```typescript
follow_up_days?: number
follow_up_sent_at?: string | null
follow_up_dismissed?: boolean
```

2. Update the existing imports from `@/lib/actions/estimates` to include `dismissFollowUp`:
```typescript
import { saveEstimate, duplicateEstimate, deleteEstimate, saveAsTemplate, dismissFollowUp } from '@/lib/actions/estimates'
```

3. Add state: `const [followUpDays, setFollowUpDays] = useState(initialEstimate?.follow_up_days ?? 3)`
4. Pass `followUpDays` to `saveEstimate` call
5. Add input below the estimate name field:
```tsx
<div className="flex items-center gap-2 mt-1">
  <span className="text-gray-500 text-xs">Follow up in</span>
  <input
    type="number"
    min={1}
    max={30}
    value={followUpDays}
    onChange={e => setFollowUpDays(Number(e.target.value))}
    className="w-12 bg-volturaNavy text-white text-xs rounded px-2 py-1 text-center"
  />
  <span className="text-gray-500 text-xs">days</span>
</div>
```

6. Add follow-up banner (shown when `initialEstimate?.follow_up_sent_at && !initialEstimate?.follow_up_dismissed`):
```tsx
{initialEstimate?.follow_up_sent_at && !initialEstimate?.follow_up_dismissed && (
  <div className="flex items-center justify-between bg-volturaNavy/80 rounded-xl px-4 py-2 mb-3">
    <span className="text-yellow-400 text-xs">
      🔔 Follow-up sent {new Date(initialEstimate.follow_up_sent_at!).toLocaleDateString()}
    </span>
    <button
      onClick={async () => {
        await dismissFollowUp(estimateId)
        router.refresh()
      }}
      className="text-gray-500 text-xs ml-3"
    >
      Dismiss
    </button>
  </div>
)}
```

- [ ] **Step 5: Add 🔔 badge to estimates list**

In `volturaos/app/(app)/estimates/page.tsx`, the `listEstimates()` action returns estimates with all fields. In the group card render, check if the anchor estimate has a pending follow-up:

```typescript
const hasFollowUp = anchor.follow_up_sent_at && !anchor.follow_up_dismissed && anchor.status === 'Sent'
```

Add the badge next to the estimate name/status:
```tsx
{hasFollowUp && <span className="text-yellow-400 text-xs ml-1">🔔</span>}
```

- [ ] **Step 6: TypeScript check**
```bash
cd volturaos && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 7: Commit**
```bash
git add volturaos/types/index.ts volturaos/lib/actions/estimates.ts volturaos/app/(app)/estimates/[id]/page.tsx volturaos/components/estimate-builder/EstimateBuilder.tsx volturaos/app/(app)/estimates/page.tsx
git commit -m "feat: add follow-up days input, dismiss banner, and list badge to estimates"
```

---

## Task 4: Follow-Up Cron Route

**Files:**
- Create: `volturaos/app/api/cron/follow-ups/route.ts`

- [ ] **Step 1: Create cron route**

Create `volturaos/app/api/cron/follow-ups/route.ts`:
```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegram } from '@/lib/telegram'
import { sendSMS } from '@/lib/sms'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const appUrl = process.env.APP_URL ?? ''

  const { data: estimates, error } = await admin
    .from('estimates')
    .select('id, total, follow_up_days, sent_at, customers(name, phone, sms_opt_out)')
    .eq('status', 'Sent')
    .is('proposal_id', null)
    .is('follow_up_sent_at', null)
    .eq('follow_up_dismissed', false)
    .not('sent_at', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filter in JS because follow_up_days varies per row (can't do in SQL without a computed column)
  const now = Date.now()
  const due = (estimates ?? []).filter((e) => {
    const sentAt = new Date(e.sent_at as string).getTime()
    const days = (e.follow_up_days as number) ?? 3
    return sentAt + days * 86400000 <= now
  })

  let count = 0
  for (const est of due) {
    const customer = (est as Record<string, unknown>).customers as {
      name: string; phone: string | null; sms_opt_out: boolean
    } | null
    const name = customer?.name ?? 'Customer'
    const total = (est as Record<string, unknown>).total
    const link = `${appUrl}/estimates/${est.id}/view`

    await sendTelegram(`📋 Follow-up due: ${name} — $${total?.toLocaleString()} — ${link}`)

    if (customer?.phone) {
      await sendSMS(
        customer.phone,
        `Hi ${name}, just checking in on your estimate from Voltura Power Group. Review it here: ${link}. Call us at ${process.env.VOLTURA_PHONE ?? ''} with any questions!`,
        customer.sms_opt_out
      )
    }

    await admin.from('estimates')
      .update({ follow_up_sent_at: new Date().toISOString() })
      .eq('id', est.id)

    count++
  }

  return NextResponse.json({ sent: count })
}
```

- [ ] **Step 2: TypeScript check**
```bash
cd volturaos && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Commit**
```bash
git add volturaos/app/api/cron/follow-ups/route.ts
git commit -m "feat: add daily estimate follow-up cron route"
```

---

## Task 5: Maintenance Agreements — Types and Actions

**Files:**
- Modify: `volturaos/types/index.ts`
- Create: `volturaos/lib/actions/agreements.ts`

- [ ] **Step 1: Add MaintenanceAgreement type**

In `volturaos/types/index.ts`, add after `InvoicePayment`:
```typescript
export interface MaintenanceAgreement {
  id: string
  customer_id: string
  price: number
  status: string  // 'Active' | 'Expired' | 'Cancelled'
  start_date: string
  renewal_date: string
  renewal_reminder_sent: boolean
  invoice_id: string | null
  notes: string | null
  created_at: string
}
```

- [ ] **Step 2: Create agreements server actions**

Create `volturaos/lib/actions/agreements.ts`:
```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegram } from '@/lib/telegram'
import { revalidatePath } from 'next/cache'
import type { MaintenanceAgreement } from '@/types'
import type { LineItem } from '@/types'

export async function createAgreement(customerId: string): Promise<void> {
  const admin = createAdminClient()

  // Get customer name
  const { data: customer } = await admin
    .from('customers')
    .select('name')
    .eq('id', customerId)
    .single()
  const name = customer?.name ?? 'Customer'

  // Create invoice
  const lineItems: LineItem[] = [{
    description: 'Annual Maintenance Plan',
    price: 199,
    is_override: false,
    original_price: 199,
  }]
  const { data: invoice, error: invErr } = await admin
    .from('invoices')
    .insert({
      customer_id: customerId,
      line_items: lineItems,
      total: 199,
      status: 'Unpaid',
    })
    .select('id')
    .single()
  if (invErr) throw new Error(invErr.message)

  // Renewal date = 1 year from today
  const renewalDate = new Date()
  renewalDate.setFullYear(renewalDate.getFullYear() + 1)

  const { error } = await admin.from('maintenance_agreements').insert({
    customer_id: customerId,
    price: 199,
    renewal_date: renewalDate.toISOString().split('T')[0],
    invoice_id: invoice.id,
  })
  if (error) throw new Error(error.message)

  void sendTelegram(`🛡 New maintenance agreement: ${name} — $199/yr`)
  revalidatePath(`/customers/${customerId}`)
  revalidatePath('/agreements')
}

export async function cancelAgreement(id: string, customerId: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('maintenance_agreements')
    .update({ status: 'Cancelled' })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/customers/${customerId}`)
  revalidatePath('/agreements')
}

export async function getActiveAgreement(customerId: string): Promise<MaintenanceAgreement | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('maintenance_agreements')
    .select('*')
    .eq('customer_id', customerId)
    .eq('status', 'Active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as MaintenanceAgreement) ?? null
}

export async function listAgreements(
  filter?: 'Active' | 'Expired' | 'Cancelled' | 'Expiring'
): Promise<(MaintenanceAgreement & { customer: { name: string } })[]> {
  const admin = createAdminClient()
  let query = admin
    .from('maintenance_agreements')
    .select('*, customers(name)')
    .order('renewal_date', { ascending: true })

  if (filter === 'Expiring') {
    const in30 = new Date()
    in30.setDate(in30.getDate() + 30)
    query = query
      .eq('status', 'Active')
      .lte('renewal_date', in30.toISOString().split('T')[0])
  } else if (filter) {
    query = query.eq('status', filter)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as Record<string, unknown>[]).map(({ customers, ...a }) => ({
    ...a, customer: customers,
  })) as (MaintenanceAgreement & { customer: { name: string } })[]
}
```

- [ ] **Step 3: TypeScript check**
```bash
cd volturaos && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 4: Commit**
```bash
git add volturaos/types/index.ts volturaos/lib/actions/agreements.ts
git commit -m "feat: add MaintenanceAgreement type and server actions"
```

---

## Task 6: Maintenance Agreement UI on Customer Detail

**Files:**
- Modify: `volturaos/components/customers/CustomerDetail.tsx`
- Modify: `volturaos/app/(app)/customers/[id]/page.tsx`

- [ ] **Step 1: Read CustomerDetail.tsx**

Read the full file before editing to understand its structure and props.

- [ ] **Step 2: Fetch active agreement in customer page**

In `volturaos/app/(app)/customers/[id]/page.tsx`, import `getActiveAgreement` and fetch it:
```typescript
import { getActiveAgreement } from '@/lib/actions/agreements'
// In the page function, parallel fetch:
const [customer, agreement] = await Promise.all([
  getCustomerById(id),
  getActiveAgreement(id),
])
// Pass to CustomerDetail:
<CustomerDetail customer={customer} agreement={agreement} />
```

- [ ] **Step 3: Add agreement UI to CustomerDetail**

In `volturaos/components/customers/CustomerDetail.tsx`:

1. Import `createAgreement`, `cancelAgreement` from `@/lib/actions/agreements` and `MaintenanceAgreement` from `@/types`
2. Add `agreement: MaintenanceAgreement | null` to props
3. Add `useTransition` for async actions
4. Add agreement section below the existing content:

```tsx
{/* Maintenance Agreement */}
<div className="bg-volturaNavy/50 rounded-xl p-4 mt-4">
  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Maintenance Plan</p>
  {agreement ? (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-green-400 text-sm font-semibold">🛡 Active — $199/yr</p>
          <p className="text-gray-400 text-xs mt-1">
            Renews {new Date(agreement.renewal_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={async () => {
            if (!window.confirm('Cancel maintenance plan?')) return
            startTransition(async () => {
              await cancelAgreement(agreement.id, customer.id)
              router.refresh()
            })
          }}
          disabled={isPending}
          className="text-red-400 text-xs disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      <ul className="mt-3 space-y-1">
        {['Annual panel inspection','Safety walkthrough / GFCI + AFCI test','Priority scheduling','10% labor discount','Free Level 1 diagnostic'].map(item => (
          <li key={item} className="text-gray-400 text-xs flex items-start gap-1">
            <span className="text-green-400 mt-0.5">✓</span> {item}
          </li>
        ))}
      </ul>
    </div>
  ) : (
    <button
      onClick={async () => {
        if (!window.confirm('Add annual maintenance plan for $199?')) return
        startTransition(async () => {
          await createAgreement(customer.id)
          router.refresh()
        })
      }}
      disabled={isPending}
      className="w-full bg-volturaGold/10 border border-volturaGold/30 text-volturaGold rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
    >
      {isPending ? 'Adding...' : '🛡 Add Maintenance Plan — $199/yr'}
    </button>
  )}
</div>
```

- [ ] **Step 4: TypeScript check**
```bash
cd volturaos && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 5: Commit**
```bash
git add volturaos/components/customers/CustomerDetail.tsx volturaos/app/(app)/customers/[id]/page.tsx
git commit -m "feat: add maintenance agreement UI to customer detail"
```

---

## Task 7: Agreements List Page + Dashboard Link

**Files:**
- Create: `volturaos/app/(app)/agreements/page.tsx`
- Modify: `volturaos/app/(app)/page.tsx`

- [ ] **Step 1: Create agreements list page**

Create `volturaos/app/(app)/agreements/page.tsx`:
```typescript
export const dynamic = 'force-dynamic'

import { listAgreements } from '@/lib/actions/agreements'
import { AgreementsList } from '@/components/agreements/AgreementsList'

export default async function AgreementsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter } = await searchParams
  const validFilter = ['Active','Expired','Cancelled','Expiring'].includes(filter ?? '')
    ? (filter as 'Active' | 'Expired' | 'Cancelled' | 'Expiring')
    : undefined
  const agreements = await listAgreements(validFilter)
  return <AgreementsList agreements={agreements} currentFilter={filter} />
}
```

- [ ] **Step 2: Create AgreementsList client component**

Create `volturaos/components/agreements/AgreementsList.tsx`:
```typescript
'use client'

import { useRouter } from 'next/navigation'
import type { MaintenanceAgreement } from '@/types'
import Link from 'next/link'

const FILTERS = ['All', 'Active', 'Expiring', 'Expired', 'Cancelled'] as const

const STATUS_COLORS: Record<string, string> = {
  Active: 'text-green-400',
  Expired: 'text-red-400',
  Cancelled: 'text-gray-500',
}

interface Props {
  agreements: (MaintenanceAgreement & { customer: { name: string } })[]
  currentFilter?: string
}

export function AgreementsList({ agreements, currentFilter }: Props) {
  const router = useRouter()

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="text-volturaGold text-xl font-bold mb-4">Agreements</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => router.push(f === 'All' ? '/agreements' : `/agreements?filter=${f}`)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors ${
              (f === 'All' && !currentFilter) || currentFilter === f
                ? 'bg-volturaGold text-volturaBlue border-volturaGold'
                : 'bg-transparent text-gray-400 border-gray-600'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {agreements.length === 0 ? (
        <p className="text-gray-500 text-sm">No agreements found.</p>
      ) : (
        <div className="space-y-2">
          {agreements.map(a => (
            <Link key={a.id} href={`/customers/${a.customer_id}`} className="block bg-volturaNavy rounded-xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-white font-semibold text-sm">{a.customer.name}</p>
                <span className={`text-xs font-semibold ${STATUS_COLORS[a.status] ?? 'text-gray-400'}`}>
                  {a.status}
                </span>
              </div>
              <p className="text-gray-400 text-xs mt-1">
                Renews {new Date(a.renewal_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${a.price}/yr
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add Agreements link to dashboard**

In `volturaos/app/(app)/page.tsx`, find the settings links row and add the Agreements link:
```tsx
<Link href="/agreements" className="text-gray-500 text-xs underline">
  🛡 Agreements
</Link>
```

- [ ] **Step 4: TypeScript check**
```bash
cd volturaos && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 5: Commit**
```bash
git add volturaos/app/(app)/agreements/page.tsx volturaos/components/agreements/AgreementsList.tsx volturaos/app/(app)/page.tsx
git commit -m "feat: add agreements list page and dashboard nav link"
```

---

## Task 8: Renewal Cron + Vercel Config

**Files:**
- Create: `volturaos/app/api/cron/renewals/route.ts`
- Modify: `volturaos/vercel.json`

- [ ] **Step 1: Create renewal cron route**

Create `volturaos/app/api/cron/renewals/route.ts`:
```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegram } from '@/lib/telegram'
import { sendSMS } from '@/lib/sms'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
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

    await admin.from('maintenance_agreements')
      .update({ renewal_reminder_sent: true })
      .eq('id', a.id)

    reminders++
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
```

- [ ] **Step 2: Update vercel.json**

Read `volturaos/vercel.json` first. Update it to add cron entries:
```json
{
  "framework": "nextjs",
  "crons": [
    { "path": "/api/cron/follow-ups", "schedule": "0 14 * * *" },
    { "path": "/api/cron/renewals",   "schedule": "0 14 * * *" }
  ]
}
```

- [ ] **Step 3: TypeScript check**
```bash
cd volturaos && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 4: Commit and push**
```bash
git add volturaos/app/api/cron/renewals/route.ts volturaos/vercel.json
git commit -m "feat: add renewal cron route and Vercel cron schedule"
git push origin master
```
