# VolturaOS Phase 2: Jobs, Invoices & Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Job Board with dispatch/status management, Invoice system with partial payments, and Dashboard KPIs — completing VolturaOS as a usable field service management app.

**Architecture:** Server actions for all mutations, server components for data fetching, client components for interactive UI. Kanban-style job board with drag-free status pills. Invoice system with multiple partial payments tracked in `invoice_payments` sub-table. Dashboard pulls live aggregates from Supabase.

**Tech Stack:** Next.js 16 App Router, Supabase PostgreSQL, Tailwind CSS v4, TypeScript

---

## File Map

### Server Actions
- Modify: `volturaos/lib/actions/jobs.ts` — Add `listJobs`, `getJobById`, `updateJob`, `deleteJob`
- Rewrite: `volturaos/lib/actions/invoices.ts` — Full invoice + payment CRUD

### Pages
- Rewrite: `volturaos/app/(app)/jobs/page.tsx` — Job board with filters
- Create: `volturaos/app/(app)/jobs/new/page.tsx` — Create job form
- Create: `volturaos/app/(app)/jobs/[id]/page.tsx` — Job detail view
- Create: `volturaos/app/(app)/invoices/page.tsx` — Invoice list
- Create: `volturaos/app/(app)/invoices/[id]/page.tsx` — Invoice detail + payments
- Rewrite: `volturaos/app/(app)/page.tsx` — Dashboard with live KPIs

### Components
- Create: `volturaos/components/jobs/JobBoard.tsx` — Filterable job list with status pills
- Create: `volturaos/components/jobs/JobCard.tsx` — Single job card
- Create: `volturaos/components/jobs/JobForm.tsx` — Create/edit job form
- Create: `volturaos/components/jobs/JobDetail.tsx` — Full job detail with status actions
- Create: `volturaos/components/jobs/StatusStepper.tsx` — Visual status progression
- Create: `volturaos/components/invoices/InvoiceList.tsx` — Invoice list with filters
- Create: `volturaos/components/invoices/InvoiceDetail.tsx` — Invoice view + payment recording
- Create: `volturaos/components/invoices/PaymentForm.tsx` — Record payment bottom sheet
- Create: `volturaos/components/invoices/PaymentHistory.tsx` — Payment log
- Create: `volturaos/components/dashboard/KPICards.tsx` — Revenue, jobs, estimates cards
- Create: `volturaos/components/dashboard/RecentActivity.tsx` — Recent jobs + invoices feed

### AI Tools Update
- Modify: `volturaos/lib/ai/tools.ts` — Add job and invoice tools

---

### Task 1: Job Board Server Actions

**Files:**
- Modify: `volturaos/lib/actions/jobs.ts`

- [ ] **Step 1: Add `listJobs` with filtering**

```typescript
export async function listJobs(filters?: {
  status?: JobStatus
  customerId?: string
}): Promise<(Job & { customer: { name: string } })[]> {
  await requireAuth()
  const admin = createAdminClient()
  let query = admin.from('jobs').select('*, customers(name)').order('created_at', { ascending: false }).limit(100)
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.customerId) query = query.eq('customer_id', filters.customerId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as Record<string, unknown>[]).map(({ customers, ...j }) => ({
    ...j, customer: customers
  })) as (Job & { customer: { name: string } })[]
}
```

- [ ] **Step 2: Add `getJobById`**

```typescript
export async function getJobById(id: string): Promise<Job & { customer: { name: string; phone: string | null; address: string | null } }> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin.from('jobs').select('*, customers(name, phone, address)').eq('id', id).single()
  if (error) throw new Error(error.message)
  const { customers, ...job } = data as Record<string, unknown>
  return { ...job, customer: customers } as Job & { customer: { name: string; phone: string | null; address: string | null } }
}
```

- [ ] **Step 3: Add `updateJob` for editing fields**

