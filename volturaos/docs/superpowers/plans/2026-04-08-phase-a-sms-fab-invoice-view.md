# Phase A: SMS Notifications, Global FAB, Public Invoice View — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SMS job lifecycle notifications to customers, a global floating action button for quick record creation, and a public shareable invoice view page.

**Architecture:** Three independent features added to the existing Next.js 15 App Router codebase. SMS helpers extend `lib/sms.ts` and are called from existing server actions. The FAB is a single `'use client'` component added to the app layout. The public invoice view mirrors the existing public estimate view pattern at the root app level (outside the `(app)` route group).

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4 (CSS-first via `globals.css @theme inline`), Supabase admin client, Twilio REST API (via existing `sendSMS`), `lucide-react` for icons.

---

## File Map

**Create:**
- `volturaos/components/ui/FAB.tsx` — floating action button, client component
- `volturaos/app/invoices/[id]/view/page.tsx` — public invoice view, no auth, root level

**Modify:**
- `volturaos/lib/sms.ts` — add 3 SMS helper functions
- `volturaos/lib/actions/jobs.ts` — call SMS helpers in `createJob()` and `updateJobStatus()`
- `volturaos/lib/actions/invoices.ts` — add `getPublicInvoice()` action
- `volturaos/app/(app)/layout.tsx` — mount `<FAB />`
- `volturaos/components/invoices/InvoiceDetail.tsx` — add Share button
- `volturaos/.env.example` — add `GOOGLE_REVIEW_LINK`, `TWILIO_*` vars if missing

---

## Task 1: SMS Helper Functions

**Files:**
- Modify: `volturaos/lib/sms.ts`
- Modify: `volturaos/.env.example`

### Context
`sendSMS(to, body, optOut)` already handles: missing Twilio creds (returns silently), opt-out flag, network errors. The three helpers delegate all of that to it — they just compose the message text.

`GOOGLE_REVIEW_LINK` is a server-only env var. Placeholder value for now.

- [ ] **Step 1: Add 3 SMS helper functions to `lib/sms.ts`**

Append after the existing `sendSMS` function:

```ts
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
```

- [ ] **Step 2: Add env var to `.env.example`**

Add these lines to `.env.example` if not already present:
```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
GOOGLE_REVIEW_LINK=https://g.page/r/YOUR_REVIEW_LINK
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd volturaos && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add volturaos/lib/sms.ts volturaos/.env.example
git commit -m "feat: add job SMS helper functions (scheduled, on-my-way, complete)"
```

---

## Task 2: Wire SMS Triggers into Job Actions

**Files:**
- Modify: `volturaos/lib/actions/jobs.ts`

### Context
Two touch points:

1. **`createJob()`** — after successful insert, if `scheduled_date` is present, fetch the customer's phone + opt-out flag (extra query needed — createJob only has `customerId`) and call `sendJobScheduledSMS`.

2. **`updateJobStatus()`** — already fetches `customers(name, phone, sms_opt_out)` for the In Progress SMS. The In Progress branch currently calls `sendSMS` inline. Refactor it to call `sendOnMyWaySMS`. Add a new `sendJobCompleteSMS` call in the Completed branch alongside the existing Telegram notification.

- [ ] **Step 1: Update imports AND refactor `updateJobStatus()` SMS block atomically**

These two changes must be applied together in a single edit — do not apply the import change without also applying Step 3, or the file will have broken references to `sendSMS`.

Change the existing `sendSMS` import to:

```ts
import { sendJobScheduledSMS, sendOnMyWaySMS, sendJobCompleteSMS } from '@/lib/sms'
```

`sendSMS` is no longer called directly in this file — remove it from the import. Then immediately apply Step 3 before saving.

- [ ] **Step 2: Add customer fetch + SMS call to `createJob()`**

After `if (error) throw new Error(error.message)` and before `return data as Job`, add:

```ts
  // Send scheduled SMS if job has a date
  if (input.scheduledDate) {
    const { data: customer } = await admin
      .from('customers')
      .select('phone, sms_opt_out')
      .eq('id', input.customerId)
      .single()
    if (customer) {
      void sendJobScheduledSMS(
        customer.phone as string | null,
        customer.sms_opt_out as boolean,
        input.scheduledDate,
        input.scheduledTime ?? null
      )
    }
  }
```

- [ ] **Step 3: Refactor `updateJobStatus()` SMS block**

Find the existing In Progress SMS block (lines ~107–122 in jobs.ts). Replace the entire `if (status === 'In Progress')` block with:

```ts
    if (status === 'In Progress') {
      void sendTelegram(`🔧 Job started: ${customerName} — ${jobType}`)
      const phone = (customers?.phone as string | null) ?? null
      const optOut = customers == null ? true : (customers.sms_opt_out as boolean)
      void sendOnMyWaySMS(phone, optOut)
    }
    if (status === 'Completed') {
      void sendTelegram(`✅ Job completed: ${customerName} — ${jobType}`)
      const phone = (customers?.phone as string | null) ?? null
      const optOut = customers == null ? true : (customers.sms_opt_out as boolean)
      void sendJobCompleteSMS(phone, optOut)
    }
```

Note: the existing `if (status === 'Completed')` block only fires Telegram — replace it too so both status branches are handled in one place.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd volturaos && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add volturaos/lib/actions/jobs.ts
git commit -m "feat: wire SMS notifications into job create and status update"
```

---

## Task 3: Global Floating Action Button (FAB)

**Files:**
- Create: `volturaos/components/ui/FAB.tsx`
- Modify: `volturaos/app/(app)/layout.tsx`

### Context
The app layout (`app/(app)/layout.tsx`) currently renders `<BottomNav />` and `<AIChatWidget />` inside a `div`. The FAB is a `'use client'` component that sits fixed in the bottom-right corner above the BottomNav.

The `z-50` stacking keeps it above page content but below modals. The BottomNav is `pb-16` — position the FAB at `bottom-20` to sit above the nav bar.

The outside-click handler uses `useRef` on the container + `document.addEventListener('mousedown', ...)` with cleanup.

- [ ] **Step 1: Create `components/ui/FAB.tsx`**

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

const ACTIONS = [
  { label: '+ Job', href: '/jobs/new' },
  { label: '+ Estimate', href: '/estimates/new' },
  { label: '+ Customer', href: '/customers/new' },
]

export function FAB() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="flex flex-col items-end gap-2">
          {ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              onClick={() => setOpen(false)}
              className="bg-volturaNavy border border-volturaGold/50 text-volturaGold font-semibold text-sm px-4 py-2 rounded-full shadow-lg whitespace-nowrap"
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-12 h-12 rounded-full bg-volturaGold text-volturaBlue flex items-center justify-center shadow-lg text-2xl font-bold leading-none"
        aria-label="Quick actions"
      >
        {open ? '×' : '+'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Add FAB to app layout**

In `app/(app)/layout.tsx`, import and mount `<FAB />`:

```tsx
export const dynamic = 'force-dynamic'

import { BottomNav } from '@/components/nav/BottomNav'
import { AIChatWidget } from '@/components/ai-chat/AIChatWidget'
import { FAB } from '@/components/ui/FAB'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-16">
      {children}
      <BottomNav />
      <AIChatWidget />
      <FAB />
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd volturaos && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add volturaos/components/ui/FAB.tsx volturaos/app/(app)/layout.tsx
git commit -m "feat: add global floating action button (FAB) to app layout"
```

---

## Task 4: Public Invoice View

**Files:**
- Modify: `volturaos/lib/actions/invoices.ts`
- Create: `volturaos/app/invoices/[id]/view/page.tsx`
- Modify: `volturaos/components/invoices/InvoiceDetail.tsx`

### Context
The public view lives at `app/invoices/[id]/view/` — **root level, not under `app/(app)/`**. This ensures it has no BottomNav, no FAB, no AIChatWidget. Mirrors `app/estimates/[id]/view/page.tsx` exactly in structure and styling.

`InvoiceDetail` is already `'use client'`, so the Share button can be added inline.

- [ ] **Step 1: Add `getPublicInvoice()` to `lib/actions/invoices.ts`**

Append to the end of the file. Note: **no `requireAuth()` call** — this is intentional for the public route.

```ts
export async function getPublicInvoice(id: string): Promise<{
  invoice: Invoice & { line_items: LineItem[] | null }
  customer: { name: string; address: string | null }
} | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('invoices')
    .select('*, customers(name, address)')
    .eq('id', id)
    .single()
  if (error || !data) return null
  const { customers, ...invoice } = data as Record<string, unknown>
  if (!customers) return null
  return {
    invoice: invoice as Invoice & { line_items: LineItem[] | null },
    customer: customers as { name: string; address: string | null },
  }
}
```

- [ ] **Step 2: Create the directory and page file**

Create `volturaos/app/invoices/[id]/view/page.tsx`:

```tsx
import { getPublicInvoice } from '@/lib/actions/invoices'
import { notFound } from 'next/navigation'
import type { LineItem } from '@/types'

export const dynamic = 'force-dynamic'

