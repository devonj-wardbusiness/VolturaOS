# UI Professional Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full visual polish pass — near-black color system, Lucide SVG icons, sticky PageHeader, standardized status pills, and card border/radius upgrades across all pages.

**Architecture:** Pure CSS/component changes, no data model changes. Color tokens live in `globals.css` `@theme inline` block (Tailwind CSS v4 — no `tailwind.config.ts`). New shared components: `PageHeader` and `statusColor` helper. All existing `bg-volturaBlue`/`bg-volturaNavy`/`text-volturaGold` classes pick up new colors automatically once tokens are updated.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4, `lucide-react` (to be installed)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `volturaos/app/globals.css` | Modify | Update color tokens + html background |
| `volturaos/package.json` | Modify | Add lucide-react dependency |
| `volturaos/lib/statusColor.ts` | Create | Shared status → Tailwind color helper |
| `volturaos/components/ui/PageHeader.tsx` | Create | Fixed sticky header component |
| `volturaos/components/ui/StatusPill.tsx` | Modify | Use statusColor helper, new pill styles |
| `volturaos/components/nav/BottomNav.tsx` | Modify | Lucide icons, gold pill active indicator |
| `volturaos/app/(app)/page.tsx` | Modify | PageHeader + pt-14 + card/button updates |
| `volturaos/components/dashboard/KPICards.tsx` | Modify | border-white/5 + rounded-2xl |
| `volturaos/app/(app)/customers/page.tsx` | Modify | PageHeader + pt-14 |
| `volturaos/components/customers/CustomerCard.tsx` | Modify | Card border + rounded-2xl + active:scale |
| `volturaos/app/(app)/jobs/page.tsx` | Modify | PageHeader + pt-14 |
| `volturaos/components/jobs/JobCard.tsx` | Modify | Card border + rounded-2xl + active:scale |
| `volturaos/app/(app)/estimates/page.tsx` | Modify | PageHeader + pt-14 + estimate card updates |
| `volturaos/app/(app)/invoices/page.tsx` | Modify | PageHeader + pt-14 |
| `volturaos/components/invoices/InvoiceList.tsx` | Modify | Card border + rounded-2xl + active:scale |
| `volturaos/app/(app)/customers/[id]/page.tsx` | Modify | PageHeader (back + delete action) + pt-14 |
| `volturaos/app/(app)/jobs/[id]/page.tsx` | Modify | PageHeader (back) + pt-14 |
| `volturaos/app/(app)/invoices/[id]/page.tsx` | Modify | PageHeader (back) + pt-14 |
| `volturaos/app/(app)/estimates/[id]/page.tsx` | Modify | PageHeader (back + New action) + pt-14 |

---

## Task 1: Install lucide-react + Update Color Tokens

**Files:**
- Modify: `volturaos/app/globals.css`

- [ ] **Step 1: Install lucide-react**

```bash
cd C:\Users\Devon\VolturaOS\volturaos && npm install lucide-react
```

Expected: installs without errors, `lucide-react` appears in `package.json` dependencies.

- [ ] **Step 2: Update globals.css color tokens**

In `volturaos/app/globals.css`, replace the entire `@theme inline` block and the `html` background:

```css
@import "tailwindcss";

@theme inline {
  --color-volturaBlue: #0D0F1A;
  --color-volturaNavy: #161B2E;
  --color-volturaGold: #D4AF37;
  --color-background: #0D0F1A;
  --color-foreground: #f1f5f9;
  --color-surface: #161B2E;
  --font-sans: 'Inter', sans-serif;
}

html {
  background-color: #0D0F1A;
  color: #f1f5f9;
}

body {
  min-height: 100dvh;
  font-family: 'Inter', sans-serif;
  -webkit-tap-highlight-color: transparent;
}

/* Large touch targets for mobile price inputs */
.price-input {
  min-height: 44px;
  font-size: 1.25rem;
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd C:\Users\Devon\VolturaOS\volturaos && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd C:\Users\Devon\VolturaOS && git add volturaos/app/globals.css volturaos/package.json volturaos/package-lock.json && git commit -m "feat: install lucide-react and update color tokens to dark theme"
```

---

## Task 2: statusColor Helper + StatusPill Update

**Files:**
- Create: `volturaos/lib/statusColor.ts`
- Modify: `volturaos/components/ui/StatusPill.tsx`

- [ ] **Step 1: Create statusColor.ts**

