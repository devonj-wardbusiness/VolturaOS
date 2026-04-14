# Long-Press Action Sheet Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a long-press (500ms touch hold) / right-click context menu to every card in the app — Jobs, Customers, Invoices, Estimates — revealing a bottom action sheet with quick actions (Edit, Delete, Change Status, etc.) without navigating away from the list.

**Architecture:** A `useLongPress` hook attaches touch/contextmenu listeners to any card element. An `ActionSheetProvider` (context + rendered sheet) lives in the app layout so any client component can call `openSheet(label, actions)`. Each card component becomes a client component, spreads the hook's bind props, and calls `openSheet` on trigger.

**Tech Stack:** Next.js 15 App Router, React 18 (createPortal, useContext, useRef, useState), TypeScript, Tailwind CSS v4, Supabase admin client for new server actions, Twilio SMS via `lib/sms.ts`.

---

## File Map

| File | Status | Purpose |
|------|--------|---------|
| `hooks/useLongPress.ts` | **Create** | 500ms touch timer + contextmenu detection hook |
| `components/ui/ActionSheet.tsx` | **Create** | Bottom sheet UI with actions, confirm, and status sub-views |
| `components/ui/ActionSheetProvider.tsx` | **Create** | React context + state; renders ActionSheet in portal |
| `components/estimates/EstimateGroupCard.tsx` | **Create** | Client component extracted from estimates page |
| `app/(app)/layout.tsx` | **Modify** | Wrap children in ActionSheetProvider (keep server component) |
| `components/jobs/JobCard.tsx` | **Modify** | Add `'use client'`, long-press, openSheet |
| `components/customers/CustomerCard.tsx` | **Modify** | Add `'use client'`, long-press, openSheet |
| `components/invoices/InvoiceList.tsx` | **Modify** | Add long-press to each invoice row |
| `app/(app)/estimates/page.tsx` | **Modify** | Replace inline Link with EstimateGroupCard |
| `lib/actions/jobs.ts` | **Modify** | Add `deleteJob` |
| `lib/actions/invoices.ts` | **Modify** | Add `deleteInvoice`, `sendInvoiceReminder` |

---

## Task 1: `useLongPress` hook

**Files:**
- Create: `volturaos/hooks/useLongPress.ts`

- [ ] **Step 1: Create the hook**

```ts
// volturaos/hooks/useLongPress.ts
import { useRef } from 'react'

export interface LongPressHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
  onContextMenu: (e: React.MouseEvent) => void
}

export function useLongPress(onLongPress: () => void, delay = 500): LongPressHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const fired = useRef(false)

  function start(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    fired.current = false
    timerRef.current = setTimeout(() => {
      fired.current = true
      navigator.vibrate?.(40)
      onLongPress()
    }, delay)
  }

  function move(e: React.TouchEvent) {
    const dx = Math.abs(e.touches[0].clientX - startX.current)
    const dy = Math.abs(e.touches[0].clientY - startY.current)
    if (dx > 10 || dy > 10) clear()
  }

  function clear() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function end(e: React.TouchEvent) {
    clear()
    if (fired.current) e.preventDefault()
  }

  function contextMenu(e: React.MouseEvent) {
    e.preventDefault()
    navigator.vibrate?.(40)
    onLongPress()
  }

  return {
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: end,
    onContextMenu: contextMenu,
  }
}
```

- [ ] **Step 2: TypeScript check**

Run: `cd volturaos && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add volturaos/hooks/useLongPress.ts
git commit -m "feat: add useLongPress hook for 500ms hold + right-click detection"
```

---

## Task 2: `ActionSheet` + `ActionSheetProvider`

**Files:**
- Create: `volturaos/components/ui/ActionSheet.tsx`
- Create: `volturaos/components/ui/ActionSheetProvider.tsx`

- [ ] **Step 1: Create ActionSheet component**

This component is pure presentational — it receives `label`, `actions`, and `onClose` from the provider. It manages its own `mode` state (actions list → confirm → status picker is handled at the provider level by re-calling `openSheet`).

