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
- Parses `year` and `month` (1-indexed) from the param before passing to the action and component

### Data
New server action `getJobsForMonth(year: number, month: number)` in `lib/actions/jobs.ts`.

**Boundary calculation — December-safe:**
```ts
// month is 1-indexed (1 = January)
const start = `${year}-${String(month).padStart(2, '0')}-01`
// Use Date arithmetic to get next month — handles December → January correctly
const nextMonthDate = new Date(year, month, 1) // JS Date: month param is 0-indexed, so `month` (1-based) = next month
const end = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`
```

**Query:**
```ts
admin.from('jobs')
  .select('id, job_type, status, scheduled_date, scheduled_time, customers(name)')
  .gte('scheduled_date', start)
  .lt('scheduled_date', end)
  .not('scheduled_date', 'is', null)
  .order('scheduled_date', { ascending: true })
```

**Return type:** Remap the `customers` join key to `customer` (same pattern as `listJobs`):
```ts
return (data as Record<string, unknown>[]).map(({ customers, ...j }) => ({
  ...j, customer: customers,
})) as (Job & { customer: { name: string } })[]
```

### Calendar Grid Component
New `JobCalendar` client component at `components/jobs/JobCalendar.tsx`.

**Props:** `{ jobs: (Job & { customer: { name: string } })[], year: number, month: number }`

**Month navigation links** — December-safe, computed from props:
```ts
const prevDate = new Date(year, month - 2, 1) // month-2 because JS Date is 0-indexed and month is 1-indexed
const nextDate = new Date(year, month, 1)
const prevParam = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
const nextParam = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
```

**Layout:**
- Header: `← [Month Year] →` navigation row — `←` and `→` are `Link` components to `?month=prevParam` / `?month=nextParam`
- Day-of-week header row: `Sun Mon Tue Wed Thu Fri Sat` (7 columns)
- Day grid: CSS `grid-cols-7`, each cell `min-h-[80px]`

**Today highlight:** Compare using ISO date string, not `Date` object, to avoid timezone shift:
```ts
const todayISO = new Date().toLocaleDateString('en-CA') // yields 'YYYY-MM-DD' in local time
// In day cell: isTodayCell = `${year}-${mm}-${dd}` === todayISO
```

**Each day cell:**
- Day number in top-left corner; if today: `ring-1 ring-volturaGold rounded-full` around the number
- Up to 2 job chips rendered vertically — each chip: customer name (truncated with `truncate`), colored left border using `STATUS_ACCENT`; entire chip is a `Link` to `/jobs/[id]`
- If 3+ jobs: show 2 chips + `<span className="text-gray-500 text-xs">+N more</span>` (a `<span>`, not a button or link — non-interactive)
- Filler cells (days from prev/next month): empty cells with dimmed day number (`text-white/20`)

**No separate day-detail view** — chips navigate directly to job detail.

### Status Colors
Move `STATUS_ACCENT` from `components/jobs/JobCard.tsx` to `lib/constants/jobStatus.ts` and export it. Import in both `JobCard.tsx` and `JobCalendar.tsx`. Add missing `'Paid'` entry:

```ts
export const STATUS_ACCENT: Record<string, string> = {
  'Lead':        '#6b7280',
  'Scheduled':   '#38bdf8',
  'In Progress': '#f59e0b',
  'Completed':   '#4ade80',
  'Invoiced':    '#a78bfa',
  'Paid':        '#4ade80',  // same green as Completed
  'Cancelled':   '#f87171',
}
```

### Jobs Page Integration
`app/(app)/jobs/page.tsx` — add a List/Calendar toggle **inside the `PageHeader` action prop** as a single React fragment:

```tsx
action={
  <div className="flex items-center gap-2">
    <Link href="/jobs" className="text-volturaGold text-xs font-semibold">List</Link>
    <Link href="/jobs/calendar" className="text-gray-400 text-xs">Cal</Link>
    <Link href="/jobs/new" className="text-volturaGold text-sm font-bold">+ New</Link>
  </div>
}
```

The calendar page's `PageHeader` swaps the active/inactive colors. The title remains `"Jobs"` on both pages — no layout change needed since the toggle fits within the existing `action` slot. This avoids any collision with the centered title on mobile.

### Page Structure
```
app/(app)/jobs/calendar/page.tsx
  → parse ?month param → year, month integers
  → fetch getJobsForMonth(year, month)
  → render PageHeader title="Jobs" with List/Cal/+New action
  → render <JobCalendar jobs={jobs} year={year} month={month} />
```

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
