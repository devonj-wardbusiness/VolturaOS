# Unified Customer + Job Profile — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Jobs list with a Today schedule view and unify the job/customer detail into a single left-sidebar profile screen with Job, History, Estimates, Invoice, and Forms (placeholder) tabs.

**Architecture:** A fixed `ProfileSidebar` (60px) + scrollable content area replaces the current `JobDetail` page. New server action helpers fetch the extended data the new tabs need. The existing `JobDetail` component is preserved intact and re-used inside `JobTab` — nothing in the current job detail is deleted.

**Tech Stack:** Next.js 15 App Router · TypeScript · Tailwind CSS v4 · Supabase via `createAdminClient()` · React `useState` for tab state

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `types/index.ts` | Add `JobWithContext` type |
| Modify | `lib/actions/jobs.ts` | Add `getJobWithContext`, `listCustomerJobs`, `listTodayJobs` |
| Modify | `lib/actions/invoices.ts` | Add `listCustomerInvoices` |
| Modify | `lib/actions/estimates.ts` | Add `listCustomerEstimates` |
| Create | `components/jobs/TodayJobCard.tsx` | Single card: time + customer + status |
| Create | `components/jobs/TodayView.tsx` | Today schedule list (client) |
| Modify | `app/(app)/jobs/page.tsx` | Swap JobBoard → TodayView |
| Modify | `components/nav/BottomNav.tsx` | Rename "Jobs" → "Today" |
| Create | `components/profile/ProfileHeader.tsx` | Fixed header with back, name, status, subtitle |
| Create | `components/profile/ProfileSidebar.tsx` | Left sidebar with 5 tab buttons |
| Create | `components/profile/tabs/JobTab.tsx` | Wraps existing `JobDetail` |
| Create | `components/profile/tabs/HistoryTab.tsx` | Contact card + activity timeline |
| Create | `components/profile/tabs/EstimatesTab.tsx` | Estimate cards matching Devon's mockup |
| Create | `components/profile/tabs/InvoiceTab.tsx` | Invoice list for customer |
| Create | `components/profile/tabs/FormsTab.tsx` | Locked placeholder |
| Create | `components/profile/UnifiedProfile.tsx` | Client wrapper — tab state + layout |
| Modify | `app/(app)/jobs/[id]/page.tsx` | Fetch context data + render UnifiedProfile |

---

## Task 1: Add `JobWithContext` type

**Files:**
- Modify: `types/index.ts` (add after the `ChangeOrder` interface)

- [ ] **Step 1: Add the type**

Open `types/index.ts`. After the `ChangeOrder` interface (around line 175), add:

```ts
export type JobWithContext = {
  job: Job & { customer: Pick<Customer, 'id' | 'name' | 'phone' | 'email' | 'address'> }
  checklist: JobChecklist
  photos: import('@/lib/actions/job-photos').JobPhotoRecord[]
  signedEstimateId: string | null
  changeOrders: ChangeOrder[]
  estimates: Array<Pick<Estimate, 'id' | 'name' | 'total' | 'status' | 'line_items' | 'addons' | 'created_at'>>
  invoices: Invoice[]
  jobHistory: Job[]
}
```

- [ ] **Step 2: Verify build**

```bash
cd C:\Users\Devon\VolturaOS\volturaos
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: add JobWithContext type"
```

---

## Task 2: Add server action helpers

**Files:**
- Modify: `lib/actions/jobs.ts` (add 3 functions before `deleteJob`)
- Modify: `lib/actions/invoices.ts` (add 1 function)
- Modify: `lib/actions/estimates.ts` (add 1 function)

These provide the data the new tabs need beyond what the current page fetches.

- [ ] **Step 1: Add `getJobWithContext` to `lib/actions/jobs.ts`**

Add before `deleteJob`:

```ts
/**
 * Fetches a job with its customer (including email).
 * Used by the Unified Profile page. The caller then fetches
 * checklist/photos/estimates/invoices in a second parallel batch.
 */
export async function getJobWithContext(id: string): Promise<Job & {
  customer: Pick<import('@/types').Customer, 'id' | 'name' | 'phone' | 'email' | 'address'>
}> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('jobs')
    .select('*, customers(id, name, phone, email, address)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  const { customers, ...job } = data as Record<string, unknown>
  return { ...job, customer: customers } as Job & {
    customer: Pick<import('@/types').Customer, 'id' | 'name' | 'phone' | 'email' | 'address'>
  }
}
```

- [ ] **Step 2: Add `listTodayJobs` to `lib/actions/jobs.ts`**

Add after `getJobWithContext`:

```ts
/**
 * Returns all Scheduled + In Progress jobs, ordered by scheduled_time
 * (nulls last) then created_at. Used by the Today view.
 */
export async function listTodayJobs(): Promise<(Job & {
  customer: { id: string; name: string; address: string | null }
})[]> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('jobs')
    .select('*, customers(id, name, address)')
    .in('status', ['Scheduled', 'In Progress'])
    .order('scheduled_time', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
    .limit(50)
  if (error) throw new Error(error.message)
  return (data as Record<string, unknown>[]).map(({ customers, ...j }) => ({
    ...j,
    customer: customers,
  })) as (Job & { customer: { id: string; name: string; address: string | null } })[]
}
```

- [ ] **Step 3: Add `listCustomerJobs` to `lib/actions/jobs.ts`**

Add after `listTodayJobs`:

```ts
/**
 * Returns all jobs for a customer, excluding the current job.
 * Used by the History tab.
 */
export async function listCustomerJobs(customerId: string, excludeJobId: string): Promise<Job[]> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('jobs')
    .select('*')
    .eq('customer_id', customerId)
    .neq('id', excludeJobId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw new Error(error.message)
  return (data ?? []) as Job[]
}
```

- [ ] **Step 4: Add `listCustomerInvoices` to `lib/actions/invoices.ts`**

Open `lib/actions/invoices.ts`. Add after `listInvoices`:

```ts
/**
 * Returns all invoices for a customer. Used by the Unified Profile Invoice tab.
 */
export async function listCustomerInvoices(customerId: string): Promise<import('@/types').Invoice[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('invoices')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw new Error(error.message)
  return (data ?? []) as import('@/types').Invoice[]
}
```

- [ ] **Step 5: Add `listCustomerEstimates` to `lib/actions/estimates.ts`**

Open `lib/actions/estimates.ts`. Add after `getEstimatesByCustomer`:

```ts
/**
 * Returns estimates for a customer with created_at included.
 * Used by the Unified Profile Estimates tab (needs created_at for the History timeline).
 */
export async function listCustomerEstimates(customerId: string): Promise<Array<
  Pick<import('@/types').Estimate, 'id' | 'name' | 'total' | 'status' | 'line_items' | 'addons' | 'created_at'>
>> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('estimates')
    .select('id, name, total, status, line_items, addons, created_at')
    .eq('customer_id', customerId)
    .eq('is_template', false)
    .not('status', 'eq', 'Declined')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw new Error(error.message)
  return (data ?? []) as Array<
    Pick<import('@/types').Estimate, 'id' | 'name' | 'total' | 'status' | 'line_items' | 'addons' | 'created_at'>
  >
}
```

- [ ] **Step 6: Verify build**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add lib/actions/jobs.ts lib/actions/invoices.ts lib/actions/estimates.ts
git commit -m "feat: add getJobWithContext, listTodayJobs, listCustomerJobs, listCustomerInvoices, listCustomerEstimates"
```

---

## Task 3: Build TodayJobCard + TodayView

**Files:**
- Create: `components/jobs/TodayJobCard.tsx`
- Create: `components/jobs/TodayView.tsx`

- [ ] **Step 1: Create `TodayJobCard.tsx`**

```tsx
// components/jobs/TodayJobCard.tsx
'use client'

import Link from 'next/link'
import { StatusPill } from '@/components/ui/StatusPill'
import type { Job } from '@/types'

interface TodayJobCardProps {
  job: Job & { customer: { id: string; name: string; address: string | null } }
}

