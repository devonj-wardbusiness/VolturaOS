# Phase B: Customer History, Revenue Sparkline, Global Search

**Date:** 2026-04-08  
**Status:** Approved

---

## Overview

Three independent features that deepen the data layer and UX of VolturaOS. No new DB tables required.

---

## Feature 1: Revenue Sparkline on Dashboard

### Goal
Show a 30-day daily revenue trend line inside the Monthly Revenue KPI card so the user can see at a glance whether revenue is growing or flat.

### Data
`getDashboardData()` in `lib/actions/dashboard.ts` gets a new parallel query:

```ts
admin.from('invoice_payments').select('amount, paid_at').gte('paid_at', thirtyDaysAgo)
```

Results are bucketed by calendar day (UTC) into a 30-element array: `{ date: string; amount: number }[]`. Days with no payments get `amount: 0`. This array is returned as `sparklineData` alongside the existing dashboard fields.

### Component
New `SparklineChart` component at `components/dashboard/SparklineChart.tsx`.

- Props: `data: { date: string; amount: number }[]`
- Renders a pure SVG `<polyline>` — no chart library
- Width: `100%` (fills card), height: `32px`
- Stroke: `volturaGold` (`#D4AF37`), stroke-width 1.5, no fill
- Points computed from min/max normalization of the amounts array
- If all values are zero (no payments in 30 days), renders nothing (return null)

Mounted inside the Monthly Revenue KPI card in `KPICards.tsx`, below the `$` value.

### Changes
- `lib/actions/dashboard.ts` — add `invoice_payments` query, compute `sparklineData`
- `components/dashboard/SparklineChart.tsx` — new component
- `components/dashboard/KPICards.tsx` — accept and render `sparklineData` in the revenue card

---

## Feature 2: Customer History Timeline

### Goal
Show every job, invoice, and estimate for a customer in a single scrollable list on the customer detail page, sorted newest-first.

### Data
New server action `getCustomerHistory(customerId: string)` in `lib/actions/customers.ts`:

```ts
const [jobs, invoices, estimates] = await Promise.all([
  admin.from('jobs').select('id, job_type, status, scheduled_date, created_at').eq('customer_id', customerId).order('created_at', { ascending: false }),
  admin.from('invoices').select('id, total, status, created_at').eq('customer_id', customerId).order('created_at', { ascending: false }),
  admin.from('estimates').select('id, name, total, status, created_at').eq('customer_id', customerId).order('created_at', { ascending: false }),
])
```

Merges into `HistoryItem[]` sorted by `created_at` descending:

```ts
interface HistoryItem {
  type: 'job' | 'invoice' | 'estimate'
  id: string
  title: string       // job_type | 'Invoice $X' | estimate name
  status: string
  amount?: number     // invoices and estimates only
  date: string        // created_at
  href: string        // /jobs/id | /invoices/id | /estimates/id
}
```

### Component
New `CustomerHistory` component at `components/customers/CustomerHistory.tsx`.

Each row:
- Left: Lucide icon (`Wrench` for job, `DollarSign` for invoice, `FileText` for estimate) in a small colored circle
- Middle: title + date (formatted short)
- Right: `StatusPill` + optional amount in `volturaGold`
- Entire row is a `Link` to `href`
- Compact height (~56px per row), `divide-y divide-white/5`

Section header: `"HISTORY"` label (same style as existing section headers in `CustomerDetail`).

### Changes
- `lib/actions/customers.ts` — add `getCustomerHistory()`
- `components/customers/CustomerHistory.tsx` — new component
- `app/(app)/customers/[id]/page.tsx` — fetch history in parallel with existing data, render `<CustomerHistory />` below `<EquipmentSection />`

---

## Feature 3: Global Search

### Goal
A dedicated `/search` page reachable via a search icon in the app layout. Searches across customers, jobs, estimates, and invoices simultaneously.

### Entry Point
A `Search` Lucide icon link added to `app/(app)/layout.tsx` — fixed top-right corner, links to `/search`. Alternatively, added to `PageHeader` as a persistent icon. Chosen location: **fixed top-right** in the layout so it's accessible from all pages without touching every PageHeader.

Position: `fixed top-3 right-14 z-40` (leaves room for the existing Next.js dev toolbar in dev, and doesn't conflict with PageHeader back button on the left).

### Route
`app/(app)/search/page.tsx` — `'use client'`, controlled input with 300ms debounce.

### Server Action
New `searchAll(query: string)` in `lib/actions/search.ts`:

```ts
'use server'
// Returns null if query is empty or < 2 chars
// Runs 4 parallel ilike queries:
admin.from('customers').select('id, name, phone, address').ilike('name', `%${q}%`).limit(5)
admin.from('jobs').select('id, job_type, status, customers(name)').ilike('job_type', `%${q}%`).limit(5)
admin.from('estimates').select('id, name, total, status, customers(name)').ilike('name', `%${q}%`).limit(5)
admin.from('invoices').select('id, total, status, customers(name)').limit(5)
// invoices searched by customer name join (ilike on customers.name)
```

Returns `{ customers, jobs, estimates, invoices }` — each is an array (empty if no matches).

### Page Layout
```
Search input (large, autofocused, gold border on focus)

[Results — shown after 2+ chars typed]

Customers (N)
  [CustomerCard-style compact rows]

Jobs (N)
  [JobCard-style compact rows]

Estimates (N)
  [compact rows with name + status + total]

Invoices (N)
  [compact rows with customer name + status + total]

[No results state if all arrays empty]
```

Empty sections (0 results) are hidden. Each result row is a `Link` to the detail page.

### Changes
- `lib/actions/search.ts` — new file with `searchAll()`
- `app/(app)/search/page.tsx` — new page
- `app/(app)/layout.tsx` — add search icon link

---

## Out of Scope (Phase B)
- Full-text search (FTS) — `ilike` is sufficient for now
- Search history / recent searches
- Searching within line items or notes fields
- Revenue chart beyond 30 days

---

## No DB Migrations Required
All queries use existing tables and columns.
