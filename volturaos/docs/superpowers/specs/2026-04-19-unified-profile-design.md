# Unified Customer + Job Profile — Design Spec

**Date:** 2026-04-19
**Status:** Approved by Devon

---

## Overview

Replace the Jobs list with a "Today" schedule view and unify the job/customer detail experience into a single left-sidebar profile screen. Opening any job gives the electrician full customer context — estimates, invoices, history, notes — without switching between tabs.

This is a pure UI restructuring. No new DB tables are added. The existing `scheduled_date` and `scheduled_time` fields on the `jobs` table are used to drive the Today view time column (see DB section for details).

---

## Goals

1. **Field-first:** Open Today → see what's on deck → tap job → have everything in one screen
2. **Kill context-switching:** No more bouncing between Customers and Jobs to piece together a picture
3. **Sidebar foundation:** The Forms tab slot is wired up (placeholder) so the Forms system can drop in without restructuring

---

## Part 1 — Today View

**Route:** `/jobs` (replaces the current all-jobs list)
**Bottom nav label:** "Jobs" → renamed to **"Today"**

### Layout

Time-ordered list of today's jobs. Each card:

| Element | Detail |
|---------|--------|
| Time column | `scheduled_time` string in gold (e.g. "8:00 AM"). If null, shows "—" |
| Customer name | Bold, white |
| Job title | Muted subtitle |
| Address | 📍 emoji + address string |
| Status badge | Pill: Scheduled (blue) · In Progress (gold) · Completed (green) |

Tap any card → `/jobs/[id]` (Unified Profile)

**Filter:** Jobs with status `Scheduled` or `In Progress`, ordered by `scheduled_time` ASC nulls last, then `created_at`.

**Empty state:** "No jobs scheduled today — add one from the dashboard" with a `+` CTA linking to job creation.

### DB fields used

The `jobs` table already has `scheduled_date: string | null` and `scheduled_time: string | null`. No migration needed.

- `scheduled_time` drives the time column display. Jobs with no `scheduled_time` render "—" and sort last.
- `scheduled_date` is not used in the Today filter (all Scheduled/In Progress jobs are treated as "today" — a date-aware filter is out of scope for this spec).

> **Note for implementer:** The Today view intentionally shows *all* Scheduled + In Progress jobs regardless of `scheduled_date`. A proper date-filtered calendar view is a future feature. Jobs with `status = 'In Progress'` may have no `scheduled_time` value; they always appear below timed jobs (NULLS LAST ordering).

---

## Part 2 — Unified Profile

**Route:** `/jobs/[id]`
**Entry points:**
- Tap a job card in Today view
- Any existing job navigation in the app
- From `/customers/[id]` → tap a job in the customer's job list

### Header (fixed)

```
← [Customer Name]              [Status Badge]  ⋮
   (719) 555-0182 · job_type
```

> **Note:** The job's display label is `job.job_type` (e.g. "Panel Upgrade", "EV Charger Install"). There is no `title` field on the `Job` type — always use `job_type`.

Back arrow → `router.back()`

### Left Sidebar

Vertical icon + label tabs, 60px wide:

| Icon | Label | Color when active |
|------|-------|-------------------|
| 🔧 | Job | Gold border-left |
| 📍 | History | Gold border-left |
| 📄 | Estimates | Gold border-left |
| 💲 | Invoice | Gold border-left |
| 📋 | Forms | Grayed out (disabled, "Coming soon") |

Active tab: `#1A1F6E` background + gold left border + gold label. Inactive: dim label.

---

### Tab: Job (default)

1. **Customer card** — name, address, one-line summary. "📞 Call" button (tel: link to phone).
2. **Progress stepper** — horizontal track showing the four primary field states: **Lead → Scheduled → In Progress → Completed**. Past steps filled gold; current step pulsing gold ring; future steps dim.

   The full `JobStatus` enum also includes `Invoiced`, `Paid`, and `Cancelled`. Handle them in the stepper as follows:
   - `Invoiced` / `Paid` — render all four steps filled gold (job is done + financially resolved). Hide the "Complete Job" CTA. Show a green "Invoiced" or "Paid" badge instead.
   - `Cancelled` — render the stepper in a red/dim error state with an `✖ Cancelled` label. Hide the "Complete Job" CTA.

