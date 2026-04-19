# Phase B: Revenue Sparkline, Customer History, Global Search — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 30-day revenue sparkline to the dashboard KPI card, a unified scrollable history timeline on each customer's detail page, and a dedicated global search page reachable from a fixed icon in the app layout.

**Architecture:** Three independent features that each touch a data layer (server action) and a UI layer (component). No new DB tables; all queries use existing `invoice_payments`, `jobs`, `invoices`, `estimates`, and `customers` tables. Features are shipped in dependency order: sparkline first (dashboard data layer), then customer history (customers data layer), then global search (new actions file + new route + layout icon).

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4 (CSS-first globals.css `@theme inline` — no tailwind.config.ts), Supabase admin client, Lucide React icons, pure SVG (no chart library)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/actions/dashboard.ts` | Modify | Add `invoice_payments` query; compute and return `sparklineData` |
| `components/dashboard/SparklineChart.tsx` | Create | Pure SVG polyline chart component |
| `components/dashboard/KPICards.tsx` | Modify | Add `sparkline?: React.ReactNode` to `CardDef`; accept `sparklineData` prop; render sparkline in revenue card |
| `app/(app)/page.tsx` | Modify | Pass `sparklineData` from `getDashboardData()` to `<KPICards>` |
| `lib/actions/customers.ts` | Modify | Add `getCustomerHistory(customerId)` server action |
| `components/customers/CustomerHistory.tsx` | Create | Scrollable history timeline component |
| `app/(app)/customers/[id]/page.tsx` | Modify | Fetch history in parallel; render `<CustomerHistory>` below `<EquipmentSection>` |
| `lib/actions/search.ts` | Create | `searchAll(query)` server action — parallel queries across 4 tables |
| `app/(app)/search/page.tsx` | Create | Client component with debounced input and result sections |
| `app/(app)/layout.tsx` | Modify | Add fixed Search icon Link at `top-3 right-16 z-60` |

---

## Task 1: SparklineChart component + dashboard data

**Files:**
- Modify: `volturaos/lib/actions/dashboard.ts`
- Create: `volturaos/components/dashboard/SparklineChart.tsx`
- Modify: `volturaos/components/dashboard/KPICards.tsx`
- Modify: `volturaos/app/(app)/page.tsx`

### Context
`getDashboardData()` currently runs 4 parallel queries in `Promise.all`. `KPICards` receives 6 number props and maps a `CardDef[]` array — each card has `{ label, value, color, accent, Icon }`. The revenue card is the first entry in the array (label `'Monthly Revenue'`).

### Steps

- [ ] **Step 1: Add invoice_payments query to getDashboardData()**

  In `lib/actions/dashboard.ts`, add a 5th query to the existing `Promise.all`. Compute `thirtyDaysAgo` as `new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()`. Add this query:

  ```ts
  admin.from('invoice_payments').select('amount, paid_at').gte('paid_at', thirtyDaysAgo)
  ```

  After the `Promise.all`, bucket the results by calendar day (UTC) into a 30-element array. Build the array by iterating `i` from 0 to 29, computing `date = new Date(Date.now() - (29 - i) * 86400000)`, formatting as `YYYY-MM-DD` using `.toISOString().slice(0, 10)`, and summing payments whose `paid_at` starts with that date string.

  Add `sparklineData: { date: string; amount: number }[]` to the return object.

  Full addition to `lib/actions/dashboard.ts`:

  ```ts
  // Inside getDashboardData(), add to Promise.all destructure:
  const [invoices, jobs, estimates, recentJobs, payments] = await Promise.all([
    admin.from('invoices').select('total, amount_paid, status, created_at'),
    admin.from('jobs').select('status, created_at'),
    admin.from('estimates').select('status, total, created_at'),
    admin.from('jobs').select('*, customers(name)').order('created_at', { ascending: false }).limit(5),
    admin.from('invoice_payments').select('amount, paid_at').gte('paid_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const allPayments = (payments.data ?? []) as { amount: number; paid_at: string }[]

  const sparklineData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10)
    const amount = allPayments
      .filter(p => p.paid_at.startsWith(date))
      .reduce((sum, p) => sum + (p.amount ?? 0), 0)
    return { date, amount }
  })
  ```

  Add `sparklineData` to the return object.

- [ ] **Step 2: Create SparklineChart.tsx**

  Create `components/dashboard/SparklineChart.tsx`:

  ```tsx
  interface SparklineChartProps {
    data: { date: string; amount: number }[]
  }

  export function SparklineChart({ data }: SparklineChartProps) {
    if (data.every(d => d.amount === 0)) return null

    const values = data.map(d => d.amount)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1

    const points = values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * 100
        const y = 32 - ((v - min) / range) * 28 // 2px padding top/bottom
        return `${x},${y}`
      })
      .join(' ')

    return (
      <svg
        width="100%"
        height="32"
        viewBox="0 0 100 32"
        preserveAspectRatio="none"
        className="mt-2"
      >
        <polyline
          points={points}
          stroke="#D4AF37"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  ```

- [ ] **Step 3: Update KPICards to accept and render sparkline**

  In `components/dashboard/KPICards.tsx`:

  1. Add `sparkline?: React.ReactNode` field to `CardDef` interface.
  2. Add `sparklineData: { date: string; amount: number }[]` prop to `KPICardsProps`.
  3. Import `SparklineChart` at the top.
  4. In the cards array, add `sparkline: <SparklineChart data={sparklineData} />` to the Monthly Revenue card entry only.
  5. In the card template JSX, after the `<p>` value text, add:
     ```tsx
     {card.sparkline && card.sparkline}
     ```
  6. Update the `.map()` destructure to include `sparkline`:
     ```tsx
     {cards.map(({ label, value, color, accent, Icon, sparkline }) => (
     ```

- [ ] **Step 4: Pass sparklineData from dashboard page to KPICards**

  In `app/(app)/page.tsx`, pass `sparklineData={data.sparklineData}` to the `<KPICards>` component.

- [ ] **Step 5: Commit**

  ```bash
  cd volturaos && git add lib/actions/dashboard.ts components/dashboard/SparklineChart.tsx components/dashboard/KPICards.tsx app/\(app\)/page.tsx
  git commit -m "feat: add 30-day revenue sparkline to dashboard KPI card"
  ```

---

## Task 2: Customer history server action + CustomerHistory component

**Files:**
- Modify: `volturaos/lib/actions/customers.ts`
- Create: `volturaos/components/customers/CustomerHistory.tsx`
- Modify: `volturaos/app/(app)/customers/[id]/page.tsx`

### Context
`getCustomerById()` in `lib/actions/customers.ts` fetches the customer + equipment. The customer detail page fetches `getCustomerById` and `getActiveAgreement` in a `Promise.all`. It renders `<CustomerDetail>` then `<EquipmentSection>`. `StatusPill` is at `components/ui/StatusPill.tsx` and is used across the app. Lucide icons used elsewhere: `Wrench`, `DollarSign`, `FileText`.

The `HistoryItem` interface:
```ts
interface HistoryItem {
  type: 'job' | 'invoice' | 'estimate'
  id: string
  title: string
  status: string
  amount?: number
  date: string
  href: string
}
```

### Steps

- [ ] **Step 1: Add getCustomerHistory() server action**

  In `lib/actions/customers.ts`, add after the existing exports:

  ```ts
  interface HistoryItem {
    type: 'job' | 'invoice' | 'estimate'
    id: string
    title: string
    status: string
    amount?: number
    date: string
    href: string
  }

  export async function getCustomerHistory(customerId: string): Promise<HistoryItem[]> {
    await requireAuth()
    const admin = createAdminClient()

    const [jobs, invoices, estimates] = await Promise.all([
      admin.from('jobs').select('id, job_type, status, scheduled_date, created_at').eq('customer_id', customerId).order('created_at', { ascending: false }),
      admin.from('invoices').select('id, total, status, created_at').eq('customer_id', customerId).order('created_at', { ascending: false }),
      admin.from('estimates').select('id, name, total, status, created_at').eq('customer_id', customerId).order('created_at', { ascending: false }),
    ])

    const items: HistoryItem[] = [
      ...(jobs.data ?? []).map((j: Record<string, unknown>) => ({
        type: 'job' as const,
        id: j.id as string,
        title: (j.job_type as string) || 'Job',
        status: j.status as string,
        date: j.created_at as string,
        href: `/jobs/${j.id}`,
      })),
      ...(invoices.data ?? []).map((inv: Record<string, unknown>) => ({
        type: 'invoice' as const,
        id: inv.id as string,
        title: `Invoice $${(inv.total as number ?? 0).toLocaleString()}`,
        status: inv.status as string,
        amount: (inv.total as number) ?? 0,
        date: inv.created_at as string,
        href: `/invoices/${inv.id}`,
      })),
      ...(estimates.data ?? []).map((e: Record<string, unknown>) => ({
        type: 'estimate' as const,
        id: e.id as string,
        title: (e.name as string) || 'Estimate',
        status: e.status as string,
        amount: (e.total as number) ?? 0,
        date: e.created_at as string,
        href: `/estimates/${e.id}`,
      })),
    ]

    return items.sort((a, b) => b.date.localeCompare(a.date))
  }
  ```

- [ ] **Step 2: Create CustomerHistory component**

  Create `components/customers/CustomerHistory.tsx`:

  ```tsx
  import Link from 'next/link'
  import { Wrench, DollarSign, FileText } from 'lucide-react'
  import { StatusPill } from '@/components/ui/StatusPill'

  interface HistoryItem {
    type: 'job' | 'invoice' | 'estimate'
    id: string
    title: string
    status: string
    amount?: number
    date: string
    href: string
  }

  interface CustomerHistoryProps {
    items: HistoryItem[]
  }

  const TYPE_ICON = {
    job: Wrench,
    invoice: DollarSign,
    estimate: FileText,
  }

  const TYPE_COLOR = {
    job: '#38bdf8',
    invoice: '#D4AF37',
    estimate: '#a78bfa',
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  export function CustomerHistory({ items }: CustomerHistoryProps) {
    if (items.length === 0) return null

    return (
      <div className="mt-6">
        <p className="text-gray-500 text-[11px] uppercase tracking-widest mb-3">History</p>
        <div className="divide-y divide-white/5">
          {items.map(item => {
            const Icon = TYPE_ICON[item.type]
            const color = TYPE_COLOR[item.type]
            return (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.href}
                className="flex items-center gap-3 py-3"
              >
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <Icon size={14} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{item.title}</p>
                  <p className="text-gray-500 text-xs">{formatDate(item.date)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusPill status={item.status} />
                  {item.amount !== undefined && item.amount > 0 && (
                    <span className="text-volturaGold text-sm font-semibold">
                      ${item.amount.toLocaleString()}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 3: Fetch history and render CustomerHistory on customer detail page**

  In `app/(app)/customers/[id]/page.tsx`:

  1. Import `getCustomerHistory` and `CustomerHistory`.
  2. Add `getCustomerHistory(id)` to the `Promise.all` (becomes a 3-item array: `[customer, agreement, history]`).
  3. Render `<CustomerHistory items={history} />` after `<EquipmentSection ... />`.

  Full updated page:

  ```tsx
  import { getCustomerById, getCustomerHistory } from '@/lib/actions/customers'
  import { getActiveAgreement } from '@/lib/actions/agreements'
  import { notFound } from 'next/navigation'
  import { EquipmentSection } from '@/components/customers/EquipmentSection'
  import { CustomerDetail } from '@/components/customers/CustomerDetail'
  import { CustomerHistory } from '@/components/customers/CustomerHistory'
  import { PageHeader } from '@/components/ui/PageHeader'

  export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    let customer, agreement, history
    try {
      ;[customer, agreement, history] = await Promise.all([
        getCustomerById(id),
        getActiveAgreement(id),
        getCustomerHistory(id),
      ])
    } catch {
      notFound()
    }

    return (
      <>
        <PageHeader title={customer.name} backHref="/customers" />
        <div className="px-4 pt-14 pb-6">
          <CustomerDetail customer={customer} agreement={agreement} />
          <EquipmentSection customerId={customer.id} equipment={customer.equipment} />
          <CustomerHistory items={history} />
        </div>
      </>
    )
  }
  ```

- [ ] **Step 4: Commit**

  ```bash
  cd volturaos && git add lib/actions/customers.ts components/customers/CustomerHistory.tsx app/\(app\)/customers/\[id\]/page.tsx
  git commit -m "feat: add customer history timeline to customer detail page"
  ```

---

## Task 3: Global search — server action + search page + layout icon

**Files:**
- Create: `volturaos/lib/actions/search.ts`
- Create: `volturaos/app/(app)/search/page.tsx`
- Modify: `volturaos/app/(app)/layout.tsx`

### Context
The app layout at `app/(app)/layout.tsx` currently renders `{children}`, `<BottomNav>`, `<AIChatWidget>`, and `<FAB>`. PageHeader uses `z-50`. The search icon must be `fixed top-3 right-16 z-60` — `right-16` (64px) keeps clear of PageHeader's `action` slot, and `z-60` ensures visibility above the header.

The invoice search uses `customers!inner(name)` with `.ilike('customers.name', ...)` — PostgREST inner join filter. This is the correct Supabase pattern for filtering by a joined column (invoices have no direct text field to search).

### Steps

- [ ] **Step 1: Create lib/actions/search.ts**

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

- [ ] **Step 2: Create app/(app)/search/page.tsx**

  This is a `'use client'` component. It uses `useState` for the query, `useEffect` + `setTimeout` for 300ms debounce, and calls `searchAll` from the server action.

  ```tsx
  'use client'
  import { useState, useEffect } from 'react'
  import Link from 'next/link'
  import { PageHeader } from '@/components/ui/PageHeader'
  import { searchAll } from '@/lib/actions/search'

  type SearchResults = Awaited<ReturnType<typeof searchAll>>

  export default function SearchPage() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResults>(null)
    const [searched, setSearched] = useState(false)

    useEffect(() => {
      if (query.trim().length < 2) {
        setResults(null)
        setSearched(false)
        return
      }
      const timer = setTimeout(async () => {
        const data = await searchAll(query)
        setResults(data)
        setSearched(true)
      }, 300)
      return () => clearTimeout(timer)
    }, [query])

    const noResults =
      searched &&
      results &&
      results.customers.length === 0 &&
      results.jobs.length === 0 &&
      results.estimates.length === 0 &&
      results.invoices.length === 0

    return (
      <>
        <PageHeader title="Search" />
        <div className="px-4 pt-14 pb-6">
          <input
            autoFocus
            type="search"
            placeholder="Search customers, jobs, estimates..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-volturaNavy/50 border border-white/10 focus:border-volturaGold rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none mt-4 mb-6"
          />

          {noResults && (
            <p className="text-gray-500 text-sm text-center">No results for &ldquo;{query}&rdquo;</p>
          )}

          {results && results.customers.length > 0 && (
            <section className="mb-5">
              <p className="text-gray-500 text-[11px] uppercase tracking-widest mb-2">Customers ({results.customers.length})</p>
              <div className="divide-y divide-white/5">
                {results.customers.map((c: Record<string, unknown>) => (
                  <Link key={c.id as string} href={`/customers/${c.id}`} className="flex flex-col py-2.5">
                    <span className="text-white text-sm">{c.name as string}</span>
                    {c.address && <span className="text-gray-500 text-xs">{c.address as string}</span>}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results && results.jobs.length > 0 && (
            <section className="mb-5">
              <p className="text-gray-500 text-[11px] uppercase tracking-widest mb-2">Jobs ({results.jobs.length})</p>
              <div className="divide-y divide-white/5">
                {results.jobs.map((j: Record<string, unknown>) => {
                  const customer = j.customers as { name: string } | null
                  return (
                    <Link key={j.id as string} href={`/jobs/${j.id}`} className="flex justify-between items-center py-2.5">
                      <div>
                        <span className="text-white text-sm">{j.job_type as string}</span>
                        {customer && <p className="text-gray-500 text-xs">{customer.name}</p>}
                      </div>
                      <span className="text-gray-400 text-xs">{j.status as string}</span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {results && results.estimates.length > 0 && (
            <section className="mb-5">
              <p className="text-gray-500 text-[11px] uppercase tracking-widest mb-2">Estimates ({results.estimates.length})</p>
              <div className="divide-y divide-white/5">
                {results.estimates.map((e: Record<string, unknown>) => {
                  const customer = e.customers as { name: string } | null
                  return (
                    <Link key={e.id as string} href={`/estimates/${e.id}`} className="flex justify-between items-center py-2.5">
                      <div>
                        <span className="text-white text-sm">{e.name as string}</span>
                        {customer && <p className="text-gray-500 text-xs">{customer.name}</p>}
                      </div>
                      <span className="text-volturaGold text-xs">${((e.total as number) ?? 0).toLocaleString()}</span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {results && results.invoices.length > 0 && (
            <section className="mb-5">
              <p className="text-gray-500 text-[11px] uppercase tracking-widest mb-2">Invoices ({results.invoices.length})</p>
              <div className="divide-y divide-white/5">
                {results.invoices.map((inv: Record<string, unknown>) => {
                  const customer = inv.customers as { name: string } | null
                  return (
                    <Link key={inv.id as string} href={`/invoices/${inv.id}`} className="flex justify-between items-center py-2.5">
                      <div>
                        <span className="text-white text-sm">{customer?.name ?? 'Invoice'}</span>
                        <p className="text-gray-500 text-xs">{inv.status as string}</p>
                      </div>
                      <span className="text-volturaGold text-xs">${((inv.total as number) ?? 0).toLocaleString()}</span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </>
    )
  }
  ```

- [ ] **Step 3: Add Search icon to app layout**

  In `app/(app)/layout.tsx`, import `Search` from `lucide-react` and `Link` from `next/link`. Add this before `{children}`:

  ```tsx
  import Link from 'next/link'
  import { Search } from 'lucide-react'

  // Inside the returned JSX, add this Link inside the outer div:
  <Link
    href="/search"
    className="fixed top-3 right-16 z-60 text-gray-400 hover:text-volturaGold p-1"
    aria-label="Search"
  >
    <Search size={20} />
  </Link>
  ```

  The full layout becomes:
  ```tsx
  export const dynamic = 'force-dynamic'

  import Link from 'next/link'
  import { Search } from 'lucide-react'
  import { BottomNav } from '@/components/nav/BottomNav'
  import { AIChatWidget } from '@/components/ai-chat/AIChatWidget'
  import { FAB } from '@/components/ui/FAB'

  export default async function AppLayout({ children }: { children: React.ReactNode }) {
    return (
      <div className="min-h-dvh pb-16">
        <Link
          href="/search"
          className="fixed top-3 right-16 z-60 text-gray-400 hover:text-volturaGold p-1"
          aria-label="Search"
        >
          <Search size={20} />
        </Link>
        {children}
        <BottomNav />
        <AIChatWidget />
        <FAB />
      </div>
    )
  }
  ```

- [ ] **Step 4: Commit**

  ```bash
  cd volturaos && git add lib/actions/search.ts app/\(app\)/search/page.tsx app/\(app\)/layout.tsx
  git commit -m "feat: add global search page and search icon in layout"
  ```

---

## Task 4: Verify build + push to Vercel

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
