# Referral Widget + Post-Job Review SMS Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a referral capture form to the public estimate view AND send review+referral SMS automatically when a job completes or an invoice is paid in full.

**Architecture:** Three independent pieces — (1) a new `referrals` table + server action + client form rendered at the bottom of the public estimate page, (2) enhancements to the existing `sendJobCompleteSMS` path in `updateJobStatus` gated by a new `review_requested_at` column, (3) a new `sendInvoicePaidReviewSMS` call inside `recordPayment` gated the same way. No new infrastructure — all hooks into existing Twilio + Telegram patterns.

**Tech Stack:** Next.js 15 App Router · Supabase (admin client) · TypeScript · Tailwind CSS v4 · Twilio (existing `lib/sms.ts`)

---

## ⚠️ PRE-FLIGHT — Run this SQL in Supabase first

Go to Supabase → SQL Editor → run:

```sql
-- Referral capture table
CREATE TABLE IF NOT EXISTS referrals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id  UUID REFERENCES estimates(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  phone        TEXT NOT NULL,
  project_notes TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Gate columns to prevent duplicate review SMS
ALTER TABLE jobs     ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ;
```

Confirm all three changes show "Success" before starting Task 1.

---

## Task 1: Update types

**Files:**
- Modify: `volturaos/types/index.ts`

- [ ] Add `Referral` interface and `review_requested_at` to `Job` and `Invoice`

```typescript
// Add after InvoicePayment interface (~line 180):
export interface Referral {
  id: string
  estimate_id: string | null
  name: string
  phone: string
  project_notes: string | null
  created_at: string
}
```

```typescript
// In Job interface — add after completed_at:
  review_requested_at: string | null
```

```typescript
// In Invoice interface — add after status:
  review_requested_at: string | null
```

- [ ] Verify TypeScript compiles: `cd volturaos && npx tsc --noEmit`

---

## Task 2: Referral server action

**Files:**
- Create: `volturaos/lib/actions/referrals.ts`

- [ ] Create the file:

```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegram } from '@/lib/telegram'
import type { Referral } from '@/types'

export async function createReferral(input: {
  estimateId: string
  name: string
  phone: string
  projectNotes?: string
}): Promise<Referral> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('referrals')
    .insert({
      estimate_id: input.estimateId,
      name: input.name,
      phone: input.phone,
      project_notes: input.projectNotes ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)

  void sendTelegram(
    `👥 New referral!\nName: ${input.name}\nPhone: ${input.phone}${input.projectNotes ? `\nProject: ${input.projectNotes}` : ''}`
  )

  return data as Referral
}
```

- [ ] Verify TypeScript: `npx tsc --noEmit`

---

## Task 3: ReferralForm client component

**Files:**
- Create: `volturaos/components/estimates/ReferralForm.tsx`

- [ ] Create the component:

```typescript
'use client'

import { useState } from 'react'
import { createReferral } from '@/lib/actions/referrals'

export function ReferralForm({ estimateId }: { estimateId: string }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    setLoading(true)
    setError(null)
    try {
      await createReferral({
        estimateId,
        name: name.trim(),
        phone: phone.trim(),
        projectNotes: notes.trim() || undefined,
      })
      setSubmitted(true)
    } catch {
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-volturaNavy rounded-2xl p-5 text-center">
        <p className="text-2xl mb-2">🙏</p>
        <p className="text-white font-semibold">Thanks for the referral!</p>
        <p className="text-gray-400 text-sm mt-1">We'll reach out to them soon.</p>
      </div>
    )
  }

  return (
    <div className="bg-volturaNavy rounded-2xl p-5">
      <p className="text-volturaGold font-semibold text-sm uppercase tracking-wider mb-1">
        Know someone who needs electrical work?
      </p>
      <p className="text-gray-400 text-sm mb-4">
        Send a friend our way — we'll take great care of them.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Their name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full bg-white/10 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-volturaGold"
        />
        <input
          type="tel"
          placeholder="Their phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="w-full bg-white/10 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-volturaGold"
        />
        <input
          type="text"
          placeholder="What do they need? (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-white/10 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-volturaGold"
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={loading || !name.trim() || !phone.trim()}
          className="w-full bg-volturaGold text-volturaBlue font-bold rounded-xl py-3 text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {loading ? 'Sending…' : 'Send Referral'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] Verify TypeScript: `npx tsc --noEmit`

---

## Task 4: Wire ReferralForm into public estimate view

**Files:**
- Modify: `volturaos/app/estimates/[id]/view/page.tsx`

- [ ] Add the import at top of file (after existing imports):

```typescript
import { ReferralForm } from '@/components/estimates/ReferralForm'
```

- [ ] Add the form just above the `<footer>` tag (line ~81), between the payment methods section and the footer:

```tsx
      {/* Referral capture */}
      <div className="mb-8">
        <ReferralForm estimateId={id} />
      </div>