3. **"✅ Complete Job" CTA** — full-width gold button. Shown only when status is `Lead`, `Scheduled`, or `In Progress`. On tap: updates job status to `Completed`, fires Telegram notification.
4. **Notes** — read/edit text area. Auto-saves on blur via `updateJob`.

---

### Tab: History

1. **Customer contact card** — name, phone, email, address. Action buttons: Call · New Invoice · Edit Customer.
2. **Activity timeline** — reverse chronological list of all events for this customer:
   - Jobs: title + status badge + date
   - Estimates: name + status + total
   - Invoices: invoice # + balance + status

Each timeline item is tappable and navigates to the relevant detail page.

---

### Tab: Estimates

Visual reference: `C:\Users\Devon\Downloads\EstimatesList.jsx` (a self-contained React mockup Devon provided). The prose below fully describes the required layout — the JSX file is supplementary if the implementer wants pixel-level reference.

**Action row:**
- 💳 Financing (gold, primary)
- + Add Estimate (outline, links to `/estimates/new?customerId=...`)

**Estimate cards** (one per estimate linked to this customer):
- Title + status badge (Draft / Sent / Approved) + ⋮ kebab menu
- Items count badge
- Divider
- Price row: **Regular Price** | **Potential Savings** (10% of price)
- Tap to expand inline actions: Edit · Present · Send · Convert to Invoice

**Footer bar:**
- Left: "Total (N Estimates)" + sum in gold
- Right: "Total Savings" + sum in green

---

### Tab: Invoice

List of invoices linked to this customer (not just this job, for full financial context).

Each card:
- Invoice # + job name
- Total · Balance · Due date
- Status badge (Unpaid red / Partial yellow / Paid green)
- Actions: Record Payment · Send Reminder

"+ New Invoice" button at top links to `/invoices/new?customerId=...`.

---

### Tab: Forms (placeholder)

Full-panel locked state:

```
🔒 Forms coming soon
Digital field forms, waivers, and material lists
```

Gray overlay, non-interactive. This slot is reserved for the Forms system (separate feature).

---

## Part 3 — Customer Entry Point

**Route:** `/customers/[id]` (minimal modification)

The page already renders `CustomerDetail` + `EquipmentSection` + `CustomerHistory`. The `CustomerHistory` component already displays a reverse-chronological timeline of all jobs, estimates, and invoices for the customer. **No new `CustomerJobsList` component is needed.**

**Only change:** Ensure job items in `CustomerHistory` render as tappable links to `/jobs/[id]` (the new Unified Profile). If they already navigate there, no change is needed at all.

Check `components/customers/CustomerHistory.tsx` — if job rows already have an `href="/jobs/{id}"` link, this page requires zero changes. If not, update the job row to be a `<Link href={/jobs/${item.id}}>` wrapper.

This keeps the customer page lightweight and avoids duplicating the history display that already exists.

---

## Data Architecture

### New server action

**`getJobWithContext(id: string)`** in `lib/actions/jobs.ts`

Returns:
```ts
{
  job: Job & { customer: Pick<Customer, 'id' | 'name' | 'phone' | 'email' | 'address'> }
  estimates: Estimate[]   // all estimates for this customer, ordered by created_at DESC
  invoices: Invoice[]     // all invoices for this customer, ordered by created_at DESC
  jobHistory: Job[]       // all jobs for this customer, ordered by created_at DESC
}
```

The `customer` shape is `Pick<Customer, 'id' | 'name' | 'phone' | 'email' | 'address'>` — **not** the full `Customer` type. Use this exact Pick in `JobWithContext` to match what the Supabase select string actually returns and avoid TypeScript errors in component props.

Implemented as parallel Supabase queries — five `.select()` calls wrapped in `Promise.all` (job+customer, estimates, invoices, jobHistory, plus re-use existing `getOrCreateChecklist` + `getJobPhotos` + `listChangeOrdersForJob`).

### Existing job detail data

The current `/jobs/[id]` page fetches: checklist, job photos, signed estimate, change orders. These are **preserved** in the new Unified Profile — they move into the **Job tab** below the Notes section, in this order:

1. Customer card + Call button
2. Progress stepper
3. Complete Job CTA
4. Notes (auto-save)
5. **Checklist** (existing `JobChecklist` component, re-used as-is)
6. **Site Photos** (existing `JobPhotos` component, re-used as-is)
7. **Change Orders** (existing `ChangeOrderList` component, re-used as-is)

