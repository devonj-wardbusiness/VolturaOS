# Phase A: SMS Notifications, Global FAB, Public Invoice View

**Date:** 2026-04-08  
**Status:** Approved

---

## Overview

Three independent features that ship together as Phase A of the VolturaOS feature roadmap. No new DB tables required. No breaking changes.

---

## Feature 1: SMS Notifications

### Triggers

| Event | Location | Customer message |
|-------|----------|-----------------|
| Job created with scheduled_date | `createJob()` in `lib/actions/jobs.ts` | "Your job with Voltura Power Group is scheduled for [date] at [time]. We'll see you then!" |
| Job status → In Progress | `updateJobStatus()` in `lib/actions/jobs.ts` | "We're on our way! Your Voltura Power Group technician is headed your way." |
| Job status → Completed | `updateJobStatus()` in `lib/actions/jobs.ts` | "Job complete! Thank you for choosing Voltura Power Group. Mind leaving us a quick review? [GOOGLE_REVIEW_LINK]" |

### Helper functions in `lib/sms.ts`

Three named helpers are added. Each accepts `phone: string | null | undefined` and `optOut: boolean`. Each silently returns (no throw) if `phone` is falsy or `optOut` is true. Each calls the existing `sendSMS(to, body, optOut)`.

```ts
sendJobScheduledSMS(phone, optOut, date, time)
sendOnMyWaySMS(phone, optOut)
sendJobCompleteSMS(phone, optOut)
```

`GOOGLE_REVIEW_LINK` is a server-only env var (no `NEXT_PUBLIC_` prefix — the message is composed server-side). Use placeholder value `https://g.page/r/YOUR_REVIEW_LINK` until the real URL is available.

### Touch points in `lib/actions/jobs.ts`

**`createJob()`**
After successful insert, if `data.scheduled_date` is present:
- Fetch `customers(phone, sms_opt_out)` by `customerId` (extra query)
- Call `sendJobScheduledSMS(phone, sms_opt_out, scheduled_date, scheduled_time)`

**`updateJobStatus()` (or the equivalent status update path)**
The existing In Progress SMS pattern already fetches `customers(name, phone, sms_opt_out)`. Mirror that exact pattern for the Completed branch:
- `newStatus === 'In Progress'` → `sendOnMyWaySMS(phone, sms_opt_out)`
- `newStatus === 'Completed'` → `sendJobCompleteSMS(phone, sms_opt_out)`

The Completed branch currently only fires a Telegram message and sheet sync — add the SMS call there.

### Guards
- No phone → skip silently (handled inside each helper)
- `sms_opt_out === true` → skip silently (handled inside each helper)
- Twilio env vars missing → `sendSMS` already no-ops gracefully
- Do not add duplicate guards — rely on existing `sendSMS` behavior

---

## Feature 2: Global Floating Action Button (FAB)

### Behavior
- Fixed position: bottom-right corner, `bottom-6 right-4`, `z-50`
- Default state: gold `+` circle button (48×48px touch target)
- Expanded state: `+` rotates to `×`, three link buttons appear stacked above:
  - `+ Job` → `/jobs/new`
  - `+ Estimate` → `/estimates/new`
  - `+ Customer` → `/customers/new`
- Closes on: outside click, navigation, pressing `×`
- Smooth expand/collapse via Tailwind transition classes

### Outside-click handling
Use a `useRef` on the FAB container `<div>`. In a `useEffect`, attach a `mousedown` listener to `document`. If `event.target` is not contained within the ref element, close the FAB. Return a cleanup function that calls `removeEventListener` to prevent memory leaks.

### Files
- **New:** `components/ui/FAB.tsx` — `'use client'`, self-contained open/close state, `useRef` + `useEffect` for outside-click
- **Edit:** `app/(app)/layout.tsx` — add `<FAB />` inside the layout wrapper

### Visual
- Button: `bg-volturaGold text-volturaBlue rounded-full w-12 h-12 flex items-center justify-center`
- Expanded links: gold border, white text, smaller pill buttons stacked above with `gap-2`, animate via `transition-all`
- No backdrop overlay

---

## Feature 3: Public Invoice View

### Route placement
**`app/invoices/[id]/view/page.tsx`** — this route must live at the **root app level**, NOT inside `app/(app)/`. This mirrors the estimate public view at `app/estimates/[id]/view/`. Placing it outside `(app)` ensures it does not inherit the app layout (no BottomNav, no FAB, no internal chrome).

The existing internal invoice route `app/(app)/invoices/[id]/page.tsx` is unaffected.

### Data
New server action `getPublicInvoice(id)` in `lib/actions/invoices.ts`:
- Uses `createAdminClient()` directly — **must NOT call `requireAuth()`** (unlike `getInvoiceById`). This ensures it continues to work if auth is ever re-enabled.
- Fetches invoice by id with customer join (`customers(name, phone, address)`)
- Returns `{ invoice, customer }` or null (→ `notFound()`)

### Page layout
```
Voltura header (gold logo, "Power Group — Colorado Springs, CO", License #)
Customer name card
Line items list (if invoice has line_items — check existing invoice schema)
Total card (gold amount, balance due if partial)
"Pay Online" button — disabled, gray, labeled "Coming Soon"
Payment methods accepted card (Check · Zelle · Cash · Credit Card)
Footer
```

Styled identically to `app/estimates/[id]/view/page.tsx` — reuse class names verbatim.

### Share button
`components/invoices/InvoiceDetail.tsx` gets a **"Share"** button. On click: copies `window.location.origin + '/invoices/' + invoiceId + '/view'` to clipboard via `navigator.clipboard.writeText`. Shows brief "Copied!" label swap for 2 seconds. This is a `'use client'` interaction — if `InvoiceDetail` is currently a server component, extract just the share button as a small client component.

---

## Out of Scope (Phase A)
- Stripe / actual online payments
- SMS opt-out management UI
- Invoice PDF export
- Two-way SMS replies
- Estimate public view changes

---

## Environment Variables Required
| Variable | Value | Where |
|----------|-------|-------|
| `TWILIO_ACCOUNT_SID` | From Twilio Console | Vercel + .env.local |
| `TWILIO_AUTH_TOKEN` | From Twilio Console (click show) | Vercel + .env.local |
| `TWILIO_FROM_NUMBER` | E.164 format e.g. +1xxxxxxxxxx | Vercel + .env.local |
| `GOOGLE_REVIEW_LINK` | Placeholder now, real URL later | Vercel + .env.local |

Twilio vars already uploaded to Vercel per user confirmation. Add `GOOGLE_REVIEW_LINK` to `.env.example` (not `.env.local.example` — the project uses `.env.example`).