```

Full context of the insertion — the bottom of the return block should look like:

```tsx
      <div className="bg-volturaNavy/50 rounded-2xl p-5 mb-6">
        <p className="text-gray-400 text-sm font-semibold mb-2">Payment Methods Accepted</p>
        <p className="text-white text-sm">Check &middot; Zelle &middot; Cash &middot; Credit Card</p>
      </div>

      {/* Referral capture */}
      <div className="mb-8">
        <ReferralForm estimateId={id} />
      </div>

      <footer className="text-center text-gray-500 text-sm">
```

- [ ] Test: open `http://localhost:3000/estimates/[any-id]/view` — referral form should appear at the bottom
- [ ] Submit the form with a test name/phone — check Supabase `referrals` table for the row and Telegram for the notification
- [ ] Verify TypeScript: `npx tsc --noEmit`

---

## Task 5: Enhance job-complete SMS + add review gate

**Files:**
- Modify: `volturaos/lib/sms.ts`
- Modify: `volturaos/lib/actions/jobs.ts`

### 5a — Add referral ask to `sendJobCompleteSMS`

In `lib/sms.ts`, update the `sendJobCompleteSMS` function body to add a referral line:

```typescript
export async function sendJobCompleteSMS(
  phone: string | null | undefined,
  optOut: boolean,
  jobType?: string
): Promise<void> {
  if (!phone) return
  const reviewLink = process.env.GOOGLE_REVIEW_LINK ?? 'https://g.page/r/YOUR_REVIEW_LINK'
  const volturaPhone = process.env.VOLTURA_PHONE ?? '(719) 555-0100'
  const jobLabel = jobType ? `your ${jobType}` : 'your electrical work'

  const body =
    `✅ Voltura Power Group — Work Complete!\n\n` +
    `We've finished ${jobLabel}. All work is covered by our 12-month labor warranty.\n\n` +
    `📋 Keep this message as your service record.\n` +
    `📞 Questions? Call/text ${volturaPhone}\n` +
    `⭐ How'd we do? Leave us a quick review: ${reviewLink}\n\n` +
    `👥 Know someone who needs electrical work? Send them our number — we'd love to help.`

  await sendSMS(phone, body, optOut)
}
```

### 5b — Gate with `review_requested_at` in `updateJobStatus`

In `lib/actions/jobs.ts`, update the `updateJobStatus` function. Find the `if (status === 'Completed')` block and replace it:

```typescript
    if (status === 'Completed') {
      void sendTelegram(`✅ Job completed: ${customerName} — ${jobType}`)

      // Only send review SMS once per job
      const { data: jobRow } = await admin
        .from('jobs')
        .select('review_requested_at')
        .eq('id', id)
        .single()

      const phone = (customers?.phone as string | null) ?? null
      const optOut = customers == null ? true : (customers.sms_opt_out as boolean)

      if (!jobRow?.review_requested_at) {
        void sendJobCompleteSMS(phone, optOut, jobType)
        await admin.from('jobs').update({ review_requested_at: new Date().toISOString() }).eq('id', id)
      }
    }