Create `volturaos/lib/statusColor.ts`:

```typescript
export function statusColor(status: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    'Draft':       { bg: 'bg-gray-800',       text: 'text-gray-400' },
    'Sent':        { bg: 'bg-blue-900/50',     text: 'text-blue-300' },
    'Viewed':      { bg: 'bg-indigo-900/50',   text: 'text-indigo-300' },
    'Approved':    { bg: 'bg-emerald-900/50',  text: 'text-emerald-300' },
    'Declined':    { bg: 'bg-red-900/50',      text: 'text-red-300' },
    'Lead':        { bg: 'bg-gray-700',        text: 'text-gray-300' },
    'Scheduled':   { bg: 'bg-sky-900/50',      text: 'text-sky-300' },
    'In Progress': { bg: 'bg-amber-900/50',    text: 'text-amber-300' },
    'Completed':   { bg: 'bg-green-900/50',    text: 'text-green-300' },
    'Invoiced':    { bg: 'bg-purple-900/50',   text: 'text-purple-300' },
    'Unpaid':      { bg: 'bg-orange-900/50',   text: 'text-orange-300' },
    'Partial':     { bg: 'bg-yellow-900/50',   text: 'text-yellow-300' },
    'Paid':        { bg: 'bg-teal-900/50',     text: 'text-teal-300' },
    'Cancelled':   { bg: 'bg-gray-800',        text: 'text-gray-400' },
    'Active':      { bg: 'bg-emerald-900/50',  text: 'text-emerald-300' },
    'Expired':     { bg: 'bg-red-900/50',      text: 'text-red-300' },
  }
  return map[status] ?? { bg: 'bg-gray-800', text: 'text-gray-400' }
}
```

- [ ] **Step 2: Update StatusPill to use statusColor**

Replace the entire content of `volturaos/components/ui/StatusPill.tsx`:

```typescript
import { statusColor } from '@/lib/statusColor'

export function StatusPill({ status }: { status: string }) {
  const { bg, text } = statusColor(status)
  return (
    <span className={`${bg} ${text} rounded-full px-2 py-0.5 text-xs font-medium`}>
      {status}
    </span>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd C:\Users\Devon\VolturaOS\volturaos && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd C:\Users\Devon\VolturaOS && git add volturaos/lib/statusColor.ts volturaos/components/ui/StatusPill.tsx && git commit -m "feat: add statusColor helper and update StatusPill to semantic colors"
```

---

## Task 3: PageHeader Component

**Files:**
- Create: `volturaos/components/ui/PageHeader.tsx`

- [ ] **Step 1: Create PageHeader.tsx**

Create `volturaos/components/ui/PageHeader.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, backHref, action }: PageHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#0D0F1A]/90 backdrop-blur-sm border-b border-white/5 flex items-center">
      {/* Back button */}
      <div className="absolute left-0 pl-2">
        {backHref && (
          <Link href={backHref} className="flex items-center justify-center w-10 h-10">
            <ChevronLeft size={20} className="text-volturaGold" />
          </Link>
        )}
      </div>

      {/* Title + subtitle (centered) */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <span className="text-white text-sm font-semibold tracking-wide leading-tight">{title}</span>
        {subtitle && (
          <span className="text-gray-400 text-[10px] leading-tight">{subtitle}</span>
        )}
      </div>

      {/* Action slot */}
      <div className="absolute right-0 pr-1">
        {action}
      </div>
    </header>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd C:\Users\Devon\VolturaOS\volturaos && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd C:\Users\Devon\VolturaOS && git add volturaos/components/ui/PageHeader.tsx && git commit -m "feat: add PageHeader sticky header component with back button and action slot"
```

---

## Task 4: BottomNav Redesign

**Files:**
- Modify: `volturaos/components/nav/BottomNav.tsx`

- [ ] **Step 1: Rewrite BottomNav with Lucide icons**