export default async function PublicInvoiceView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getPublicInvoice(id)
  if (!result) notFound()

  const { invoice, customer } = result
  const lineItems = (invoice.line_items ?? []) as LineItem[]

  return (
    <div className="min-h-dvh bg-volturaBlue px-4 py-8 max-w-lg mx-auto">
      <header className="mb-8">
        <h1 className="text-volturaGold text-3xl font-bold tracking-widest">VOLTURA</h1>
        <p className="text-gray-400 text-sm">Power Group — Colorado Springs, CO</p>
        <p className="text-gray-400 text-xs mt-1">License #3001608</p>
      </header>

      <div className="bg-volturaNavy rounded-2xl p-5 mb-6">
        <p className="text-gray-400 text-sm mb-1">Invoice for</p>
        <p className="text-white text-xl font-bold">{customer.name}</p>
        {customer.address && <p className="text-gray-400 text-sm mt-1">{customer.address}</p>}
      </div>

      {lineItems.length > 0 && (
        <div className="bg-volturaNavy/50 rounded-xl px-4 mb-4">
          <div className="divide-y divide-white/5">
            {lineItems.map((item, i) => (
              <div key={i} className="flex justify-between items-start py-3">
                <span className="text-gray-300 text-sm flex-1 mr-4">{item.description}</span>
                <span className="text-volturaGold font-semibold whitespace-nowrap">${item.price.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-volturaNavy rounded-2xl p-5 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Total</span>
          <span className="text-volturaGold text-3xl font-bold">${invoice.total.toLocaleString()}</span>
        </div>
        {invoice.balance > 0 && invoice.status !== 'Unpaid' && (
          <div className="flex justify-between items-center border-t border-white/10 pt-2">
            <span className="text-gray-400 text-sm">Balance Due</span>
            <span className="text-red-400 font-semibold">${invoice.balance.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Pay Online placeholder */}
      <button
        disabled
        className="w-full bg-white/5 border border-white/10 text-gray-500 font-bold py-3 rounded-2xl text-base mb-6 cursor-not-allowed"
      >
        Pay Online — Coming Soon
      </button>

      <div className="bg-volturaNavy/50 rounded-2xl p-5 mb-8">
        <p className="text-gray-400 text-sm font-semibold mb-2">Payment Methods Accepted</p>
        <p className="text-white text-sm">Check &middot; Zelle &middot; Cash &middot; Credit Card</p>
      </div>

      <footer className="text-center text-gray-500 text-sm">
        <p>Questions? Call Dev</p>
        <p className="text-volturaGold">Voltura Power Group &middot; Colorado Springs</p>
      </footer>
    </div>
  )
}
```

- [ ] **Step 3: Add Share button to `InvoiceDetail.tsx`**

Add a Share button that copies the public URL to clipboard. Place it after the `InvoiceDownloadButton` and before the "Record Payment" button.

First, import `useCallback` at the top (it's already a client component with `useState`):

```tsx
import { useState, useCallback } from 'react'
```

Add state for copied feedback inside the component (alongside `paymentOpen`):

```tsx
const [copied, setCopied] = useState(false)

const handleShare = useCallback(async () => {
  const url = `${window.location.origin}/invoices/${invoice.id}/view`
  await navigator.clipboard.writeText(url)
  setCopied(true)
  setTimeout(() => setCopied(false), 2000)
}, [invoice.id])
```

Add the button after `<InvoiceDownloadButton ... />`:

```tsx
      {/* Share Invoice */}
      <button
        onClick={handleShare}
        className="w-full bg-volturaNavy border border-volturaGold/30 text-volturaGold font-semibold py-3 rounded-xl text-sm"
      >
        {copied ? '✓ Link Copied!' : '🔗 Share Invoice'}
      </button>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd volturaos && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add volturaos/lib/actions/invoices.ts volturaos/app/invoices volturaos/components/invoices/InvoiceDetail.tsx
git commit -m "feat: add public invoice view and share button"
```

---

## Task 5: Push to Vercel

- [ ] **Step 1: Push to origin**

```bash
cd "C:/Users/Devon/VolturaOS" && git push origin master
```

Vercel auto-deploys from `master`. Check the Vercel dashboard for build status.

- [ ] **Step 2: Verify GOOGLE_REVIEW_LINK is set in Vercel**

In Vercel → Project Settings → Environment Variables, confirm `GOOGLE_REVIEW_LINK` is present (even as placeholder). If not, add it now.

- [ ] **Step 3: Smoke test on device**

1. Create a test job with a scheduled date for a customer with a phone number → verify scheduled SMS arrives
2. Change that job to "In Progress" → verify on-my-way SMS arrives
3. Change to "Completed" → verify complete + review SMS arrives
4. Open an invoice → tap "Share Invoice" → paste URL in browser → verify public view loads correctly with line items and total
5. Tap the `+` FAB → verify 3 links appear → tap one → verify navigation works
