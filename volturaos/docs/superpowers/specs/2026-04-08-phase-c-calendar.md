# Phase C: Monthly Job Calendar

**Date:** 2026-04-08  
**Status:** Approved

---

## Overview

A monthly calendar view for scheduled jobs, accessible from the Jobs list page. No new DB tables required.

---

## Feature: Monthly Job Calendar

### Goal
Give the user a monthly calendar showing which days have scheduled jobs, color-coded by status, so they can plan their week without scrolling through a list.

### Route
`app/(app)/jobs/calendar/page.tsx`

- Server component, `export const dynamic = 'force-dynamic'`
- Reads `?month=YYYY-MM` from URL params (defaults to current month if absent)

### Data
New server action `getJobsForMonth(year: number, month: number)` in `lib/actions/jobs.ts`:

```ts
// month is 1-indexed (1 = January)
const start = `${year}-${String(month).padStart(2, '0')}-01`
const end = `${year}-${String(month + 1).padStart(2, '0')}-01` // exclusive upper bound
admin.from('jobs')
  .select('id, job_type, status, scheduled_date, scheduled_time, customers(name)')
  .gte('scheduled_date', start)
  .lt('scheduled_date', end)
  .not('scheduled_date', 'is', null)
  .order('scheduled_date', { ascending: true })
```

Returns `(Job & { customer: { name: string } })[]`.

### Calendar Grid Component
New `JobCalendar` client component at `components/jobs/JobCalendar.tsx`.

**Layout:**
- Header: `← [Month Year] →` navigation row
  - `←` links to `?month=YYYY-MM` for previous month
  - `→` links to next month
- Day-of-week header row: `Sun Mon Tue Wed Thu Fri Sat` (7 columns)
- Day grid: CSS `grid-cols-7`, each cell is a fixed height (`min-h-[80px]`)

**Each day cell:**
- Day number in top-left corner
- Today's date: gold ring (`ring-1 ring-volturaGold`) around the number
- Up to 2 job chips rendered vertically:
  - Chip: customer name (truncated), colored left border using `STATUS_ACCENT` from `JobCard`
  - Entire chip is a `Link` to `/jobs/[id]`
- If 3+ jobs on a day: show 2 chips + `+N more` text (tapping `+N more` does nothing for now — just informational)
- Days from previous/next month that fill the grid: shown as empty cells with dimmed day number

**No separate day-detail view** — chips navigate directly to job detail.

### Jobs Page Integration
`app/(app)/jobs/page.tsx` header updated to show a toggle:

```
Jobs                [☰ List]  [📅 Calendar]  + New
```

- `☰ List` links to `/jobs` (current page)
- `📅 Calendar` links to `/jobs/calendar`
- Active view is indicated by gold text vs gray

### Page Structure
```
app/(app)/jobs/calendar/page.tsx
  → fetches getJobsForMonth(year, month)
  → renders PageHeader with List/Calendar toggle + "Calendar" title
  → renders <JobCalendar jobs={jobs} year={year} month={month} />
```

### Status Colors
Reuse `STATUS_ACCENT` record from `JobCard.tsx`. Import it or move it to a shared location (`lib/constants/jobStatus.ts`) so both `JobCard` and `JobCalendar` use the same map. If moving it would touch more than 2 files, inline it instead.

### Month Overflow Handling
- Month index wraps correctly: December + 1 → January of next year
- January - 1 → December of previous year
- Handled with simple date arithmetic (no library needed)

---

## Stripe (Deferred — Architecture Note Only)

Not built in Phase C. When ready:
- New route: `app/invoices/[id]/pay/page.tsx` (public, no auth)
- New API route: `app/api/stripe/checkout/route.ts` — creates Stripe Checkout Session
- New API route: `app/api/stripe/webhook/route.ts` — handles `payment_intent.succeeded`, calls `recordPayment()`
- Env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- "Pay Online" button on public invoice view links to `/invoices/[id]/pay`

---

## Out of Scope (Phase C)
- Week view
- Drag-to-reschedule
- Day-detail pop-up/modal
- Stripe implementation

---

## No DB Migrations Required
Uses existing `jobs` table `scheduled_date` column.