Replace the entire content of `volturaos/components/nav/BottomNav.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Zap, Wrench, Users, FileText, DollarSign } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const tabs: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: '/',          label: 'Home',      Icon: Zap },
  { href: '/jobs',      label: 'Jobs',      Icon: Wrench },
  { href: '/customers', label: 'Customers', Icon: Users },
  { href: '/estimates', label: 'Estimates', Icon: FileText },
  { href: '/invoices',  label: 'Invoices',  Icon: DollarSign },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0D0F1A]/95 backdrop-blur-sm border-t border-white/5 z-40">
      <div className="flex h-full">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5"
            >
              {/* Gold pill indicator */}
              <div className={`w-8 h-1 rounded-full mb-0.5 transition-opacity ${active ? 'bg-volturaGold opacity-100' : 'opacity-0'}`} />
              <Icon
                size={20}
                className={active ? 'text-volturaGold' : 'text-gray-500'}
              />
              <span className={`text-[10px] ${active ? 'text-volturaGold' : 'text-gray-500'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd C:\Users\Devon\VolturaOS\volturaos && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd C:\Users\Devon\VolturaOS && git add volturaos/components/nav/BottomNav.tsx && git commit -m "feat: redesign BottomNav with Lucide SVG icons and gold pill active indicator"
```

---

## Task 5: Dashboard Page

**Files:**
- Modify: `volturaos/app/(app)/page.tsx`
- Modify: `volturaos/components/dashboard/KPICards.tsx`

- [ ] **Step 1: Update dashboard page**

Read `volturaos/app/(app)/page.tsx` (already read — current content known). Replace with:

```typescript
import { getDashboardData } from '@/lib/actions/dashboard'
import { KPICards } from '@/components/dashboard/KPICards'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { PageHeader } from '@/components/ui/PageHeader'
import Link from 'next/link'

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <>
      <PageHeader title="VOLTURA" subtitle="Power Group" />
      <div className="px-4 pt-14 pb-6">
        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2 mb-5 mt-4">
          <Link href="/customers/new" className="bg-transparent border border-volturaGold rounded-2xl p-3 text-center text-volturaGold font-bold text-sm">+ Customer</Link>
          <Link href="/estimates/new" className="bg-transparent border border-volturaGold rounded-2xl p-3 text-center text-volturaGold font-bold text-sm">+ Estimate</Link>
          <Link href="/jobs/new" className="bg-transparent border border-volturaGold rounded-2xl p-3 text-center text-volturaGold font-bold text-sm">+ Job</Link>
        </div>

        {/* KPIs */}
        <KPICards
          monthRevenue={data.monthRevenue}
          totalOutstanding={data.totalOutstanding}
          activeJobs={data.activeJobs}
          pendingEstimates={data.pendingEstimates}
          approvedValue={data.approvedValue}
          closeRate={data.closeRate}
        />

        {/* Recent Activity */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold text-sm">Recent Jobs</h2>
            <Link href="/jobs" className="text-volturaGold text-xs">View all</Link>
          </div>
          <RecentActivity jobs={data.recentJobs as { id: string; job_type: string; status: string; created_at: string; customer: { name: string } }[]} />
        </div>

        {/* Quick links */}
        <div className="flex gap-4 justify-center mt-5">
          <Link href="/settings/pricebook" className="text-gray-500 text-xs underline">⚙️ Pricebook</Link>
          <Link href="/settings/templates" className="text-gray-500 text-xs underline">🔖 Templates</Link>
          <Link href="/agreements" className="text-gray-500 text-xs underline">🛡 Agreements</Link>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Update KPICards**

Replace `volturaos/components/dashboard/KPICards.tsx`:

```typescript
interface KPICardsProps {
  monthRevenue: number
  totalOutstanding: number
  activeJobs: number
  pendingEstimates: number
  approvedValue: number
  closeRate: number
}

export function KPICards(props: KPICardsProps) {
  const cards = [
    { label: 'Monthly Revenue', value: `$${props.monthRevenue.toLocaleString()}`, color: 'text-volturaGold' },
    { label: 'Outstanding', value: `$${props.totalOutstanding.toLocaleString()}`, color: props.totalOutstanding > 0 ? 'text-red-400' : 'text-green-400' },
    { label: 'Active Jobs', value: props.activeJobs.toString(), color: 'text-blue-400' },
    { label: 'Pending Estimates', value: props.pendingEstimates.toString(), color: 'text-yellow-400' },
    { label: 'Approved Pipeline', value: `$${props.approvedValue.toLocaleString()}`, color: 'text-green-400' },
    { label: 'Close Rate', value: `${props.closeRate}%`, color: 'text-volturaGold' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="bg-volturaNavy/50 border border-white/5 rounded-2xl p-3">
          <p className="text-gray-400 text-xs mb-1">{card.label}</p>
          <p className={`${card.color} text-xl font-bold`}>{card.value}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd C:\Users\Devon\VolturaOS\volturaos && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd C:\Users\Devon\VolturaOS && git add "volturaos/app/(app)/page.tsx" volturaos/components/dashboard/KPICards.tsx && git commit -m "feat: update dashboard with PageHeader, outlined action buttons, and card borders"
```

---

## Task 6: List Pages

**Files:**
- Modify: `volturaos/app/(app)/customers/page.tsx`
- Modify: `volturaos/components/customers/CustomerCard.tsx`
- Modify: `volturaos/app/(app)/jobs/page.tsx`
- Modify: `volturaos/components/jobs/JobCard.tsx`
- Modify: `volturaos/app/(app)/estimates/page.tsx`
- Modify: `volturaos/app/(app)/invoices/page.tsx`
- Modify: `volturaos/components/invoices/InvoiceList.tsx`

- [ ] **Step 1: Update customers list page**

Replace `volturaos/app/(app)/customers/page.tsx`:

```typescript
export const dynamic = 'force-dynamic'

import { searchCustomers } from '@/lib/actions/customers'
import { CustomerSearch } from '@/components/customers/CustomerSearch'
import { CustomerCard } from '@/components/customers/CustomerCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import Link from 'next/link'

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const customers = await searchCustomers(q ?? '')

  return (
    <>
      <PageHeader
        title="Customers"
        action={<Link href="/customers/new" className="text-volturaGold text-sm pr-4">+ New</Link>}
      />
      <div className="px-4 pt-14 pb-6">
        <CustomerSearch initialQuery={q ?? ''} />
        {customers.length === 0 ? (
          <EmptyState message="No customers yet — tap + to add one" ctaLabel="+ Add Customer" ctaHref="/customers/new" />
        ) : (
          <div className="space-y-2 mt-4">
            {customers.map((c) => <CustomerCard key={c.id} customer={c} />)}
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Update CustomerCard**

Replace `volturaos/components/customers/CustomerCard.tsx`:

```typescript
import Link from 'next/link'
import type { Customer } from '@/types'

export function CustomerCard({ customer }: { customer: Customer }) {
  return (
    <Link
      href={`/customers/${customer.id}`}
      className="block bg-volturaNavy/50 border border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-transform duration-100"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white font-semibold">{customer.name}</p>
          {customer.phone && <p className="text-gray-400 text-sm">{customer.phone}</p>}
          {customer.address && <p className="text-gray-500 text-xs mt-1">{customer.address}</p>}
        </div>
        <span className="text-xs bg-volturaNavy border border-white/5 px-2 py-0.5 rounded-full text-gray-400 capitalize">
          {customer.property_type}
        </span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Update jobs list page**

Replace `volturaos/app/(app)/jobs/page.tsx`:

```typescript
export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { listJobs } from '@/lib/actions/jobs'
import { JobBoard } from '@/components/jobs/JobBoard'
import { PageHeader } from '@/components/ui/PageHeader'
import Link from 'next/link'

export default async function JobsPage() {
  const jobs = await listJobs()
  return (
    <>
      <PageHeader
        title="Jobs"
        action={<Link href="/jobs/new" className="text-volturaGold text-sm pr-4">+ New</Link>}
      />
      <div className="px-4 pt-14 pb-6">
        <Suspense>
          <JobBoard jobs={jobs} />
        </Suspense>
      </div>
    </>
  )
}
```

- [ ] **Step 4: Update JobCard**

Replace `volturaos/components/jobs/JobCard.tsx`:

```typescript
import Link from 'next/link'
import type { Job } from '@/types'
import { StatusPill } from '@/components/ui/StatusPill'

interface JobCardProps {
  job: Job & { customer: { name: string } }
}

export function JobCard({ job }: JobCardProps) {
  const dateStr = job.scheduled_date
    ? new Date(job.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null
  const timeStr = job.scheduled_time ? job.scheduled_time.slice(0, 5) : null

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block bg-volturaNavy/50 border border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-transform duration-100"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">{job.customer.name}</p>
          <p className="text-gray-400 text-sm truncate">{job.job_type}</p>
          {dateStr && (
            <p className="text-gray-500 text-xs mt-1">
              📅 {dateStr}{timeStr ? ` at ${timeStr}` : ''}
            </p>
          )}
        </div>
        <StatusPill status={job.status} />
      </div>
    </Link>
  )
}
```

- [ ] **Step 5: Update estimates list page**

Read `volturaos/app/(app)/estimates/page.tsx` first. The file has `groupEstimates`/`groupStatus` helper functions and a type alias defined at the top — keep all of those unchanged. Also keep all existing imports (`listEstimates`, `StatusPill`, `EmptyState`, `Link`, `type { Estimate, EstimateStatus }`).

Add this import: `import { PageHeader } from '@/components/ui/PageHeader'`

Replace only the `return (...)` block with:

```typescript
  return (
    <>
      <PageHeader
        title="Estimates"
        action={<Link href="/estimates/new" className="text-volturaGold text-sm pr-4">+ New</Link>}
      />
      <div className="px-4 pt-14 pb-6">
        {groups.length === 0 ? (
          <EmptyState message="No estimates yet — tap + to create one" ctaLabel="+ New Estimate" ctaHref="/estimates/new" />
        ) : (
          <div className="space-y-2">
            {groups.map((group) => {
              const anchor = group[0]
              const isGrouped = group.length > 1
              const status = groupStatus(group)
              const maxTotal = Math.max(...group.map((e) => e.total ?? 0))
              const names = group.map((e) => e.name ?? 'Estimate').join(' · ')
              const hasFollowUp = anchor.follow_up_sent_at && !anchor.follow_up_dismissed && anchor.status === 'Sent'

              return (
                <Link key={anchor.id} href={`/estimates/${anchor.id}`} className="block bg-volturaNavy/50 border border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-transform duration-100">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="text-white font-semibold">{anchor.customer?.name ?? 'Unknown'}</p>
                      <p className="text-gray-400 text-xs mt-0.5 truncate">
                        {names}
                        {hasFollowUp && <span className="text-yellow-400 ml-1">🔔</span>}
                      </p>
                      {isGrouped && (
                        <p className="text-volturaGold/70 text-xs mt-0.5">{group.length} estimates</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <StatusPill status={status} />
                      {maxTotal > 0 && <p className="text-volturaGold font-bold text-sm mt-1">${maxTotal.toLocaleString()}</p>}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
```

Also add the `PageHeader` import at the top of that file.

- [ ] **Step 6: Update invoices list page**

Replace `volturaos/app/(app)/invoices/page.tsx`:

```typescript
export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { listInvoices } from '@/lib/actions/invoices'
import { InvoiceList } from '@/components/invoices/InvoiceList'
import { PageHeader } from '@/components/ui/PageHeader'

export default async function InvoicesPage() {
  const invoices = await listInvoices()
  return (
    <>
      <PageHeader title="Invoices" />
      <div className="px-4 pt-14 pb-6">
        <Suspense>
          <InvoiceList invoices={invoices} />
        </Suspense>
      </div>
    </>
  )
}
```

- [ ] **Step 7: Update InvoiceList card styles**

In `volturaos/components/invoices/InvoiceList.tsx`, find the invoice `<Link>` card class:
```
className="block bg-volturaNavy/50 rounded-xl p-4"
```
Change to:
```
className="block bg-volturaNavy/50 border border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-transform duration-100"
```

- [ ] **Step 8: TypeScript check**

```bash
cd C:\Users\Devon\VolturaOS\volturaos && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 9: Commit**

```bash
cd C:\Users\Devon\VolturaOS && git add "volturaos/app/(app)/customers/page.tsx" volturaos/components/customers/CustomerCard.tsx "volturaos/app/(app)/jobs/page.tsx" volturaos/components/jobs/JobCard.tsx "volturaos/app/(app)/estimates/page.tsx" "volturaos/app/(app)/invoices/page.tsx" volturaos/components/invoices/InvoiceList.tsx && git commit -m "feat: apply PageHeader and card upgrades to all list pages"
```

---

## Task 7: Detail Pages

**Files:**
- Modify: `volturaos/app/(app)/customers/[id]/page.tsx`
- Modify: `volturaos/app/(app)/jobs/[id]/page.tsx`
- Modify: `volturaos/app/(app)/invoices/[id]/page.tsx`
- Modify: `volturaos/app/(app)/estimates/[id]/page.tsx`

- [ ] **Step 1: Update customer detail page**

Read `volturaos/app/(app)/customers/[id]/page.tsx` first.

Replace the returned JSX. The current return has a bare `<a href="/customers">` back link and a flat `<div>`. Change to:

```typescript
  return (
    <>
      <PageHeader title={customer.name} backHref="/customers" />
      <div className="px-4 pt-14 pb-6">
        <CustomerDetail customer={customer} agreement={agreement} />
        <EquipmentSection customerId={customer.id} equipment={customer.equipment} />
      </div>
    </>
  )
```

Also add `import { PageHeader } from '@/components/ui/PageHeader'` at the top.

- [ ] **Step 2: Update job detail page**

Read `volturaos/app/(app)/jobs/[id]/page.tsx` first.

The current return has `<div className="min-h-dvh bg-volturaBlue">` with an inline `<header>`. Replace:

```typescript
  return (
    <>
      <PageHeader title={job.customer.name} backHref="/jobs" />
      <div className="min-h-dvh pt-14">
        <JobDetail job={job} checklist={checklist} photos={photos} />
      </div>
    </>
  )
```

Add `import { PageHeader } from '@/components/ui/PageHeader'` at the top. Also remove the now-unused `import { JobChecklist } from '@/components/jobs/JobChecklist'` line — `JobChecklist` is used internally by `JobDetail`, not at the page level.

- [ ] **Step 3: Update invoice detail page**

Read `volturaos/app/(app)/invoices/[id]/page.tsx` first.

The current return has `<div className="min-h-dvh bg-volturaBlue">` with an inline `<header>`. Replace:

```typescript
  return (
    <>
      <PageHeader title={invoice.customer.name} backHref="/invoices" />
      <div className="min-h-dvh pt-14">
        <InvoiceDetail invoice={invoice} />
      </div>
    </>
  )
```

Add `import { PageHeader } from '@/components/ui/PageHeader'` at the top.

- [ ] **Step 4: Update estimate detail page**

The current file (`volturaos/app/(app)/estimates/[id]/page.tsx`) has this exact structure — preserve all imports and content, only replace the outer div + inline header:

**Add** this import at the top:
```typescript
import { PageHeader } from '@/components/ui/PageHeader'
import Link from 'next/link'
```

**Replace** the entire `return (...)` block with:
```typescript
  return (
    <>
      <PageHeader
        title={estimate.customer.name}
        backHref="/estimates"
        action={
          <Link
            href={`/estimates/new?customerId=${estimate.customer.id}&customerName=${encodeURIComponent(estimate.customer.name)}`}
            className="text-volturaGold text-xs font-semibold border border-volturaGold/40 px-2.5 py-1 rounded-lg mr-2"
          >
            + New
          </Link>
        }
      />
      <div className="min-h-dvh pt-14">
        <ProgressTracker sentAt={estimate.sent_at} viewedAt={estimate.viewed_at} status={estimate.status} />
        <EstimateActions
          estimateId={id}
          customerId={estimate.customer.id}
          status={estimate.status}
        />
        <EstimateBuilder
          estimateId={id}
          pricebook={pricebook}
          initialCustomerId={estimate.customer.id}
          initialCustomerName={estimate.customer.name}
          estimateCreatedAt={estimate.created_at}
          proposalCount={proposal.length}
          proposalEstimates={proposal}
          linkedInvoiceId={linkedInvoice?.id ?? null}
          initialEstimate={{
            name: estimate.name ?? 'Estimate',
            status: estimate.status,
            line_items: estimate.line_items,
            addons: estimate.addons,
            notes: estimate.notes,
            includes_permit: estimate.includes_permit,
            includes_cleanup: estimate.includes_cleanup,
            includes_warranty: estimate.includes_warranty,
            follow_up_days: estimate.follow_up_days,
            follow_up_sent_at: estimate.follow_up_sent_at,
            follow_up_dismissed: estimate.follow_up_dismissed,
          }}
        />
      </div>
    </>
  )
```

Keep all existing imports (`getEstimateById`, `EstimateBuilder`, `EstimateActions`, `StatusPill`, `ProgressTracker`, etc.) — do not remove `StatusPill` even though it is no longer in the header (it may be used by EstimateActions).

- [ ] **Step 5: TypeScript check**

```bash
cd C:\Users\Devon\VolturaOS\volturaos && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
cd C:\Users\Devon\VolturaOS && git add "volturaos/app/(app)/customers/[id]/page.tsx" "volturaos/app/(app)/jobs/[id]/page.tsx" "volturaos/app/(app)/invoices/[id]/page.tsx" "volturaos/app/(app)/estimates/[id]/page.tsx" && git commit -m "feat: apply PageHeader to all detail pages"
```
