# Unified Customer + Job Profile — Design Spec

**Date:** 2026-04-19
**Status:** Approved by Devon

---

## Overview

Replace the Jobs list with a "Today" schedule view and unify the job/customer detail experience into a single left-sidebar profile screen. Opening any job gives the electrician full customer context — estimates, invoices, history, notes — without switching between tabs.

This is a pure UI restructuring. No new DB tables are added except one nullable `scheduled_for` column on jobs.

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
| Time column | `scheduled_for` time in gold (e.g. "8:00 AM"). If null, shows "—" |
| Customer name | Bold, white |
| Job title | Muted subtitle |
| Address | 📍 emoji + address string |
| Status badge | Pill: Scheduled (blue) · In Progress (gold) · Completed (green) |

Tap any card → `/jobs/[id]` (Unified Profile)

**Filter:** Jobs with status `Scheduled` or `In Progress`, ordered by `scheduled_for` ASC nulls last, then `created_at`.

**Empty state:** "No jobs scheduled today — add one from the dashboard" with a `+` CTA linking to job creation.

### DB migration

```sql
ALTER TABLE jobs ADD COLUMN scheduled_for timestamptz;
```

No backfill needed. Existing jobs show `—` in the time column.

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
   (719) 555-0182 · Job Title
```

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
2. **Progress stepper** — horizontal: Lead → Scheduled → In Progress → Completed. Completed steps filled gold. Current step pulsing.
3. **"✅ Complete Job" CTA** — full-width gold button. On tap: updates job status to `Completed`, fires Telegram notification.
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

Matches the `EstimatesList.jsx` mockup Devon provided exactly.

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

**Route:** `/customers/[id]` (modified, not replaced)

Existing `CustomerDetail` component stays. Add below the contact card:

**Jobs section:**
- Header: "Jobs" + "+ New Job" button
- List of all jobs for this customer, most recent first
- Each row: job title · status badge · date · chevron
- Tap → `/jobs/[id]` (Unified Profile, Job tab active)

This keeps the customer list useful for non-job-context lookups (history, referrals, etc.) without duplicating the full profile at a second route.

---

## Data Architecture

### New server action

**`getJobWithContext(id: string)`** in `lib/actions/jobs.ts`

Returns:
```ts
{
  job: Job & { customer: Customer }
  estimates: Estimate[]          // all estimates for this customer
  invoices: Invoice[]            // all invoices for this customer
  jobHistory: Job[]              // all jobs for this customer
}
```

Single Supabase query with joins — no waterfall.

### Modified server actions

- `listTodayJobs()` — added to `lib/actions/jobs.ts`. Filters `status IN ('Scheduled', 'In Progress')`, orders by `scheduled_for ASC NULLS LAST, created_at ASC`.
- `updateJob()` — already exists, no changes needed.
- `listJobsByCustomer(customerId)` — added to `lib/actions/jobs.ts` for the customer page jobs section.

### New type

```ts
// types/index.ts
export type JobWithContext = {
  job: Job & { customer: Customer }
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

components/customers/CustomerJobsList.tsx   CREATE — jobs list for customer page
```

---

## Pages Modified

| File | Change |
|------|--------|
| `app/(app)/jobs/page.tsx` | Replace `<JobList>` with `<TodayView>`. Keep `force-dynamic`. |
| `app/(app)/jobs/[id]/page.tsx` | Call `getJobWithContext(id)`. Render `<UnifiedProfile>` instead of current job detail. |
| `app/(app)/customers/[id]/page.tsx` | Add `listJobsByCustomer(id)` call. Render `<CustomerJobsList>` below existing `<CustomerDetail>`. |

---

## Navigation Changes

| Before | After |
|--------|-------|
| Bottom nav "Jobs" → all jobs list | Bottom nav "Today" → today's schedule |
| `/jobs/[id]` → minimal job detail | `/jobs/[id]` → full unified profile |
| `/customers/[id]` → contact card only | `/customers/[id]` → contact card + job history list |

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