```typescript
export async function updateJob(id: string, updates: {
  jobType?: string
  scheduledDate?: string | null
  scheduledTime?: string | null
  notes?: string | null
}): Promise<void> {
  await requireAuth()
  const admin = createAdminClient()
  const { error } = await admin.from('jobs').update({
    job_type: updates.jobType,
    scheduled_date: updates.scheduledDate,
    scheduled_time: updates.scheduledTime,
    notes: updates.notes,
  }).eq('id', id)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 4: Update `updateJobStatus` with Telegram notifications**

Add `sendTelegram` and `syncToSheets` calls when status changes to Completed or Paid.

- [ ] **Step 5: Commit**

```bash
git add volturaos/lib/actions/jobs.ts
git commit -m "feat: complete job CRUD server actions with filtering and notifications"
```

---

### Task 2: Invoice & Payment Server Actions

**Files:**
- Rewrite: `volturaos/lib/actions/invoices.ts`

- [ ] **Step 1: Write full invoice actions**

```typescript
'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { sendTelegram } from '@/lib/telegram'
import { syncToSheets } from '@/lib/sheets'
import type { Invoice, InvoicePayment, PaymentMethod, LineItem } from '@/types'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
}

export async function createInvoice(input: {
  customerId: string
  estimateId?: string
  jobId?: string
  lineItems: LineItem[]
  total: number
  dueDate?: string
  notes?: string
}): Promise<Invoice> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin.from('invoices').insert({
    customer_id: input.customerId,
    estimate_id: input.estimateId ?? null,
    job_id: input.jobId ?? null,
    line_items: input.lineItems,
    total: input.total,
    due_date: input.dueDate ?? null,
    notes: input.notes ?? null,
    status: 'Unpaid',
  }).select().single()
  if (error) throw new Error(error.message)
  void sendTelegram(`💰 New invoice created — $${input.total.toLocaleString()}`)
  return data as Invoice
}

export async function createInvoiceFromEstimate(estimateId: string): Promise<Invoice> {
  await requireAuth()
  const admin = createAdminClient()
  const { data: est, error: estErr } = await admin.from('estimates')
    .select('*, customers(name)')
    .eq('id', estimateId).single()
  if (estErr || !est) throw new Error('Estimate not found')
  const { data, error } = await admin.from('invoices').insert({
    customer_id: est.customer_id,
    estimate_id: estimateId,
    line_items: est.line_items,
    total: est.total,
    status: 'Unpaid',
  }).select().single()
  if (error) throw new Error(error.message)
  const customerName = (est.customers as Record<string, unknown>)?.name ?? 'Unknown'
  void sendTelegram(`💰 Invoice created from estimate — ${customerName} — $${est.total?.toLocaleString()}`)
  return data as Invoice
}

export async function getInvoiceById(id: string): Promise<Invoice & {
  customer: { name: string; phone: string | null }
  payments: InvoicePayment[]
}> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin.from('invoices')
    .select('*, customers(name, phone), invoice_payments(*)')
    .eq('id', id).single()
  if (error) throw new Error(error.message)
  const { customers, invoice_payments, ...invoice } = data as Record<string, unknown>
  return {
    ...invoice,
    customer: customers,
    payments: (invoice_payments ?? []) as InvoicePayment[],
  } as Invoice & { customer: { name: string; phone: string | null }; payments: InvoicePayment[] }
}

export async function listInvoices(filters?: {
  status?: string
}): Promise<(Invoice & { customer: { name: string } })[]> {
  await requireAuth()
  const admin = createAdminClient()
  let query = admin.from('invoices').select('*, customers(name)').order('created_at', { ascending: false }).limit(100)
  if (filters?.status) query = query.eq('status', filters.status)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as Record<string, unknown>[]).map(({ customers, ...inv }) => ({
    ...inv, customer: customers
  })) as (Invoice & { customer: { name: string } })[]
}