export function TodayJobCard({ job }: TodayJobCardProps) {
  // Format "8:30" → "8:30 AM" or "13:30" → "1:30 PM"
  function formatTime(t: string | null): { hour: string; period: string } | null {
    if (!t) return null
    const [h, m] = t.split(':').map(Number)
    if (isNaN(h)) return null
    const period = h >= 12 ? 'PM' : 'AM'
    const hour12 = h % 12 || 12
    return { hour: `${hour12}:${String(m).padStart(2, '0')}`, period }
  }

  const time = formatTime(job.scheduled_time)

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="flex items-center gap-3 bg-[#161b29] border border-white/5 rounded-xl px-4 py-3 active:scale-[0.98] transition-transform"
    >
      {/* Time column */}
      <div className="w-12 flex-shrink-0 text-center">
        {time ? (
          <>
            <p className="text-volturaGold font-bold text-sm leading-tight">{time.hour}</p>
            <p className="text-volturaGold text-[10px] font-semibold">{time.period}</p>
          </>
        ) : (
          <p className="text-gray-600 text-sm">—</p>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-white/5 flex-shrink-0" />

      {/* Job info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">{job.customer.name}</p>
        <p className="text-gray-400 text-xs truncate">{job.job_type}</p>
        {job.customer.address && (
          <p className="text-gray-600 text-[11px] truncate mt-0.5">📍 {job.customer.address}</p>
        )}
      </div>

      {/* Status */}
      <div className="flex-shrink-0">
        <StatusPill status={job.status} />
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Create `TodayView.tsx`**

```tsx
// components/jobs/TodayView.tsx
'use client'

import Link from 'next/link'
import { TodayJobCard } from './TodayJobCard'
import type { Job } from '@/types'

interface TodayViewProps {
  jobs: (Job & { customer: { id: string; name: string; address: string | null } })[]
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function TodayView({ jobs }: TodayViewProps) {
  return (
    <div className="px-4 pb-6">
      {/* Date header */}
      <div className="mb-4">
        <p className="text-gray-500 text-[11px] uppercase tracking-widest">{todayLabel()}</p>
        <h1 className="text-white font-bold text-2xl">Today</h1>
        <p className="text-gray-500 text-sm">
          {jobs.length === 0 ? 'No jobs on deck' : `${jobs.length} job${jobs.length === 1 ? '' : 's'} scheduled`}
        </p>
      </div>

      {/* Job list */}
      {jobs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-600 text-4xl mb-3">🗓️</p>
          <p className="text-gray-400 text-sm mb-4">No jobs scheduled today</p>
          <Link
            href="/jobs/new"
            className="inline-block bg-volturaGold text-volturaBlue font-bold text-sm px-6 py-2 rounded-full"
          >
            + New Job
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map(job => (
            <TodayJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add components/jobs/TodayJobCard.tsx components/jobs/TodayView.tsx
git commit -m "feat: add TodayJobCard and TodayView components"
```

---

## Task 4: Update Jobs page + BottomNav

**Files:**
- Modify: `app/(app)/jobs/page.tsx`
- Modify: `components/nav/BottomNav.tsx`

- [ ] **Step 1: Replace `app/(app)/jobs/page.tsx`**

```tsx
// app/(app)/jobs/page.tsx
export const dynamic = 'force-dynamic'

import { listTodayJobs } from '@/lib/actions/jobs'
import { TodayView } from '@/components/jobs/TodayView'
import { PageHeader } from '@/components/ui/PageHeader'
import Link from 'next/link'

export default async function JobsPage() {
  const jobs = await listTodayJobs()
  return (
    <>
      <PageHeader
        title="Today"
        action={
          <Link href="/jobs/new" className="text-volturaGold text-sm font-bold">
            + New
          </Link>
        }
      />
      <div className="pt-14">
        <TodayView jobs={jobs} />
      </div>
    </>
  )
}
```

- [ ] **Step 2: Rename "Jobs" → "Today" in `BottomNav.tsx`**

In `components/nav/BottomNav.tsx`, find the tabs array and change:

```ts
// BEFORE:
{ href: '/jobs', label: 'Jobs', Icon: Wrench },

// AFTER:
{ href: '/jobs', label: 'Today', Icon: Wrench },
```

- [ ] **Step 3: Visual check**

Start dev server (`npm run dev`), open `http://localhost:3000/jobs`. Should see today's job cards with time column, and the bottom nav should say "Today".

- [ ] **Step 4: Commit**

```bash
git add app/(app)/jobs/page.tsx components/nav/BottomNav.tsx
git commit -m "feat: replace jobs list with Today view, rename nav to Today"
```

---

## Task 5: Build ProfileHeader + ProfileSidebar

**Files:**
- Create: `components/profile/ProfileHeader.tsx`
- Create: `components/profile/ProfileSidebar.tsx`

- [ ] **Step 1: Create the `components/profile/` directory**

```bash
mkdir -p "C:\Users\Devon\VolturaOS\volturaos\components\profile\tabs"
```

- [ ] **Step 2: Create `ProfileHeader.tsx`**

```tsx
// components/profile/ProfileHeader.tsx
'use client'

import { useRouter } from 'next/navigation'
import { StatusPill } from '@/components/ui/StatusPill'
import type { Job, JobStatus } from '@/types'

interface ProfileHeaderProps {
  customerName: string
  customerPhone: string | null
  jobType: string
  status: JobStatus
}

export function ProfileHeader({ customerName, customerPhone, jobType, status }: ProfileHeaderProps) {
  const router = useRouter()
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0D0F1A]/95 backdrop-blur-sm border-b border-white/5 px-4 h-14 flex items-center gap-3">
      <button onClick={() => router.back()} className="text-volturaGold text-xl p-1 -ml-1 flex-shrink-0">
        ←
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-base truncate leading-tight">{customerName}</p>
        <p className="text-gray-500 text-xs truncate">
          {customerPhone && <span className="mr-2">{customerPhone}</span>}
          <span>{jobType}</span>
        </p>
      </div>
      <StatusPill status={status} />
    </header>
  )
}
```

- [ ] **Step 3: Create `ProfileSidebar.tsx`**

```tsx
// components/profile/ProfileSidebar.tsx
'use client'

type TabId = 'job' | 'history' | 'estimates' | 'invoice' | 'forms'

interface Tab {
  id: TabId
  icon: string
  label: string
  disabled?: boolean
}

const TABS: Tab[] = [
  { id: 'job',       icon: '🔧', label: 'Job' },
  { id: 'history',   icon: '📍', label: 'History' },
  { id: 'estimates', icon: '📄', label: 'Estimates' },
  { id: 'invoice',   icon: '💲', label: 'Invoice' },
  { id: 'forms',     icon: '📋', label: 'Forms', disabled: true },
]

interface ProfileSidebarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export function ProfileSidebar({ activeTab, onTabChange }: ProfileSidebarProps) {
  return (
    <aside className="fixed top-14 bottom-16 left-0 w-[60px] bg-[#0c0f1a] border-r border-white/5 z-40 flex flex-col items-center py-2 gap-1">
      {TABS.map(tab => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            title={tab.disabled ? 'Coming soon' : tab.label}
            className="w-full flex flex-col items-center gap-0.5 py-3 text-center transition-colors"
            style={{
              background: isActive ? '#1A1F6E' : 'transparent',
              borderLeft: isActive ? '3px solid #C9A227' : '3px solid transparent',
              opacity: tab.disabled ? 0.35 : 1,
              cursor: tab.disabled ? 'not-allowed' : 'pointer',
            }}
          >
            <span className="text-base">{tab.icon}</span>
            <span
              className="text-[9px] font-semibold uppercase tracking-wider leading-none"
              style={{ color: isActive ? '#C9A227' : '#3a4060' }}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </aside>
  )
}

export type { TabId }
```

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add components/profile/ProfileHeader.tsx components/profile/ProfileSidebar.tsx
git commit -m "feat: add ProfileHeader and ProfileSidebar components"
```

---

## Task 6: Build JobTab

**Files:**
- Create: `components/profile/tabs/JobTab.tsx`

`JobTab` wraps the existing `JobDetail` component unchanged. It passes the same props `JobDetail` already expects — nothing in `JobDetail` is modified.

- [ ] **Step 1: Create `JobTab.tsx`**

```tsx
// components/profile/tabs/JobTab.tsx
import type { Job, JobChecklist, ChangeOrder, Estimate } from '@/types'
import { JobDetail } from '@/components/jobs/JobDetail'
import type { JobPhotoRecord } from '@/lib/actions/job-photos'

interface JobTabProps {
  job: Job & { customer: { id: string; name: string; phone: string | null; address: string | null; zip: string | null } }
  checklist: JobChecklist
  photos: JobPhotoRecord[]
  signedEstimateId: string | null
  changeOrders: ChangeOrder[]
  customerEstimates: Array<Pick<Estimate, 'id' | 'name' | 'total' | 'status'>>
}

export function JobTab(props: JobTabProps) {
  return <JobDetail {...props} />
}
```

> **Note:** `JobDetail` requires `customer` to have `zip`. The `getJobWithContext` action returns `customers(id, name, phone, email, address)` — no `zip`. In the page (Task 9) you will pass `{ ...job.customer, zip: null }` to satisfy the type. `JobDetail` passes `zip` to `NeighborhoodBlitz`, but that component already handles `zip={null}` with an early `if (!zip) return null` — no display, no error.

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/profile/tabs/JobTab.tsx
git commit -m "feat: add JobTab (wraps existing JobDetail)"
```

---

## Task 7: Build HistoryTab, InvoiceTab, FormsTab

**Files:**
- Create: `components/profile/tabs/HistoryTab.tsx`
- Create: `components/profile/tabs/InvoiceTab.tsx`
- Create: `components/profile/tabs/FormsTab.tsx`

- [ ] **Step 1: Create `HistoryTab.tsx`**

```tsx
// components/profile/tabs/HistoryTab.tsx
'use client'

import Link from 'next/link'
import { CustomerHistory } from '@/components/customers/CustomerHistory'
import type { Job, Invoice, HistoryItem } from '@/types'

type EstimateSlice = {
  id: string
  name: string
  total: number | null
  status: string
  created_at: string
}

interface HistoryTabProps {
  customer: { id: string; name: string; phone: string | null; email: string | null; address: string | null }
  jobHistory: Job[]
  estimates: EstimateSlice[]
  invoices: Invoice[]
}

export function HistoryTab({ customer, jobHistory, estimates, invoices }: HistoryTabProps) {
  const items: HistoryItem[] = [
    ...jobHistory.map(j => ({
      type: 'job' as const,
      id: j.id,
      title: j.job_type,
      status: j.status,
      date: j.created_at,
      href: `/jobs/${j.id}`,
    })),
    ...estimates.map(e => ({
      type: 'estimate' as const,
      id: e.id,
      title: e.name,
      status: e.status,
      amount: e.total ?? undefined,
      date: e.created_at,
      href: `/estimates/${e.id}`,
    })),
    ...invoices.map(inv => ({
      type: 'invoice' as const,
      id: inv.id,
      title: `Invoice #${inv.id.slice(-6).toUpperCase()}`,
      status: inv.status,
      amount: inv.balance,
      date: inv.created_at,
      href: `/invoices/${inv.id}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="px-4 pt-4 pb-6">
      {/* Customer contact card */}
      <div className="bg-white/5 rounded-xl p-4 mb-2">
        <p className="text-white font-semibold text-base">{customer.name}</p>
        {customer.phone && (
          <a href={`tel:${customer.phone}`} className="text-volturaGold text-sm block mt-0.5">
            {customer.phone}
          </a>
        )}
        {customer.email && <p className="text-gray-400 text-sm mt-0.5">{customer.email}</p>}
        {customer.address && <p className="text-gray-400 text-sm mt-0.5">{customer.address}</p>}

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="flex-1 text-center text-xs font-bold py-2 bg-green-900/30 text-green-400 rounded-lg"
            >
              📞 Call
            </a>
          )}
          <Link
            href={`/invoices/new?customerId=${customer.id}`}
            className="flex-1 text-center text-xs font-bold py-2 bg-white/5 text-gray-400 rounded-lg"
          >
            + Invoice
          </Link>
          <Link
            href={`/customers/${customer.id}`}
            className="flex-1 text-center text-xs font-bold py-2 bg-white/5 text-gray-400 rounded-lg"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Timeline */}
      <CustomerHistory items={items} />
      {items.length === 0 && (
        <p className="text-gray-600 text-sm text-center py-8">No history yet</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `InvoiceTab.tsx`**

```tsx
// components/profile/tabs/InvoiceTab.tsx
'use client'

import Link from 'next/link'
import { StatusPill } from '@/components/ui/StatusPill'
import type { Invoice } from '@/types'

interface InvoiceTabProps {
  invoices: Invoice[]
  customerId: string
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function InvoiceTab({ invoices, customerId }: InvoiceTabProps) {
  return (
    <div className="px-4 pt-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold text-base">Invoices</h2>
        <Link
          href={`/invoices/new?customerId=${customerId}`}
          className="text-volturaGold text-xs font-bold border border-volturaGold/40 px-3 py-1 rounded-lg"
        >
          + New
        </Link>
      </div>

      {invoices.length === 0 && (
        <p className="text-gray-600 text-sm text-center py-8">No invoices yet</p>
      )}

      <div className="space-y-3">
        {invoices.map(inv => (
          <Link
            key={inv.id}
            href={`/invoices/${inv.id}`}
            className="block bg-[#161b29] border border-white/5 rounded-xl p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-white font-semibold text-sm">
                  #{inv.id.slice(-6).toUpperCase()}
                </p>
                {inv.due_date && (
                  <p className="text-gray-500 text-xs">Due {formatDate(inv.due_date)}</p>
                )}
              </div>
              <StatusPill status={inv.status} />
            </div>

            <div className="flex justify-between text-sm mt-2">
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-wider">Total</p>
                <p className="text-white font-bold">{fmt(inv.total)}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-[10px] uppercase tracking-wider">Balance</p>
                <p
                  className="font-bold"
                  style={{ color: inv.balance > 0 ? '#ef4444' : '#3fd47a' }}
                >
                  {fmt(inv.balance)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `FormsTab.tsx`**

```tsx
// components/profile/tabs/FormsTab.tsx
export function FormsTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center">
      <span className="text-5xl mb-4">🔒</span>
      <h3 className="text-white font-semibold text-lg mb-2">Forms coming soon</h3>
      <p className="text-gray-500 text-sm leading-relaxed">
        Digital field forms, waivers, and material lists will live here.
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add components/profile/tabs/HistoryTab.tsx components/profile/tabs/InvoiceTab.tsx components/profile/tabs/FormsTab.tsx
git commit -m "feat: add HistoryTab, InvoiceTab, FormsTab components"
```

---

## Task 8: Build EstimatesTab

**Files:**
- Create: `components/profile/tabs/EstimatesTab.tsx`

This matches Devon's `EstimatesList.jsx` mockup exactly.

- [ ] **Step 1: Create `EstimatesTab.tsx`**

```tsx
// components/profile/tabs/EstimatesTab.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { EstimateStatus, LineItem, Addon } from '@/types'

type EstimateSlice = {
  id: string
  name: string
  total: number | null
  status: EstimateStatus
  line_items: LineItem[] | null
  addons: Addon[] | null
  created_at: string
}

interface EstimatesTabProps {
  estimates: EstimateSlice[]
  customerId: string
}

const STATUS_COLORS: Record<EstimateStatus, { bg: string; text: string }> = {
  Draft:    { bg: '#1e2538', text: '#8a93b0' },
  Sent:     { bg: '#162a3d', text: '#3ab8ff' },
  Viewed:   { bg: '#162a3d', text: '#3ab8ff' },
  Approved: { bg: '#12281a', text: '#3fd47a' },
  Declined: { bg: '#2d1a1a', text: '#ef4444' },
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export function EstimatesTab({ estimates, customerId }: EstimatesTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const totalPrice = estimates.reduce((sum, e) => sum + (e.total ?? 0), 0)
  const totalSavings = totalPrice * 0.1

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100dvh - 56px - 64px)' }}>
      {/* Action buttons */}
      <div className="px-4 pt-4 pb-3 flex gap-2">
        <button className="flex-1 bg-volturaGold text-volturaBlue font-black text-[11px] py-2.5 rounded-full uppercase tracking-wide">
          💳 Financing
        </button>
        <Link
          href={`/estimates/new?customerId=${customerId}`}
          className="flex-1 text-center border border-white/10 text-gray-400 text-[11px] py-2.5 rounded-full uppercase tracking-wide font-bold"
        >
          + Add
        </Link>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-4">
        {estimates.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-8">No estimates yet</p>
        )}

        {estimates.map(est => {
          const sc = STATUS_COLORS[est.status] ?? STATUS_COLORS.Draft
          const itemCount = (est.line_items ?? []).length
          const isExpanded = expandedId === est.id

          return (
            <div
              key={est.id}
              onClick={() => setExpandedId(isExpanded ? null : est.id)}
              className="rounded-xl p-4 cursor-pointer"
              style={{
                background: '#161b29',
                border: `1.5px solid ${isExpanded ? '#C9A227' : '#1e2538'}`,
                boxShadow: isExpanded ? '0 0 0 3px rgba(201,162,39,0.12)' : 'none',
              }}
            >
              {/* Title + status + menu */}
              <div className="flex items-start justify-between mb-2 gap-2">
                <span className="text-white font-semibold text-sm flex-1 leading-snug">
                  {est.name}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className="text-[9px] font-bold uppercase rounded px-1.5 py-0.5 tracking-wide"
                    style={{ background: sc.bg, color: sc.text }}
                  >
                    {est.status}
                  </span>
                  <span className="text-gray-600 text-base">⋮</span>
                </div>
              </div>

              {/* Items badge */}
              <span className="text-[10px] font-semibold rounded px-2 py-0.5 bg-white/5 text-gray-500">
                {itemCount} Items
              </span>

              {/* Divider */}
              <div className="h-px bg-white/5 my-3" />

              {/* Price row */}
              <div className="flex">
                <div className="flex-1">
                  <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mb-1">
                    Regular Price
                  </p>
                  <p className="text-white font-bold text-base">{fmt(est.total ?? 0)}</p>
                </div>
                <div className="w-px bg-white/5 mx-3 self-stretch" />
                <div className="flex-1">
                  <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mb-1">
                    Potential Savings
                  </p>
                  <p className="font-bold text-base" style={{ color: '#C9A227' }}>
                    {fmt((est.total ?? 0) * 0.1)}
                  </p>
                </div>
              </div>

              {/* Expanded inline actions */}
              {isExpanded && (
                <div
                  className="mt-3 flex gap-2"
                  onClick={e => e.stopPropagation()}
                >
                  {(['Edit', 'Present', 'Send', 'Convert'] as const).map(action => (
                    <Link
                      key={action}
                      href={
                        action === 'Edit'
                          ? `/estimates/${est.id}`
                          : action === 'Present'
                          ? `/estimates/${est.id}?present=true`
                          : action === 'Send'
                          ? `/estimates/${est.id}?send=true`
                          : `/invoices/new?estimateId=${est.id}`
                      }
                      className="flex-1 text-center text-[10px] font-bold py-2 rounded-lg"
                      style={{
                        background: action === 'Convert' ? '#C9A227' : '#1e2538',
                        color: action === 'Convert' ? '#0f1117' : '#8a93b0',
                      }}
                    >
                      {action}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer totals bar */}
      {estimates.length > 0 && (
        <div
          className="px-4 py-3 flex items-center justify-between flex-shrink-0"
          style={{ background: '#0c0f1a', borderTop: '1px solid #1a1f2e' }}
        >
          <div>
            <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mb-0.5">
              Total ({estimates.length} Estimate{estimates.length !== 1 ? 's' : ''})
            </p>
            <p className="font-black text-lg" style={{ color: '#C9A227' }}>
              {fmt(totalPrice)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mb-0.5">
              Total Savings
            </p>
            <p className="font-bold text-base text-green-400">{fmt(totalSavings)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/profile/tabs/EstimatesTab.tsx
git commit -m "feat: add EstimatesTab matching Devon's mockup"
```

---

## Task 9: Build UnifiedProfile + wire jobs/[id] page

**Files:**
- Create: `components/profile/UnifiedProfile.tsx`
- Modify: `app/(app)/jobs/[id]/page.tsx`

- [ ] **Step 1: Create `UnifiedProfile.tsx`**

```tsx
// components/profile/UnifiedProfile.tsx
'use client'

import { useState } from 'react'
import { ProfileHeader } from './ProfileHeader'
import { ProfileSidebar, type TabId } from './ProfileSidebar'
import { JobTab } from './tabs/JobTab'
import { HistoryTab } from './tabs/HistoryTab'
import { EstimatesTab } from './tabs/EstimatesTab'
import { InvoiceTab } from './tabs/InvoiceTab'
import { FormsTab } from './tabs/FormsTab'
import type { Job, JobChecklist, ChangeOrder, Estimate, Invoice } from '@/types'
import type { JobPhotoRecord } from '@/lib/actions/job-photos'

type EstimateSlice = {
  id: string
  name: string
  total: number | null
  status: import('@/types').EstimateStatus
  line_items: import('@/types').LineItem[] | null
  addons: import('@/types').Addon[] | null
  created_at: string
}

interface UnifiedProfileProps {
  job: Job & {
    customer: { id: string; name: string; phone: string | null; email: string | null; address: string | null }
  }
  checklist: JobChecklist
  photos: JobPhotoRecord[]
  signedEstimateId: string | null
  changeOrders: ChangeOrder[]
  estimates: EstimateSlice[]
  invoices: Invoice[]
  jobHistory: Job[]
}

export function UnifiedProfile({
  job,
  checklist,
  photos,
  signedEstimateId,
  changeOrders,
  estimates,
  invoices,
  jobHistory,
}: UnifiedProfileProps) {
  const [activeTab, setActiveTab] = useState<TabId>('job')

  // JobDetail requires zip on customer; getJobWithContext doesn't fetch it.
  // Pass null — JobDetail displays address (which we have) but not zip directly.
  const jobWithZip = {
    ...job,
    customer: { ...job.customer, zip: null },
  }

  return (
    <>
      <ProfileHeader
        customerName={job.customer.name}
        customerPhone={job.customer.phone}
        jobType={job.job_type}
        status={job.status}
      />

      {/* Fixed sidebar */}
      <ProfileSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Scrollable content — offset for fixed header + sidebar */}
      <div className="ml-[60px] pt-14 pb-16 min-h-dvh">
        {activeTab === 'job' && (
          <JobTab
            job={jobWithZip}
            checklist={checklist}
            photos={photos}
            signedEstimateId={signedEstimateId}
            changeOrders={changeOrders}
            customerEstimates={estimates}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab
            customer={job.customer}
            jobHistory={jobHistory}
            estimates={estimates}
            invoices={invoices}
          />
        )}
        {activeTab === 'estimates' && (
          <EstimatesTab
            estimates={estimates}
            customerId={job.customer.id}
          />
        )}
        {activeTab === 'invoice' && (
          <InvoiceTab invoices={invoices} customerId={job.customer.id} />
        )}
        {activeTab === 'forms' && <FormsTab />}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Update `app/(app)/jobs/[id]/page.tsx`**

```tsx
// app/(app)/jobs/[id]/page.tsx
export const dynamic = 'force-dynamic'

import { getJobWithContext, listCustomerJobs } from '@/lib/actions/jobs'
import { getOrCreateChecklist } from '@/lib/actions/checklists'
import { getJobPhotos } from '@/lib/actions/job-photos'
import { getSignedEstimateForJob } from '@/lib/actions/estimates'
import { listCustomerEstimates } from '@/lib/actions/estimates'
import { listChangeOrdersForJob } from '@/lib/actions/change-orders'
import { listCustomerInvoices } from '@/lib/actions/invoices'
import { UnifiedProfile } from '@/components/profile/UnifiedProfile'
import { notFound } from 'next/navigation'

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let job
  try {
    job = await getJobWithContext(id)
  } catch {
    notFound()
  }

  const [checklist, photos, signedEstimate, changeOrders, estimates, invoices, jobHistory] =
    await Promise.all([
      getOrCreateChecklist(job.id, job.job_type),
      getJobPhotos(job.id),
      getSignedEstimateForJob(job.id),
      listChangeOrdersForJob(job.id),
      listCustomerEstimates(job.customer_id),
      listCustomerInvoices(job.customer_id),
      listCustomerJobs(job.customer_id, job.id),
    ])

  return (
    <UnifiedProfile
      job={job}
      checklist={checklist}
      photos={photos}
      signedEstimateId={signedEstimate?.id ?? null}
      changeOrders={changeOrders}
      estimates={estimates}
      invoices={invoices}
      jobHistory={jobHistory}
    />
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Fix any type errors before proceeding. Common issue: `customerEstimates` prop on `JobDetail` expects `Pick<Estimate, 'id' | 'name' | 'total' | 'status'>[]` — our `EstimateSlice` has extra fields which is fine (structural typing), but double-check if TypeScript complains.

- [ ] **Step 4: Run dev server and do a full visual check**

```bash
npm run dev
```

Open `http://localhost:3000/jobs`:
- [ ] Today view shows job cards with time column
- [ ] Bottom nav says "Today" with wrench icon

Open any job card:
- [ ] Unified Profile loads with header showing customer name + phone + job type + status
- [ ] Left sidebar shows 5 tabs (Forms grayed out)
- [ ] **Job tab** — existing job detail (checklist, photos, change orders, notes all present)
- [ ] **History tab** — customer contact card + timeline
- [ ] **Estimates tab** — estimate cards with financing button, expand/collapse, footer totals
- [ ] **Invoice tab** — invoice list
- [ ] **Forms tab** — locked placeholder

- [ ] **Step 5: Commit**

```bash
git add components/profile/UnifiedProfile.tsx app/(app)/jobs/[id]/page.tsx
git commit -m "feat: wire up UnifiedProfile on jobs/[id] page"
```

---

## Task 10: Final verification + push

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: successful build. Fix any errors (usually import paths or missing `'use client'` directives).

- [ ] **Step 3: Spot-check on mobile viewport**

In browser DevTools, set viewport to 375×812 (iPhone). Verify:
- Fixed header doesn't overlap sidebar
- Sidebar doesn't cover content
- Content scrolls without sidebar scrolling
- Bottom nav stays at bottom

- [ ] **Step 4: Verify CustomerHistory job links (spec Part 3)**

Open `components/customers/CustomerHistory.tsx` and confirm job history items already render as `<Link href={item.href}>`. The `getCustomerHistory` action in `lib/actions/customers.ts` already sets `href: /jobs/${j.id}` on job items — so job rows in the customer timeline already link to `/jobs/[id]` (the new Unified Profile). No code change needed. If for any reason they don't, add `href={item.href}` to the Link wrapper and commit separately.

- [ ] **Step 5: Push**

```bash
git push
```

---

## Common Gotchas

**`'use client'` rule:** `UnifiedProfile`, `ProfileHeader`, `ProfileSidebar`, all tab files that use `useState`/`useRouter`/`Link` need `'use client'`. Server components cannot use those. `JobTab` re-exports `JobDetail` which is already `'use client'` — `JobTab` itself doesn't need the directive since it doesn't use hooks directly, but add it if you see errors.

**`PageHeader` is gone from `jobs/[id]`:** The old page used `<PageHeader title={...} backHref="/jobs" />`. The new page does NOT render `PageHeader` — `ProfileHeader` replaces it. Do not add `PageHeader` back.

**Import paths:** `listCustomerEstimates` and `getSignedEstimateForJob` both live in `lib/actions/estimates.ts`. The import at the top of the page imports both from the same file.

**`zip: null` shim:** `JobDetail` expects `customer.zip: string | null`. `getJobWithContext` selects `customers(id, name, phone, email, address)` — no `zip`. The `UnifiedProfile` adds `zip: null` inline. `JobDetail` shows `customer.address` (which we have) but not `zip` in the UI, so `null` is safe.

**Tailwind v4:** Uses `@import "tailwindcss"` not `@tailwind` directives. Do not add new `@tailwind` lines. Style with class names (e.g., `text-volturaGold`) or inline `style={{}}` for one-off values that don't map to a utility class.
