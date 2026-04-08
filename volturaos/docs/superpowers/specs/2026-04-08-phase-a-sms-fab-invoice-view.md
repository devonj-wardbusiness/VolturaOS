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

### Implementation

**`lib/sms.ts` additions** — three named helper functions:

```ts
sendJobScheduledSMS(phone, date, time)
sendOnMyWaySMS(phone)
sendJobCompleteSMS(phone)
```

Each calls the existing `sendSMS(to, body)`. Each silently returns if `phone` is falsy — no throw, no crash.

**`GOOGLE_REVIEW_LINK`** stored as env var (`NEXT_PUBLIC_GOOGLE_REVIEW_LINK` or server-only `GOOGLE_REVIEW_LINK`). Use a placeholder string for now: `https://g.page/r/YOUR_REVIEW_LINK`. Document in `.env.local.example`.

**`lib/actions/jobs.ts`** — two touch points:
- After successful insert in `createJob()`: if `scheduled_date` present, call `sendJobScheduledSMS`
- In `updateJobStatus()` (or equivalent status update action): check `newStatus`, call appropriate SMS helper

### Guards
- No phone → skip silently
- Twilio env vars missing → `sendSMS` already no-ops gracefully
- Do not send duplicate SMS if job is re-saved without status change

---

## Feature 2: Global Floating Action Button (FAB)

### Behavior
- Fixed position: bottom-right corner, `bottom-6 right-4`, `z-50`
- Default state: gold `+` circle button (48×48px touch target)
- Expanded state: `+` rotates to `×`, three link buttons appear stacked above:
  - `+ Customer` → `/customers/new`
  - `+ Estimate` → `/estimates/new`
  - `+ Job` → `/jobs/new`
- Closes on: outside click, navigation, pressing `×`
- Smooth expand/collapse animation (Tailwind transition classes)

### Files
- **New:** `components/ui/FAB.tsx` — `'use client'`, self-contained state
- **Edit:** `app/(app)/layout.tsx` — add `<FAB />` inside the layout wrapper

### Visual
- Button: `bg-volturaGold text-volturaBlue rounded-full w-12 h-12`
- Expanded links: same gold style, smaller, stacked with `gap-2`, slide up from button
- Backdrop: transparent (no overlay — tap outside via `useEffect` click listener)

---

## Feature 3: Public Invoice View

### Route
`app/invoices/[id]/view/page.tsx` — public, no auth check, `export const dynamic = 'force-dynamic'`

### Data
New server action `getPublicInvoice(id)` in `lib/actions/invoices.ts`:
- Fetches invoice by id with customer join
- Returns `{ invoice, customer }` or null (→ notFound())
- No auth required (uses admin client, same as estimates public view)

### Page layout (mirrors estimate view)
```
Voltura header (gold logo, "Power Group — Colorado Springs")
Customer name card
Line items list (if present)
Total card (gold amount)
"Pay Online" button — disabled, labeled "Coming Soon" (gray, rounded)
Payment methods accepted card
Footer
```

### Share button
`components/invoices/InvoiceDetail.tsx` gets a **"Share Invoice"** icon button in the header area. On click: copies `window.location.origin + /invoices/[id]/view` to clipboard. Shows brief "Copied!" confirmation.

---

## Out of Scope (Phase A)
- Stripe / actual online payments
- SMS opt-out management
- Invoice PDF export
- Two-way SMS replies

---

## Environment Variables Required
| Variable | Value | Where |
|----------|-------|-------|
| `TWILIO_ACCOUNT_SID` | From Twilio Console | Vercel + .env.local |
| `TWILIO_AUTH_TOKEN` | From Twilio Console | Vercel + .env.local |
| `TWILIO_FROM_NUMBER` | E.164 format | Vercel + .env.local |
| `GOOGLE_REVIEW_LINK` | Placeholder for now | Vercel + .env.local |

Twilio vars already uploaded to Vercel per user confirmation.
