# Phase B: Customer History, Revenue Sparkline, Global Search

**Date:** 2026-04-08  
**Status:** Approved

---

## Overview

Three independent features that deepen the data layer and UX of VolturaOS. No new DB tables required.

---

## Feature 1: Revenue Sparkline on Dashboard

### Goal
Show a 30-day daily revenue trend line inside the Monthly Revenue KPI card.

### Data
`getDashboardData()` in `lib/actions/dashboard.ts` gets a new parallel query:

```ts
admin.from('invoice_payments').select('amount, paid_at').gte('paid_at', thirtyDaysAgo)
```

Results are bucketed by calendar day (UTC) into a 30-element array `sparklineData: { date: string; amount: number }[]`. Days with no payments get `amount: 0`.

**Note on axis alignment:** The existing `monthRevenue` KPI value counts payments made in the current calendar month. The sparkline shows the rolling 30-day window. These are intentionally different — the KPI answers "how much this month?" and the sparkline answers "is it trending up?". No alignment is needed.

### SparklineChart Component
New `components/dashboard/SparklineChart.tsx`:

- Props: `data: { date: string; amount: number }[]`
- Renders a pure SVG `<polyline>` — no chart library
- SVG element: `width="100%" height="32" viewBox="0 0 100 32" preserveAspectRatio="none"`
- Points computed via min/max normalization across the 30 values; x is evenly distributed 0→100
- Stroke: `#D4AF37` (volturaGold), stroke-width `1.5`, `fill="none"`
- If all values are zero: return null (nothing rendered)

### KPICards Integration
`KPICards.tsx` currently defines a `CardDef` interface and maps over an array of cards. To render the sparkline in only the revenue card:

Add an optional `sparkline?: React.ReactNode` field to `CardDef`. Pass `<SparklineChart data={sparklineData} />` as the `sparkline` value for the revenue card entry. In the card template, render `{card.sparkline}` below the value text when present.

`KPICards` receives a new `sparklineData` prop:
```ts
interface KPICardsProps {
  // ...existing props
  sparklineData: { date: string; amount: number }[]
}
```

### Changes
- `lib/actions/dashboard.ts` — add `invoice_payments` query, compute and return `sparklineData`
- `components/dashboard/SparklineChart.tsx` — new component
- `components/dashboard/KPICards.tsx` — add `sparkline` field to `CardDef`, accept `sparklineData` prop, mount sparkline in revenue card

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

Merge into `HistoryItem[]` and sort by `created_at` descending. Null-guard amounts when building items:

```ts
interface HistoryItem {
  type: 'job' | 'invoice' | 'estimate'
  id: string
  title: string       // job_type | `Invoice $${total ?? 0}` | estimate name
  status: string
  amount?: number     // (total ?? 0) for invoices and estimates
  date: string        // created_at
  href: string        // /jobs/id | /invoices/id | /estimates/id
}
```

### CustomerHistory Component
New `components/customers/CustomerHistory.tsx`.

Each row:
- Left: Lucide icon (`Wrench` for job, `DollarSign` for invoice, `FileText` for estimate) in a small colored circle
- Middle: title + date (short format)
- Right: `StatusPill` + optional amount in `volturaGold`
- Entire row is a `Link` to `href`
- Compact rows with `divide-y divide-white/5`

Section header: `"HISTORY"` in the same uppercase tracking style as existing section headers in `CustomerDetail`.

### Changes
- `lib/actions/customers.ts` — add `getCustomerHistory()`
- `components/customers/CustomerHistory.tsx` — new component
- `app/(app)/customers/[id]/page.tsx` — fetch history in parallel with existing data, render `<CustomerHistory />` below `<EquipmentSection />`

---

## Feature 3: Global Search

### Goal
A dedicated `/search` page reachable via a search icon in the app layout. Searches across customers, jobs, estimates, and invoices simultaneously.

### Entry Point — Layout Fixed Icon
A Lucide `Search` icon `Link` added to `app/(app)/layout.tsx`:

```tsx
<Link href="/search" className="fixed top-3 right-16 z-60 text-gray-400 hover:text-volturaGold p-1" aria-label="Search">
  <Search size={20} />
</Link>
```

Position: `fixed top-3 right-16 z-60`. **Must use `z-60` (not `z-40`)** — `PageHeader` is `z-50` and a lower z-index would hide the icon behind the header. `right-16` (64px) keeps clear of `PageHeader`'s `action` slot which sits at `right-2`–`right-4`.

### Route
`app/(app)/search/page.tsx` — `'use client'`, controlled input, 300ms debounce via `useEffect`/`setTimeout`.

### Server Action
New `lib/actions/search.ts` with `searchAll(query: string)`:

```ts
'use server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function searchAll(query: string) {
  if (!query || query.trim().length < 2) return null
  const q = query.trim()
  const admin = createAdminClient()

  const [customers, jobs, estimates, invoices] = await Promise.all([
    admin.from('customers').select('id, name, phone, address, property_type').ilike('name', `%${q}%`).limit(5),
    admin.from('jobs').select('id, job_type, status, scheduled_date, customers(name)').ilike('job_type', `%${q}%`).limit(5),
    admin.from('estimates').select('id, name, total, status, customers(name)').ilike('name', `%${q}%`).limit(5),
    // Invoices have no direct text field — search by customer name via inner join
    admin.from('invoices').select('id, total, status, created_at, customers!inner(name)').ilike('customers.name', `%${q}%`).limit(5),
  ])

  return {
    customers: customers.data ?? [],
    jobs: jobs.data ?? [],
    estimates: estimates.data ?? [],
    invoices: invoices.data ?? [],
  }
}
```

The invoice query uses `customers!inner(name)` with `.ilike('customers.name', ...)` — PostgREST inner join filter on the related table. This is the correct Supabase pattern for filtering by a joined column.

### Page Layout
```
PageHeader title="Search" (no back button — top-level page)
Search input (large, autofocused, focus:border-volturaGold)

[While debounce pending or query < 2 chars: show nothing]

[Results after debounce resolves:]
Customers (N)  [hidden if 0]
Jobs (N)        [hidden if 0]
Estimates (N)   [hidden if 0]
Invoices (N)    [hidden if 0]

[No results: "No results for 'query'" if all 0]
```

Each result row is a compact `Link` to the detail page. Loading state: no spinner — the debounce is 300ms, fast enough that no indicator is needed. Out of scope: skeleton loading, cancellation of in-flight requests.

### Changes
- `lib/actions/search.ts` — new file
- `app/(app)/search/page.tsx` — new page
- `app/(app)/layout.tsx` — add search icon link at `z-60`

---

## Out of Scope (Phase B)
- Full-text search (FTS)
- Search history / recent searches
- Searching within line items or notes fields
- Revenue chart beyond 30 days
- Search loading skeleton / request cancellation

---

## No DB Migrations Required
All queries use existing tables and columns.
