# Phase C: Monthly Job Calendar — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a monthly calendar view at `/jobs/calendar` showing scheduled jobs color-coded by status, with prev/next month navigation, reachable from a List/Cal toggle on the Jobs list page.

**Architecture:** One new constant file centralizes `STATUS_ACCENT` (currently defined inline in `JobCard.tsx`). One new server action `getJobsForMonth` queries existing jobs data. One new `JobCalendar` client component renders a CSS grid. One new server-component page at `app/(app)/jobs/calendar/page.tsx` wires data to component. The jobs list page gains a 3-item toggle (List/Cal/+New) inside its existing `PageHeader` action slot.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4 (CSS-first globals.css — no tailwind.config.ts), Supabase admin client, Lucide React icons (none needed for calendar itself), `next/link` for navigation chips and month nav

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/constants/jobStatus.ts` | Create | Export `STATUS_ACCENT` record with all 7 statuses including `'Paid'` |
| `components/jobs/JobCard.tsx` | Modify | Remove inline `STATUS_ACCENT`; import from `lib/constants/jobStatus` |
| `lib/actions/jobs.ts` | Modify | Add `getJobsForMonth(year, month)` server action |
| `components/jobs/JobCalendar.tsx` | Create | Client component: calendar grid, day cells, job chips, month navigation |
| `app/(app)/jobs/calendar/page.tsx` | Create | Server page: parse `?month` param, fetch jobs, render PageHeader + JobCalendar |
| `app/(app)/jobs/page.tsx` | Modify | Replace single `+ New` action with 3-item List/Cal/+New toggle fragment |

---

## Task 1: Extract STATUS_ACCENT to shared constant

**Files:**
- Create: `volturaos/lib/constants/jobStatus.ts`
- Modify: `volturaos/components/jobs/JobCard.tsx`

### Context
`JobCard.tsx` currently defines `STATUS_ACCENT` inline (lines 10–17). It has 6 entries — missing `'Paid'`. The calendar component also needs this map. Moving it to a constant file allows both to import from the same source.

### Steps

- [ ] **Step 1: Create lib/constants/jobStatus.ts**

  ```ts
  export const STATUS_ACCENT: Record<string, string> = {
    'Lead':        '#6b7280',
    'Scheduled':   '#38bdf8',
    'In Progress': '#f59e0b',
    'Completed':   '#4ade80',
    'Invoiced':    '#a78bfa',
    'Paid':        '#4ade80',
    'Cancelled':   '#f87171',
  }
  ```

- [ ] **Step 2: Update JobCard.tsx to import from constant**

  In `components/jobs/JobCard.tsx`:

  1. Remove the inline `STATUS_ACCENT` block (lines 10–17).
  2. Add import at the top: `import { STATUS_ACCENT } from '@/lib/constants/jobStatus'`

  The rest of `JobCard.tsx` is unchanged — `accent` is still computed as `STATUS_ACCENT[job.status] ?? '#4b5563'`.

- [ ] **Step 3: Commit**

  ```bash
  cd volturaos && git add lib/constants/jobStatus.ts components/jobs/JobCard.tsx
  git commit -m "refactor: move STATUS_ACCENT to lib/constants/jobStatus, add Paid entry"
  ```

---

## Task 2: getJobsForMonth server action

**Files:**
- Modify: `volturaos/lib/actions/jobs.ts`

### Context
`listJobs()` already exists in `lib/actions/jobs.ts` and remaps the `customers` join key to `customer` using `const { customers, ...j } = row`. `getJobsForMonth` follows the same remap pattern. The `Job` type is in `types/index.ts`. Month boundary calculation uses JS Date arithmetic to handle December→January correctly: `new Date(year, month, 1)` where `month` is 1-indexed so this is already next month in JS 0-indexed terms.

### Steps

- [ ] **Step 1: Add getJobsForMonth to lib/actions/jobs.ts**

  Add this export at the bottom of `lib/actions/jobs.ts`:

  ```ts
  export async function getJobsForMonth(year: number, month: number): Promise<(Job & { customer: { name: string } })[]> {
    await requireAuth()
    const admin = createAdminClient()

    // month is 1-indexed (1 = January)
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    // Use Date arithmetic — handles December → January correctly
    // JS Date month param is 0-indexed, so passing `month` (1-based) = next month
    const nextMonthDate = new Date(year, month, 1)
    const end = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`

    const { data, error } = await admin
      .from('jobs')
      .select('id, job_type, status, scheduled_date, scheduled_time, customers(name)')
      .gte('scheduled_date', start)
      .lt('scheduled_date', end)
      .not('scheduled_date', 'is', null)
      .order('scheduled_date', { ascending: true })

    if (error) throw new Error(error.message)

    return (data as Record<string, unknown>[]).map(({ customers, ...j }) => ({
      ...j, customer: customers,
    })) as (Job & { customer: { name: string } })[]
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  cd volturaos && git add lib/actions/jobs.ts
  git commit -m "feat: add getJobsForMonth server action"
  ```

---

## Task 3: JobCalendar client component

**Files:**
- Create: `volturaos/components/jobs/JobCalendar.tsx`

### Context
This is a `'use client'` component. It receives `jobs`, `year`, `month` as props. It builds the calendar grid using pure JS Date math — no libraries. Day cells show up to 2 job chips + "+N more" span if needed.

**Today highlight:** Use `new Date().toLocaleDateString('en-CA')` which yields `'YYYY-MM-DD'` in local time — avoid `toISOString()` which uses UTC and can shift the date for users in non-UTC zones.

**Month navigation:** Compute prev/next params from props using JS Date, same December-safe pattern as the server action. Each chip is a `Link` to `/jobs/[id]`. "+N more" is a plain `<span>` (not a link — spec says non-interactive).

**Filler cells:** Days from prev/next month to fill the 7-column grid. Show dimmed day number with `text-white/20`.

### Steps

- [ ] **Step 1: Create components/jobs/JobCalendar.tsx**

  ```tsx
  'use client'
  import Link from 'next/link'
  import type { Job } from '@/types'
  import { STATUS_ACCENT } from '@/lib/constants/jobStatus'

  interface JobCalendarProps {
    jobs: (Job & { customer: { name: string } })[]
    year: number
    month: number
  }

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  export function JobCalendar({ jobs, year, month }: JobCalendarProps) {
    // Month navigation — December-safe
    const prevDate = new Date(year, month - 2, 1) // month-2: JS 0-indexed, month is 1-indexed
    const nextDate = new Date(year, month, 1)
    const prevParam = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
    const nextParam = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`

    const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    // Today in local time (YYYY-MM-DD)
    const todayISO = new Date().toLocaleDateString('en-CA')

    // Build grid: first day of month and total days
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay() // 0=Sun
    const daysInMonth = new Date(year, month, 0).getDate()

    // Total cells: leading fillers + days + trailing fillers to fill complete rows
    const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7

    // Build a map: 'YYYY-MM-DD' → jobs[]
    const jobsByDate: Record<string, (Job & { customer: { name: string } })[]> = {}
    for (const job of jobs) {
      if (job.scheduled_date) {
        if (!jobsByDate[job.scheduled_date]) jobsByDate[job.scheduled_date] = []
        jobsByDate[job.scheduled_date].push(job)
      }
    }

    const mm = String(month).padStart(2, '0')

    return (
      <div className="mt-2">
        {/* Month navigation header */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href={`/jobs/calendar?month=${prevParam}`}
            className="text-gray-400 hover:text-volturaGold px-3 py-1 text-lg"
          >
            ←
          </Link>
          <span className="text-white font-semibold text-sm">{monthLabel}</span>
          <Link
            href={`/jobs/calendar?month=${nextParam}`}
            className="text-gray-400 hover:text-volturaGold px-3 py-1 text-lg"
          >
            →
          </Link>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-gray-500 text-[10px] uppercase tracking-wider py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/5 rounded-xl overflow-hidden">
          {Array.from({ length: totalCells }, (_, idx) => {
            const dayNum = idx - firstDayOfMonth + 1
            const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth

            if (!isCurrentMonth) {
              return (
                <div key={idx} className="bg-volturaBlue min-h-[80px] p-1">
                  <span className="text-white/20 text-xs">
                    {dayNum <= 0
                      ? new Date(year, month - 1, dayNum).getDate()
                      : dayNum - daysInMonth}
                  </span>
                </div>
              )
            }

            const dd = String(dayNum).padStart(2, '0')
            const dateKey = `${year}-${mm}-${dd}`
            const dayJobs = jobsByDate[dateKey] ?? []
            const isToday = dateKey === todayISO
            const visibleJobs = dayJobs.slice(0, 2)
            const extraCount = dayJobs.length - 2

            return (
              <div key={idx} className="bg-volturaNavy/80 min-h-[80px] p-1">
                {/* Day number */}
                <div className="flex justify-start mb-1">
                  <span
                    className={`text-xs w-5 h-5 flex items-center justify-center ${
                      isToday
                        ? 'ring-1 ring-volturaGold rounded-full text-volturaGold font-bold'
                        : 'text-gray-400'
                    }`}
                  >
                    {dayNum}
                  </span>
                </div>

                {/* Job chips */}
                <div className="flex flex-col gap-0.5">
                  {visibleJobs.map(job => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="block text-[10px] text-white truncate px-1 rounded border-l-2 bg-white/5"
                      style={{ borderLeftColor: STATUS_ACCENT[job.status] ?? '#4b5563' }}
                    >
                      {job.customer.name}
                    </Link>
                  ))}
                  {extraCount > 0 && (
                    <span className="text-gray-500 text-xs pl-1">+{extraCount} more</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  cd volturaos && git add components/jobs/JobCalendar.tsx
  git commit -m "feat: add JobCalendar client component"
  ```

---

## Task 4: Calendar page + Jobs list page toggle

**Files:**
- Create: `volturaos/app/(app)/jobs/calendar/page.tsx`
- Modify: `volturaos/app/(app)/jobs/page.tsx`

### Context
The calendar page is a server component that reads the `?month=YYYY-MM` URL param. The jobs list page currently has `action={<Link href="/jobs/new" ...>+ New</Link>}` — this is replaced with a fragment containing all three items (List/Cal/+New). On the list page, List is gold (active) and Cal is gray. On the calendar page, Cal is gold (active) and List is gray.

Spec note: the PageHeader title stays `"Jobs"` on both pages. The toggle fits inside the existing `action` slot — no layout changes needed.

### Steps

- [ ] **Step 1: Create app/(app)/jobs/calendar/page.tsx**

  ```tsx
  export const dynamic = 'force-dynamic'

  import { getJobsForMonth } from '@/lib/actions/jobs'
  import { JobCalendar } from '@/components/jobs/JobCalendar'
  import { PageHeader } from '@/components/ui/PageHeader'
  import Link from 'next/link'

  export default async function JobCalendarPage({
    searchParams,
  }: {
    searchParams: Promise<{ month?: string }>
  }) {
    const { month } = await searchParams
    const now = new Date()
    let year = now.getFullYear()
    let monthNum = now.getMonth() + 1 // 1-indexed

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map(Number)
      year = y
      monthNum = m
    }

    const jobs = await getJobsForMonth(year, monthNum)

    return (
      <>
        <PageHeader
          title="Jobs"
          action={
            <div className="flex items-center gap-2">
              <Link href="/jobs" className="text-gray-400 text-xs">List</Link>
              <Link href="/jobs/calendar" className="text-volturaGold text-xs font-semibold">Cal</Link>
              <Link href="/jobs/new" className="text-volturaGold text-sm font-bold">+ New</Link>
            </div>
          }
        />
        <div className="px-4 pt-14 pb-6">
          <JobCalendar jobs={jobs} year={year} month={monthNum} />
        </div>
      </>
    )
  }
  ```

- [ ] **Step 2: Update app/(app)/jobs/page.tsx — add List/Cal toggle**

  In `app/(app)/jobs/page.tsx`, replace the existing `action` prop:

  Before:
  ```tsx
  action={<Link href="/jobs/new" className="text-volturaGold text-sm pr-4">+ New</Link>}
  ```

  After:
  ```tsx
  action={
    <div className="flex items-center gap-2">
      <Link href="/jobs" className="text-volturaGold text-xs font-semibold">List</Link>
      <Link href="/jobs/calendar" className="text-gray-400 text-xs">Cal</Link>
      <Link href="/jobs/new" className="text-volturaGold text-sm font-bold">+ New</Link>
    </div>
  }
  ```

- [ ] **Step 3: Commit**

  ```bash
  cd volturaos && git add app/\(app\)/jobs/calendar/page.tsx app/\(app\)/jobs/page.tsx
  git commit -m "feat: add monthly job calendar page with List/Cal toggle"
  ```

---

## Task 5: Verify build + push to Vercel

- [ ] **Step 1: Run TypeScript check**

  ```bash
  cd volturaos && npx tsc --noEmit
  ```

  Expected: no errors. If errors, fix them before proceeding.

- [ ] **Step 2: Push to Vercel**

  ```bash
  cd volturaos && git push
  ```

  Expected: Vercel auto-deploys. Check the Vercel dashboard for build success.