export async function recordPayment(input: {
  invoiceId: string
  amount: number
  paymentMethod: PaymentMethod
  notes?: string
}): Promise<void> {
  await requireAuth()
  const admin = createAdminClient()

  // Insert payment record
  const { error: payErr } = await admin.from('invoice_payments').insert({
    invoice_id: input.invoiceId,
    amount: input.amount,
    payment_method: input.paymentMethod,
    notes: input.notes ?? null,
  })
  if (payErr) throw new Error(payErr.message)

  // Update invoice amount_paid and status
  const { data: inv, error: invErr } = await admin.from('invoices')
    .select('total, amount_paid, customers(name)')
    .eq('id', input.invoiceId).single()
  if (invErr) throw new Error(invErr.message)

  const newAmountPaid = (inv.amount_paid as number) + input.amount
  const total = inv.total as number
  const status = newAmountPaid >= total ? 'Paid' : 'Partial'

  await admin.from('invoices').update({
    amount_paid: newAmountPaid,
    status,
  }).eq('id', input.invoiceId)

  const customerName = (inv.customers as Record<string, unknown>)?.name ?? 'Unknown'
  void sendTelegram(`💵 Payment received: $${input.amount} via ${input.paymentMethod} — ${customerName} — ${status === 'Paid' ? 'PAID IN FULL' : `$${(total - newAmountPaid).toFixed(2)} remaining`}`)
  void syncToSheets('Payments', { Timestamp: new Date().toISOString(), InvoiceID: input.invoiceId, Amount: input.amount, Method: input.paymentMethod, Status: status })
}
```

- [ ] **Step 2: Commit**

```bash
git add volturaos/lib/actions/invoices.ts
git commit -m "feat: complete invoice + payment server actions"
```

---

### Task 3: Job Board UI

**Files:**
- Create: `volturaos/components/jobs/JobCard.tsx`
- Create: `volturaos/components/jobs/StatusStepper.tsx`
- Create: `volturaos/components/jobs/JobBoard.tsx`
- Rewrite: `volturaos/app/(app)/jobs/page.tsx`
- Create: `volturaos/app/(app)/jobs/new/page.tsx`

- [ ] **Step 1: Create StatusStepper component**

Visual status progression bar showing: Lead → Scheduled → In Progress → Completed → Invoiced → Paid. Highlight current step in gold.

- [ ] **Step 2: Create JobCard component**

Card showing: customer name, job type, status pill, scheduled date, and tap-to-open link.

- [ ] **Step 3: Create JobBoard component**

Client component with:
- Filter tabs at top: All | Lead | Scheduled | In Progress | Completed
- Job cards list, sorted by scheduled date
- Uses URL search params for filter state

- [ ] **Step 4: Rewrite jobs page**

Server component that fetches jobs and renders `<JobBoard>`.

- [ ] **Step 5: Create new job page**

Form with: customer selector (reuse `CustomerSelector`), job type selector (from pricebook), scheduled date, scheduled time, notes. Submits via `createJob` action and redirects to `/jobs`.

- [ ] **Step 6: Commit**

```bash
git add volturaos/components/jobs/ volturaos/app/(app)/jobs/
git commit -m "feat: job board with filter tabs, job cards, and create job form"
```

---

### Task 4: Job Detail Page

**Files:**
- Create: `volturaos/components/jobs/JobDetail.tsx`
- Create: `volturaos/app/(app)/jobs/[id]/page.tsx`

- [ ] **Step 1: Create JobDetail component**

Client component showing:
- Customer name + phone (tap to call)
- Job type + scheduled date/time
- StatusStepper with current status
- Status action buttons: "Schedule" (if Lead), "Start" (if Scheduled), "Complete" (if In Progress), "Create Invoice" (if Completed)
- Notes section (editable)
- "Create Invoice" button that calls `createInvoice` with job's line items and redirects to the invoice

- [ ] **Step 2: Create job detail page**

Server component that fetches job by ID and renders `<JobDetail>`.

- [ ] **Step 3: Commit**

```bash
git add volturaos/components/jobs/JobDetail.tsx volturaos/app/(app)/jobs/[id]/
git commit -m "feat: job detail page with status stepper and action buttons"
```

---

### Task 5: Invoice List & Detail UI

**Files:**
- Create: `volturaos/components/invoices/InvoiceList.tsx`
- Create: `volturaos/components/invoices/InvoiceDetail.tsx`
- Create: `volturaos/components/invoices/PaymentForm.tsx`
- Create: `volturaos/components/invoices/PaymentHistory.tsx`
- Create: `volturaos/app/(app)/invoices/page.tsx`
- Create: `volturaos/app/(app)/invoices/[id]/page.tsx`

- [ ] **Step 1: Create InvoiceList component**

Client component with filter tabs: All | Unpaid | Partial | Paid. Each invoice card shows customer name, total, balance, status pill, created date.

- [ ] **Step 2: Create PaymentForm component**

Bottom sheet with: amount input (defaults to remaining balance), payment method select (Check/Zelle/Cash/Credit Card), notes. Calls `recordPayment` action.

- [ ] **Step 3: Create PaymentHistory component**

List of past payments for an invoice: date, amount, method, notes.

- [ ] **Step 4: Create InvoiceDetail component**

Shows: customer info, line items, total, amount paid, balance remaining, status. "Record Payment" button opens PaymentForm. PaymentHistory below.

- [ ] **Step 5: Create invoice pages**

- `invoices/page.tsx` — server component, fetches and renders InvoiceList
- `invoices/[id]/page.tsx` — server component, fetches and renders InvoiceDetail

- [ ] **Step 6: Add Invoices tab to BottomNav**

Update `BottomNav.tsx`: replace the "More" tab route or add a 6th tab. Since we have Home, Jobs, Customers, Estimates — change "More" to route to `/invoices` with label "Invoices" and icon `💰`. Move pricebook access to a settings link on the home page.

- [ ] **Step 7: Commit**

```bash
git add volturaos/components/invoices/ volturaos/app/(app)/invoices/ volturaos/components/nav/BottomNav.tsx
git commit -m "feat: invoice list, detail, payment recording, and nav update"
```

---

### Task 6: Dashboard KPIs

**Files:**
- Create: `volturaos/components/dashboard/KPICards.tsx`
- Create: `volturaos/components/dashboard/RecentActivity.tsx`
- Create: `volturaos/lib/actions/dashboard.ts`
- Rewrite: `volturaos/app/(app)/page.tsx`

- [ ] **Step 1: Create dashboard server action**

```typescript
'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
}