```tsx
// volturaos/components/ui/ActionSheet.tsx
'use client'

import { useState, useEffect } from 'react'

export interface ActionItem {
  icon: React.ReactNode
  label: string
  onClick: () => void
  destructive?: boolean
}

interface ActionSheetProps {
  label: string
  actions: ActionItem[]
  onClose: () => void
}

export function ActionSheet({ label, actions, onClose }: ActionSheetProps) {
  const [confirmingAction, setConfirmingAction] = useState<ActionItem | null>(null)
  const [visible, setVisible] = useState(false)

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function close() {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  function handleAction(action: ActionItem) {
    if (action.destructive) {
      setConfirmingAction(action)
      return
    }
    action.onClick()
    close()
  }

  async function confirmDelete() {
    if (!confirmingAction) return
    confirmingAction.onClick()
    close()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 200ms ease' }}
        onClick={close}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[90] bg-[#0D0F1A] border-t border-white/10 rounded-t-2xl pb-safe"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 220ms ease-out',
        }}
      >
        {/* Pull handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Label */}
        <p className="text-gray-400 text-xs uppercase tracking-wider px-5 pt-2 pb-3 border-b border-white/5 truncate">
          {label}
        </p>

        {confirmingAction ? (
          /* Confirmation view */
          <div className="px-5 py-5 space-y-3">
            <p className="text-white text-sm text-center">
              Delete <span className="font-semibold">{label}</span>? This cannot be undone.
            </p>
            <button
              onClick={confirmDelete}
              className="w-full py-3.5 bg-red-600 active:bg-red-700 text-white font-bold rounded-xl text-sm transition-colors"
            >
              Confirm Delete
            </button>
            <button
              onClick={() => setConfirmingAction(null)}
              className="w-full py-3 text-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          /* Actions list */
          <div className="py-2">
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={() => handleAction(action)}
                className={`w-full flex items-center gap-4 px-5 py-4 border-b border-white/5 active:bg-white/5 transition-colors text-left ${
                  action.destructive ? 'text-red-400' : 'text-white'
                }`}
              >
                <span className="text-lg leading-none flex-shrink-0">{action.icon}</span>
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))}
            <button
              onClick={close}
              className="w-full py-4 text-gray-500 text-sm font-medium active:bg-white/5"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Create ActionSheetProvider**

```tsx
// volturaos/components/ui/ActionSheetProvider.tsx
'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ActionSheet, ActionItem } from './ActionSheet'

interface SheetState {
  label: string
  actions: ActionItem[]
}

interface ActionSheetContextValue {
  openSheet: (label: string, actions: ActionItem[]) => void
}

const ActionSheetContext = createContext<ActionSheetContextValue>({
  openSheet: () => {},
})

export function useActionSheet() {
  return useContext(ActionSheetContext)
}

export function ActionSheetProvider({ children }: { children: React.ReactNode }) {
  const [sheet, setSheet] = useState<SheetState | null>(null)

  const openSheet = useCallback((label: string, actions: ActionItem[]) => {
    setSheet({ label, actions })
  }, [])

  const closeSheet = useCallback(() => {
    setSheet(null)
  }, [])

  return (
    <ActionSheetContext.Provider value={{ openSheet }}>
      {children}
      {sheet && typeof document !== 'undefined' &&
        createPortal(
          <ActionSheet label={sheet.label} actions={sheet.actions} onClose={closeSheet} />,
          document.body
        )
      }
    </ActionSheetContext.Provider>
  )
}
```

- [ ] **Step 3: TypeScript check**

Run: `cd volturaos && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add volturaos/components/ui/ActionSheet.tsx volturaos/components/ui/ActionSheetProvider.tsx
git commit -m "feat: add ActionSheet and ActionSheetProvider components"
```

---

## Task 3: Wire provider into app layout

**Files:**
- Modify: `volturaos/app/(app)/layout.tsx`

The layout is an `async` server component. **Do NOT add `'use client'`** — that would break `export const dynamic = 'force-dynamic'` and make all pages static. Import `ActionSheetProvider` as a client boundary and wrap `children` with it.

- [ ] **Step 1: Update layout.tsx**

Current layout wraps children in a plain div. Add `ActionSheetProvider` around `{children}` only:

```tsx
// volturaos/app/(app)/layout.tsx
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Search } from 'lucide-react'
import { BottomNav } from '@/components/nav/BottomNav'
import { AIChatWidget } from '@/components/ai-chat/AIChatWidget'
import { FAB } from '@/components/ui/FAB'
import { ActionSheetProvider } from '@/components/ui/ActionSheetProvider'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-16">
      <Link
        href="/search"
        className="fixed top-3 right-16 z-[60] text-gray-400 hover:text-volturaGold p-1"
        aria-label="Search"
      >
        <Search size={20} />
      </Link>
      <ActionSheetProvider>
        {children}
      </ActionSheetProvider>
      <BottomNav />
      <AIChatWidget />
      <FAB />
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