The signed estimate banner (if present) can be dropped from the Job tab — it's accessible via the Estimates tab.

The `getJobWithContext` action therefore fetches everything the old page did, plus the additional customer/history data.

### Modified server actions

- `listTodayJobs()` — added to `lib/actions/jobs.ts`. Filters `status IN ('Scheduled', 'In Progress')`, orders by `scheduled_time ASC NULLS LAST, created_at ASC`. Returns each job with its customer join (`id, name, phone, address`).
- `updateJob()` — already exists, no changes needed.

The `getJobWithContext` action calls `getOrCreateChecklist` (from `lib/actions/checklists.ts`), `getJobPhotos` (from `lib/actions/job-photos.ts`), and `listChangeOrdersForJob` (from `lib/actions/change-orders.ts`) — these exist in separate action files, not in `jobs.ts`. Import them where needed.

### New type

```ts
// types/index.ts
export type JobWithContext = {
  job: Job & { customer: Pick<Customer, 'id' | 'name' | 'phone' | 'email' | 'address'> }
  estimates: Estimate[]
  invoices: Invoice[]
  jobHistory: Job[]
}
```

---

## Component Map

```
app/(app)/jobs/page.tsx                     MODIFY — swap JobList for TodayView
app/(app)/jobs/[id]/page.tsx                MODIFY — swap job detail for UnifiedProfile
app/(app)/customers/[id]/page.tsx           MODIFY — add CustomerJobsList section

components/jobs/TodayView.tsx               CREATE — today schedule list (client)
components/jobs/TodayJobCard.tsx            CREATE — single card with time column

components/profile/UnifiedProfile.tsx       CREATE — main wrapper, tab state (client)
components/profile/ProfileHeader.tsx        CREATE — back + customer name + status + menu
components/profile/ProfileSidebar.tsx       CREATE — left sidebar tab nav

components/profile/tabs/JobTab.tsx          CREATE
components/profile/tabs/HistoryTab.tsx      CREATE
components/profile/tabs/EstimatesTab.tsx    CREATE — adapts EstimateGroupCard logic
components/profile/tabs/InvoiceTab.tsx      CREATE
components/profile/tabs/FormsTab.tsx        CREATE — placeholder only

components/customers/CustomerHistory.tsx    MAYBE MODIFY — ensure job rows link to /jobs/[id]
```

---

## Pages Modified

| File | Change |
|------|--------|
| `app/(app)/jobs/page.tsx` | Replace `<JobList>` with `<TodayView>`. Keep `force-dynamic`. |
| `app/(app)/jobs/[id]/page.tsx` | Call `getJobWithContext(id)`. Render `<UnifiedProfile>` instead of current job detail. |
| `app/(app)/customers/[id]/page.tsx` | No change if `CustomerHistory` job rows already link to `/jobs/[id]`. Otherwise: update `CustomerHistory` job row links only. |

---

## Navigation Changes

| Before | After |
|--------|-------|
| Bottom nav "Jobs" → all jobs list | Bottom nav "Today" → today's schedule |
| `/jobs/[id]` → minimal job detail | `/jobs/[id]` → full unified profile |
| `/customers/[id]` → contact card + CustomerHistory | `/customers/[id]` → same, job items in history link to Unified Profile |

The existing `/estimates`, `/invoices`, `/customers` routes are **unchanged**.

---

## What's Not Changing

- `/estimates/[id]` full estimate builder — still the place to edit line items
- The `EstimateBuilder` component — untouched
- `/invoices/[id]` invoice detail — untouched
- `/customers` list page — untouched
- All server actions except additions to `jobs.ts`
- Bottom nav Home, Customers, Invoices, Search slots — unchanged

---

## Error Handling

- `getJobWithContext` throws → `notFound()` (same pattern as `EstimatePage`)
- `listTodayJobs` returns empty array (not throw) → show empty state
- "Complete Job" tap → `useTransition` + `isPending` button guard (no double-tap)
- Missing phone number → hide "Call" button rather than show broken tel: link

---

## Out of Scope (this spec)

- Scheduling UI (date/time picker for `scheduled_for`) — jobs get a time manually for now; full calendar view is a later feature
- Forms tab implementation — separate spec
- Push notifications for job assignments
- Crew assignment