export async function getDashboardData() {
  await requireAuth()
  const admin = createAdminClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [invoices, jobs, estimates, recentJobs] = await Promise.all([
    admin.from('invoices').select('total, amount_paid, status, created_at'),
    admin.from('jobs').select('status, created_at'),
    admin.from('estimates').select('status, total, created_at'),
    admin.from('jobs').select('*, customers(name)').order('created_at', { ascending: false }).limit(5),
  ])

  const allInvoices = (invoices.data ?? []) as Record<string, unknown>[]
  const allJobs = (jobs.data ?? []) as Record<string, unknown>[]
  const allEstimates = (estimates.data ?? []) as Record<string, unknown>[]

  // This month's revenue
  const monthRevenue = allInvoices
    .filter(i => (i.created_at as string) >= monthStart)
    .reduce((sum, i) => sum + ((i.amount_paid as number) || 0), 0)

  // Total outstanding
  const totalOutstanding = allInvoices
    .filter(i => i.status !== 'Paid')
    .reduce((sum, i) => sum + ((i.total as number) - ((i.amount_paid as number) || 0)), 0)

  // Active jobs (not Completed/Paid/Cancelled)
  const activeJobs = allJobs.filter(j => !['Completed', 'Invoiced', 'Paid', 'Cancelled'].includes(j.status as string)).length

  // Pending estimates
  const pendingEstimates = allEstimates.filter(e => ['Draft', 'Sent', 'Viewed'].includes(e.status as string)).length

  // Approved estimates value
  const approvedValue = allEstimates
    .filter(e => e.status === 'Approved')
    .reduce((sum, e) => sum + ((e.total as number) || 0), 0)

  // Close rate
  const sentOrBetter = allEstimates.filter(e => ['Sent', 'Viewed', 'Approved', 'Declined'].includes(e.status as string)).length
  const approved = allEstimates.filter(e => e.status === 'Approved').length
  const closeRate = sentOrBetter > 0 ? Math.round((approved / sentOrBetter) * 100) : 0

  return {
    monthRevenue,
    totalOutstanding,
    activeJobs,
    pendingEstimates,
    approvedValue,
    closeRate,
    recentJobs: (recentJobs.data ?? []).map(({ customers, ...j }) => ({
      ...j, customer: customers
    })),
  }
}
```

- [ ] **Step 2: Create KPICards component**

Six cards in a 2-column grid:
- Monthly Revenue (gold, large number)
- Outstanding Balance (red if > 0)
- Active Jobs (blue)
- Pending Estimates (yellow)
- Approved Pipeline (green)
- Close Rate (percentage)

- [ ] **Step 3: Create RecentActivity component**

Feed of last 5 jobs with customer name, job type, status, and date. Tappable to go to job detail.

- [ ] **Step 4: Rewrite dashboard page**

Server component that calls `getDashboardData()` and renders KPICards + quick action buttons + RecentActivity.

- [ ] **Step 5: Commit**

```bash
git add volturaos/lib/actions/dashboard.ts volturaos/components/dashboard/ volturaos/app/(app)/page.tsx
git commit -m "feat: dashboard with live KPIs, revenue tracking, and recent activity"
```

---

### Task 7: AI Tools Update — Jobs & Invoices

**Files:**
- Modify: `volturaos/lib/ai/tools.ts`
- Modify: `volturaos/lib/ai/prompts.ts`

- [ ] **Step 1: Add job and invoice tools**

Add to `AI_TOOLS` array:
- `create_job` — Create a job for a customer with job type and schedule
- `list_jobs` — List recent jobs with status filtering
- `create_invoice` — Create invoice from an estimate or manually
- `record_payment` — Record a payment on an invoice

- [ ] **Step 2: Add tool execution handlers**

Add corresponding `case` blocks in `executeTool()`.

- [ ] **Step 3: Update system prompt**

Add new tools to the system prompt tool list.

- [ ] **Step 4: Commit**

```bash
git add volturaos/lib/ai/tools.ts volturaos/lib/ai/prompts.ts
git commit -m "feat: AI assistant can now create jobs, invoices, and record payments"
```

---

### Task 8: Integration — Estimate-to-Invoice Flow

**Files:**
- Modify: `volturaos/components/estimate-builder/SendSheet.tsx`
- Modify: `volturaos/components/jobs/JobDetail.tsx`

- [ ] **Step 1: Add "Convert to Invoice" button on approved estimates**

In the SendSheet or estimate detail, add a button visible when status is Approved that calls `createInvoiceFromEstimate()` and redirects to the new invoice.

- [ ] **Step 2: Add "Create Invoice" flow on completed jobs**

In JobDetail, when status is Completed, show a "Create Invoice" button that creates an invoice linked to the job and redirects.

- [ ] **Step 3: Commit**

```bash
git add volturaos/components/estimate-builder/SendSheet.tsx volturaos/components/jobs/JobDetail.tsx
git commit -m "feat: estimate-to-invoice and job-to-invoice conversion flows"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Job CRUD server actions | 1 file |
| 2 | Invoice + payment server actions | 1 file |
| 3 | Job board UI + create form | 5 files |
| 4 | Job detail page | 2 files |
| 5 | Invoice list, detail, payments UI | 7 files |
| 6 | Dashboard KPIs | 4 files |
| 7 | AI tools for jobs & invoices | 2 files |
| 8 | Estimate-to-invoice flow | 2 files |
| **Total** | | **24 files** |