Run: `cd volturaos && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add volturaos/app/\(app\)/layout.tsx
git commit -m "feat: wrap app layout children in ActionSheetProvider"
```

---

## Task 4: New server actions — `deleteJob`, `deleteInvoice`, `sendInvoiceReminder`

**Files:**
- Modify: `volturaos/lib/actions/jobs.ts`
- Modify: `volturaos/lib/actions/invoices.ts`

- [ ] **Step 1: Add `deleteJob` to jobs.ts**

Append to the bottom of `volturaos/lib/actions/jobs.ts`:

```ts
export async function deleteJob(id: string): Promise<void> {
  'use server'
  const admin = createAdminClient()
  const { error } = await admin.from('jobs').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
```

Note: `job_materials` and time entries cascade via FK on delete. If the DB doesn't have cascade set up, this may need to delete them first — check before shipping.

- [ ] **Step 2: Add `deleteInvoice` and `sendInvoiceReminder` to invoices.ts**

Append to the bottom of `volturaos/lib/actions/invoices.ts`:

```ts
export async function deleteInvoice(id: string): Promise<void> {
  'use server'
  const admin = createAdminClient()
  const { error } = await admin.from('invoices').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function sendInvoiceReminder(id: string): Promise<void> {
  'use server'
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('invoices')
    .select('id, total, customers(name, phone)')
    .eq('id', id)
    .single()
  if (error || !data) throw new Error('Invoice not found')
  const customer = data.customers as { name: string; phone: string | null } | null
  if (!customer?.phone) return // no phone on file, silently skip
  const { sendSMS } = await import('@/lib/sms')
  const body = `Hi ${customer.name.split(' ')[0]}, your invoice of $${(data.total as number).toLocaleString()} with Voltura Power Group is due. Please call or text us to arrange payment. Thank you!`
  await sendSMS(customer.phone, body, false)
}
```

- [ ] **Step 3: TypeScript check**

Run: `cd volturaos && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add volturaos/lib/actions/jobs.ts volturaos/lib/actions/invoices.ts
git commit -m "feat: add deleteJob, deleteInvoice, sendInvoiceReminder server actions"
```

---

## Task 5: Wire long-press into `JobCard`

**Files:**
- Modify: `volturaos/components/jobs/JobCard.tsx`

JobCard is currently a server component (no `'use client'`). Adding hooks requires making it a client component. It already receives all data as props so the rendering boundary change is safe.

- [ ] **Step 1: Rewrite JobCard with long-press**

Replace the full file contents:

```tsx
// volturaos/components/jobs/JobCard.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Job, JobStatus } from '@/types'
import { StatusPill } from '@/components/ui/StatusPill'
import { Calendar } from 'lucide-react'
import { STATUS_ACCENT } from '@/lib/constants/jobStatus'
import { useLongPress } from '@/hooks/useLongPress'
import { useActionSheet } from '@/components/ui/ActionSheetProvider'
import { deleteJob, updateJobStatus, sendCrewSMS } from '@/lib/actions/jobs'

interface JobCardProps {
  job: Job & { customer: { name: string }; invoiceTotal?: number | null }
}

// 'Lead' omitted — it's the initial creation status, not a field transition.
// 'Paid' omitted — it's set via invoice payment recording, not manual status change.
const JOB_STATUSES: JobStatus[] = ['Scheduled', 'In Progress', 'Completed', 'Invoiced', 'Cancelled']

export function JobCard({ job }: JobCardProps) {
  const router = useRouter()
  const { openSheet } = useActionSheet()

  const dateStr = job.scheduled_date
    ? new Date(job.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null
  const timeStr = job.scheduled_time ? job.scheduled_time.slice(0, 5) : null
  const accent = STATUS_ACCENT[job.status] ?? '#4b5563'
  const label = `${job.customer.name} — ${job.job_type}`

  function showSheet() {
    openSheet(label, [
      {
        icon: '✏️',
        label: 'Edit',
        onClick: () => router.push(`/jobs/${job.id}`),
      },
      {
        icon: '🔄',
        label: 'Change Status',
        onClick: () => {
          openSheet('Change Status', JOB_STATUSES.map((s) => ({
            icon: s === job.status ? '✅' : '○',
            label: s,
            onClick: async () => {
              await updateJobStatus(job.id, s)
              router.refresh()
            },
          })))
        },
      },
      {
        icon: '📱',
        label: 'Send Crew SMS',
        onClick: async () => {
          const crewPhone = typeof window !== 'undefined' ? localStorage.getItem('crewPhone') : null
          if (!crewPhone) {
            router.push(`/jobs/${job.id}`)
            return
          }
          await sendCrewSMS(job.id, crewPhone)
        },
      },
      {
        icon: '🗑️',
        label: 'Delete',
        onClick: async () => {
          await deleteJob(job.id)
          router.refresh()
        },
        destructive: true,
      },
    ])
  }

  const bind = useLongPress(showSheet)

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="relative flex items-stretch bg-volturaNavy/50 border border-white/5 rounded-2xl overflow-hidden active:scale-[0.98] transition-transform duration-100"
      {...bind}
    >
      {/* Left status strip */}
      <div className="w-[3px] flex-shrink-0" style={{ backgroundColor: accent }} />

      {/* Content */}
      <div className="flex-1 flex items-start justify-between p-4 min-w-0">
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-white font-semibold truncate">{job.customer.name}</p>
          <p className="text-gray-400 text-sm truncate">{job.job_type}</p>
          {dateStr && (
            <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
              <Calendar size={11} className="flex-shrink-0" />
              {dateStr}{timeStr ? ` at ${timeStr}` : ''}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <StatusPill status={job.status} />
          {job.invoiceTotal != null && (
            <p className="text-volturaGold font-bold text-sm">${job.invoiceTotal.toLocaleString()}</p>
          )}
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: TypeScript check**

Run: `cd volturaos && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add volturaos/components/jobs/JobCard.tsx
git commit -m "feat: add long-press action sheet to JobCard"
```

---

## Task 6: Wire long-press into `CustomerCard`

**Files:**
- Modify: `volturaos/components/customers/CustomerCard.tsx`

- [ ] **Step 1: Rewrite CustomerCard with long-press**

```tsx
// volturaos/components/customers/CustomerCard.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Customer } from '@/types'
import { useLongPress } from '@/hooks/useLongPress'
import { useActionSheet } from '@/components/ui/ActionSheetProvider'
import { deleteCustomer } from '@/lib/actions/customers'

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function CustomerCard({ customer, jobCount }: { customer: Customer; jobCount?: number }) {
  const router = useRouter()
  const { openSheet } = useActionSheet()
  const initials = getInitials(customer.name || '?')
  const isRepeat = jobCount != null && jobCount > 1

  function showSheet() {
    openSheet(customer.name, [
      {
        icon: '✏️',
        label: 'Edit',
        onClick: () => router.push(`/customers/${customer.id}`),
      },
      ...(customer.phone ? [{
        icon: '📞',
        label: `Call ${customer.name.split(' ')[0]}`,
        onClick: () => { window.location.href = `tel:${customer.phone}` },
      }] : []),
      {
        icon: '🗑️',
        label: 'Delete',
        onClick: async () => {
          await deleteCustomer(customer.id)
          router.refresh()
        },
        destructive: true,
      },
    ])
  }

  const bind = useLongPress(showSheet)

  return (
    <Link
      href={`/customers/${customer.id}`}
      className="flex items-center gap-3 bg-volturaNavy/50 border border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-transform duration-100"
      {...bind}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full border border-volturaGold/40 bg-volturaBlue flex items-center justify-center flex-shrink-0">
        <span className="text-volturaGold font-semibold text-sm leading-none">{initials}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-white font-semibold truncate">{customer.name}</p>
          {isRepeat && (
            <span className="flex-shrink-0 text-[10px] bg-volturaGold/20 text-volturaGold border border-volturaGold/30 px-1.5 py-0.5 rounded-full font-semibold">
              {getOrdinal(jobCount!)} job
            </span>
          )}
        </div>
        {customer.phone && <p className="text-gray-400 text-sm">{customer.phone}</p>}
        {customer.address && <p className="text-gray-500 text-xs mt-0.5 truncate">{customer.address}</p>}
      </div>

      {/* Property type badge */}
      <span className="text-xs bg-volturaNavy border border-white/5 px-2 py-0.5 rounded-full text-gray-400 capitalize flex-shrink-0">
        {customer.property_type}
      </span>
    </Link>
  )
}
```

- [ ] **Step 2: TypeScript check**

Run: `cd volturaos && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add volturaos/components/customers/CustomerCard.tsx
git commit -m "feat: add long-press action sheet to CustomerCard"
```

---

## Task 7: Wire long-press into `InvoiceList`

**Files:**
- Modify: `volturaos/components/invoices/InvoiceList.tsx`

InvoiceList already has `'use client'`. Invoice row items are inline `<Link>` elements — add the `useLongPress` bind to each row.

- [ ] **Step 1: Add imports and wire useLongPress to each invoice row**

Add these imports at the top of the file (after existing imports):

```ts
import { useLongPress } from '@/hooks/useLongPress'
import { useActionSheet } from '@/components/ui/ActionSheetProvider'
import { useRouter } from 'next/navigation'
import { deleteInvoice, sendInvoiceReminder } from '@/lib/actions/invoices'
```

Extract the invoice row into an inner component so it can call hooks:

Replace the `filtered.map((inv) => { ... })` block (lines 106–133 of InvoiceList.tsx) with a call to an `InvoiceRow` component defined in the same file, above `InvoiceList`:

```tsx
function InvoiceRow({ inv }: { inv: Invoice & { customer: { name: string } } }) {
  const router = useRouter()
  const { openSheet } = useActionSheet()
  const aging = getAgingInfo(inv)
  const borderColor = getLeftBorderColor(inv)

  function showSheet() {
    openSheet(`${inv.customer.name} — $${inv.total.toLocaleString()}`, [
      {
        icon: '✏️',
        label: 'Edit',
        onClick: () => router.push(`/invoices/${inv.id}`),
      },
      {
        icon: '💰',
        label: 'Record Payment',
        onClick: () => router.push(`/invoices/${inv.id}`),
      },
      {
        icon: '📨',
        label: 'Send Reminder',
        onClick: async () => {
          await sendInvoiceReminder(inv.id)
        },
      },
      {
        icon: '🗑️',
        label: 'Delete',
        onClick: async () => {
          await deleteInvoice(inv.id)
          router.refresh()
        },
        destructive: true,
      },
    ])
  }

  const bind = useLongPress(showSheet)

  return (
    <Link
      key={inv.id}
      href={`/invoices/${inv.id}`}
      className="relative flex items-stretch bg-volturaNavy/50 border border-white/5 rounded-2xl overflow-hidden active:scale-[0.98] transition-transform duration-100"
      {...bind}
    >
      <div className="w-[3px] flex-shrink-0" style={{ backgroundColor: borderColor }} />
      <div className="flex-1 flex items-start justify-between p-4">
        <div>
          <p className="text-white font-semibold">{inv.customer.name}</p>
          <p className="text-gray-500 text-xs mt-1">
            {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
          {aging && (
            <p className={`text-xs mt-1 font-semibold ${aging.color}`}>{aging.label}</p>
          )}
        </div>
        <div className="text-right">
          <StatusPill status={inv.status} />
          <p className="text-volturaGold font-bold text-sm mt-1">${inv.total.toLocaleString()}</p>
          {inv.balance > 0 && inv.status !== 'Unpaid' && (
            <p className="text-red-400 text-xs">${inv.balance.toLocaleString()} due</p>
          )}
        </div>
      </div>
    </Link>
  )
}
```

Then in the `filtered.map` inside `InvoiceList`, replace the entire `<Link>` JSX with:

```tsx
{filtered.map((inv) => <InvoiceRow key={inv.id} inv={inv} />)}
```

- [ ] **Step 2: TypeScript check**

Run: `cd volturaos && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add volturaos/components/invoices/InvoiceList.tsx
git commit -m "feat: add long-press action sheet to invoice rows"
```

---

## Task 8: Extract `EstimateGroupCard` + wire into estimates page

**Files:**
- Create: `volturaos/components/estimates/EstimateGroupCard.tsx`
- Modify: `volturaos/app/(app)/estimates/page.tsx`

The estimates page is a server component and cannot use hooks. Extract the group card rendering into a `'use client'` component.

- [ ] **Step 1: Create EstimateGroupCard**

```tsx
// volturaos/components/estimates/EstimateGroupCard.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Estimate, EstimateStatus } from '@/types'
import { StatusPill } from '@/components/ui/StatusPill'
import { useLongPress } from '@/hooks/useLongPress'
import { useActionSheet } from '@/components/ui/ActionSheetProvider'
import { deleteEstimate, duplicateEstimate } from '@/lib/actions/estimates'

type EstimateWithCustomer = Estimate & { customer: { name: string } }

interface EstimateGroupCardProps {
  group: EstimateWithCustomer[]
  status: EstimateStatus
}

export function EstimateGroupCard({ group, status }: EstimateGroupCardProps) {
  const router = useRouter()
  const { openSheet } = useActionSheet()

  const anchor = group[0]
  const isGrouped = group.length > 1
  const maxTotal = Math.max(...group.map((e) => e.total ?? 0))
  const names = group.map((e) => e.name ?? 'Estimate').join(' · ')
  const hasFollowUp = anchor.follow_up_sent_at && !anchor.follow_up_dismissed && anchor.status === 'Sent'
  const label = `${anchor.customer?.name ?? 'Unknown'} — ${anchor.name ?? 'Estimate'}`

  function showSheet() {
    openSheet(label, [
      {
        icon: '✏️',
        label: 'Edit',
        onClick: () => router.push(`/estimates/${anchor.id}`),
      },
      {
        icon: '📋',
        label: 'Duplicate',
        onClick: async () => {
          await duplicateEstimate(anchor.id)
          router.refresh()
        },
      },
      {
        icon: '🗑️',
        label: 'Delete',
        onClick: async () => {
          await deleteEstimate(anchor.id)
          router.refresh()
        },
        destructive: true,
      },
    ])
  }

  const bind = useLongPress(showSheet)

  return (
    <Link
      href={`/estimates/${anchor.id}`}
      className="block bg-volturaNavy/50 border border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-transform duration-100"
      {...bind}
    >
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
}
```

- [ ] **Step 2: Update estimates page to use EstimateGroupCard**

In `volturaos/app/(app)/estimates/page.tsx`, add the import and replace the `<Link ...>` JSX in the `groups.map` with `<EstimateGroupCard>`.

Add import after existing imports:
```ts
import { EstimateGroupCard } from '@/components/estimates/EstimateGroupCard'
```

Replace the `groups.map` block (starting at `{groups.map((group) => {`) with:

```tsx
{groups.map((group) => {
  const anchor = group[0]
  const status = groupStatus(group)
  return (
    <EstimateGroupCard key={anchor.id} group={group} status={status} />
  )
})}
```

Remove the now-unused variables (`isGrouped`, `maxTotal`, `names`, `hasFollowUp`) from the map function since they're now inside `EstimateGroupCard`. Also remove the `Link` import if it's no longer used elsewhere in the file.

- [ ] **Step 3: TypeScript check**

Run: `cd volturaos && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add volturaos/components/estimates/EstimateGroupCard.tsx volturaos/app/\(app\)/estimates/page.tsx
git commit -m "feat: add long-press action sheet to estimate group cards"
```

---

## Task 9: Final integration check + push

- [ ] **Step 1: Full TypeScript check**

Run: `cd volturaos && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 2: Verify dev server starts**

Run: `cd volturaos && npm run dev`
Expected: compiles without errors on port 3000

- [ ] **Step 3: Manual smoke test**

Navigate to each list in the browser:
- `/jobs` — long-press a job card → sheet appears with Edit, Change Status, Send Crew SMS, Delete
- `/customers` — long-press a customer card → sheet appears with Edit, Call (if phone set), Delete  
- `/invoices` — long-press an invoice row → sheet appears with Edit, Record Payment, Send Reminder, Delete
- `/estimates` — long-press an estimate card → sheet appears with Edit, Duplicate, Delete
- Right-click any card on desktop → same sheet appears
- Tap "Delete" → confirmation view appears with Confirm Delete / Cancel
- Tap backdrop → sheet closes
- Short tap card → navigates normally (sheet does not appear)

- [ ] **Step 4: Push to Vercel**

```bash
git push origin master
```

---

## Notes for Implementer

**Cascade deletes:** `deleteJob` and `deleteInvoice` call `.delete()` on Supabase. If the DB schema does not have `ON DELETE CASCADE` on child tables (`job_materials`, `invoice_payments`), these will fail with a FK violation. Check in Supabase Table Editor before shipping. If needed, manually delete children first in the action.

**`sendCrewSMS` crew phone:** If `localStorage.getItem('crewPhone')` is null, the action navigates to the job detail page where the existing `SendToCrewButton` component handles first-time crew phone entry.

**`sendInvoiceReminder` — customer with no phone:** The action silently returns if the customer has no phone on file. No error is surfaced to the user. Consider a toast in the future.

**Portal SSR:** `createPortal` is called inside `ActionSheetProvider` with a guard `typeof document !== 'undefined'`. This prevents the portal from running during SSR while still working on the client.