```

- [ ] Test: Mark a job as Completed in the app → verify Telegram fires → verify SMS sends to customer (check Twilio logs) → verify `review_requested_at` is set in Supabase
- [ ] Test gate: Mark same job Completed again → verify SMS does NOT send a second time
- [ ] Verify TypeScript: `npx tsc --noEmit`

---

## Task 6: Invoice-paid review SMS

**Files:**
- Modify: `volturaos/lib/sms.ts`
- Modify: `volturaos/lib/actions/invoices.ts`

### 6a — Add `sendInvoicePaidReviewSMS` to `lib/sms.ts`

Add this new function at the bottom of `lib/sms.ts`:

```typescript
export async function sendInvoicePaidReviewSMS(
  phone: string | null | undefined,
  optOut: boolean,
  customerFirstName: string
): Promise<void> {
  if (!phone) return
  const reviewLink = process.env.GOOGLE_REVIEW_LINK ?? 'https://g.page/r/YOUR_REVIEW_LINK'
  const body =
    `Hi ${customerFirstName}! Your invoice with Voltura Power Group is paid in full ✅\n\n` +
    `Thank you for choosing us. If we earned it, a quick Google review means the world to our small business:\n` +
    `${reviewLink}`
  await sendSMS(phone, body, optOut)
}
```

### 6b — Call it from `recordPayment` in `lib/actions/invoices.ts`

In `lib/actions/invoices.ts`, add the import at the top (next to existing sendTelegram import):

```typescript
import { sendInvoicePaidReviewSMS } from '@/lib/sms'
```

Find the `recordPayment` function. After the `admin.from('invoices').update(...)` call, add the review SMS gate before the `sendTelegram` call:

```typescript
  // Gate: only send review SMS once per invoice when it goes Paid
  if (status === 'Paid') {
    const { data: invRow } = await admin
      .from('invoices')
      .select('review_requested_at, customers(phone, sms_opt_out)')
      .eq('id', input.invoiceId)
      .single()

    const custData = invRow?.customers as unknown as { phone: string | null; sms_opt_out: boolean } | null
    const custPhone = custData?.phone ?? null
    const custOptOut = custData == null ? true : (custData.sms_opt_out ?? false)
    const firstName = customerName.split(' ')[0]

    if (!invRow?.review_requested_at) {
      void sendInvoicePaidReviewSMS(custPhone, custOptOut, firstName)
      await admin.from('invoices').update({ review_requested_at: new Date().toISOString() }).eq('id', input.invoiceId)
    }
  }
```

- [ ] Test: Record a payment that pays off an invoice in full → verify Telegram fires → verify SMS sends (check Twilio) → verify `review_requested_at` set in Supabase
- [ ] Test gate: Record another payment on same invoice → verify SMS does NOT send again
- [ ] Verify TypeScript: `npx tsc --noEmit`

---

## Task 7: Final verification

- [ ] Open a public estimate URL in the browser — referral form visible at bottom
- [ ] Submit a referral — Telegram notification fires, row appears in `referrals` table
- [ ] Mark a test job Completed — job-complete SMS fires once, `review_requested_at` set
- [ ] Mark same job Completed again — no second SMS
- [ ] Record a full payment on a test invoice — paid review SMS fires once
- [ ] Record another payment on same invoice — no second SMS
- [ ] `npx tsc --noEmit` shows zero errors
- [ ] `npx next build` completes with no errors (run from the `volturaos` directory)

---

## Environment Variables (Vercel + local .env.local)

These must exist for SMS to work:
```
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...
GOOGLE_REVIEW_LINK=https://g.page/r/YOUR_ACTUAL_REVIEW_LINK
VOLTURA_PHONE=(719) 555-0100
```

Set `GOOGLE_REVIEW_LINK` to your actual Google Business review URL in Vercel environment variables.
