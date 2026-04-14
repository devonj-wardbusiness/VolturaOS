# Long-Press Action Sheet — Design Spec

**Date:** 2026-04-13  
**Status:** Approved

---

## Overview

Every tappable card in the app (Jobs, Customers, Invoices, Estimates) gets a long-press (500ms hold) context menu that slides up as a bottom action sheet. Right-click on desktop triggers the same sheet. This replaces the need to navigate to a detail page just to delete or perform a quick action.

---

## Architecture

### 1. `hooks/useLongPress.ts`

A reusable hook that wraps any card element and fires a callback when:
- **Touch:** `touchstart` held for 500ms without `touchmove` (>10px cancels the timer)
- **Desktop:** `contextmenu` event (right-click)

Returns a `bind` object with `onTouchStart`, `onTouchMove`, `onTouchEnd`, `onContextMenu` handlers to spread onto the card element.

Fires `navigator.vibrate(40)` on trigger for haptic feedback.

Prevents the native browser context menu via `e.preventDefault()` on `contextmenu`.

```ts
function useLongPress(onLongPress: () => void, delay = 500): LongPressHandlers
```

### 2. `components/ui/ActionSheet.tsx`

A bottom sheet modal with:
- Full-screen semi-transparent backdrop (`bg-black/60 backdrop-blur-sm`) — tapping closes the sheet
- White pill handle at top
- Card label at top (e.g. customer name or job type) for confirmation context
- Action rows: full-width, `React.ReactNode` icon left + label, `active:bg-white/5` press state
- Delete action always last, always red (`text-red-400`)
- Slide-up animation via CSS transform (`translate-y-full` → `translate-y-0`)
- Renders in a portal (`document.body`) to escape card stacking contexts

```tsx
interface ActionSheetProps {
  label: string
  actions: ActionItem[]
  onClose: () => void
}

interface ActionItem {
  icon: React.ReactNode   // emoji string or Lucide <Icon /> component
  label: string
  onClick: () => void
  destructive?: boolean
}
```

### 3. `ActionSheetProvider` (state management)

A `'use client'` context provider. It is imported into `app/(app)/layout.tsx` and wraps `children` as a **client boundary** — `layout.tsx` itself must remain an `async` server component with `export const dynamic = 'force-dynamic'`. Do NOT add `'use client'` to `layout.tsx`; doing so would break dynamic rendering for all pages under `(app)/`.

```tsx
const { openSheet } = useActionSheet()
openSheet('Johnson Panel Upgrade', [
  { icon: '✏️', label: 'Edit', onClick: () => router.push('/jobs/123') },
  { icon: <Trash2 size={16} />, label: 'Delete', onClick: handleDelete, destructive: true },
])
```

---

## Actions Per Card Type

### Jobs (`JobCard`)

`JobCard` is currently a server component. Adding `useLongPress` requires adding `'use client'` to `JobCard.tsx`. This changes its rendering boundary — it will be rendered on the client, which is acceptable since it already receives serialized job data as props.

| Action | Behavior |
|--------|----------|
| Edit | Navigate to `/jobs/[id]` |
| Change Status | Secondary sheet with status options: Scheduled, In Progress, Completed, Invoiced |
| Send Crew SMS | Calls existing `sendCrewSMS` action (uses crew number from localStorage) |
| Delete | Confirms, calls new `deleteJob(id)`, refreshes list |

### Customers (`CustomerCard`)

`CustomerCard` is currently a server component. Adding `useLongPress` requires adding `'use client'` to `CustomerCard.tsx`.

| Action | Behavior |
|--------|----------|
| Edit | Navigate to `/customers/[id]` |
| Call | Opens `tel:` link |
| Delete | Confirms, calls existing `deleteCustomer(id)`, refreshes list |

### Invoices (rows in `InvoiceList`)

`InvoiceList` already has `'use client'` — no change needed.

| Action | Behavior |
|--------|----------|
| Edit | Navigate to `/invoices/[id]` |
| Record Payment | Navigate to `/invoices/[id]` (payment section is on detail page) |
| Send Reminder | Calls new `sendInvoiceReminder(id)` action (sends SMS to customer phone) |
| Delete | Confirms, calls new `deleteInvoice(id)`, refreshes list |

### Estimates (`EstimateGroupCard` — new component)

The estimates list page (`app/(app)/estimates/page.tsx`) is an `async` server component with `export const dynamic = 'force-dynamic'`. It cannot receive hooks directly. The proposal group card rendering must be extracted into a new `'use client'` component `EstimateGroupCard` that the server page renders. Do NOT add `'use client'` to the page file itself.

The estimates list renders **proposal group cards** (one card per `proposal_id`, linking to the anchor estimate). Long-press on a proposal group card acts on the **anchor estimate only** (the first/only estimate in the group). This is safe — `deleteEstimate` removes only that one estimate record, not sibling estimates in the group.

| Action | Behavior |
|--------|----------|
| Edit | Navigate to `/estimates/[id]` (anchor estimate) |
| Duplicate | Calls existing `duplicateEstimate(id)`, refreshes list |
| Delete | Confirms, calls existing `deleteEstimate(id)`, refreshes list |

---

## New Server Actions Required

**`lib/actions/jobs.ts`**
```ts
export async function deleteJob(id: string): Promise<void>
// Hard deletes the job. job_materials and time_entries cascade via FK on delete.
```

**`lib/actions/invoices.ts`**
```ts
export async function deleteInvoice(id: string): Promise<void>
// Hard deletes the invoice. invoice_payments cascade via FK on delete.

export async function sendInvoiceReminder(id: string): Promise<void>
// Fetches invoice + customer phone, sends an SMS reminder via the existing
// Twilio sendSMS utility: "Hi [name], your invoice of $[total] is due. [link]"
```

---

## Confirmation Pattern

Destructive actions (Delete) show a confirmation state **within the sheet itself** — not a `window.confirm()` dialog:

1. User taps "Delete" → sheet body replaces action list with:  
   *"Delete [label]? This cannot be undone."*  
   Two buttons: red **Confirm Delete** and gray **Cancel**
2. Tapping Confirm Delete calls the server action, closes the sheet, calls `router.refresh()`
3. Tapping Cancel returns to the action list

Confirmation message template: `"Delete ${label}? This cannot be undone."`

---

## "Change Status" Sub-Sheet (Jobs only)

Tapping "Change Status" replaces the action list with a status picker (same sheet, swapped content):
- Scheduled
- In Progress  
- Completed
- Invoiced
- Cancelled

Selecting a status calls the existing `updateJobStatus(id, status)` action, closes the sheet, calls `router.refresh()`.

---

## Files to Create / Modify

### New files
- `volturaos/hooks/useLongPress.ts`
- `volturaos/components/ui/ActionSheet.tsx`
- `volturaos/components/ui/ActionSheetProvider.tsx`
- `volturaos/components/estimates/EstimateGroupCard.tsx` — `'use client'` component extracted from estimates page to hold long-press logic

### Modified files
- `volturaos/app/(app)/layout.tsx` — import `ActionSheetProvider` and wrap `children` in it (keep layout as server component — do NOT add `'use client'`)
- `volturaos/components/jobs/JobCard.tsx` — add `'use client'`, add long-press bind + openSheet call
- `volturaos/components/customers/CustomerCard.tsx` — add `'use client'`, add long-press bind + openSheet call
- `volturaos/components/invoices/InvoiceList.tsx` — add long-press bind + openSheet call per row (already `'use client'`)
- `volturaos/app/(app)/estimates/page.tsx` — render `EstimateGroupCard` instead of inline `<Link>` (do NOT add `'use client'` — keep `export const dynamic = 'force-dynamic'`)
- `volturaos/lib/actions/jobs.ts` — add `deleteJob`
- `volturaos/lib/actions/invoices.ts` — add `deleteInvoice`, `sendInvoiceReminder`

---

## Visual Design

Consistent with the app's dark glass aesthetic:
- Sheet background: `bg-[#0D0F1A] border-t border-white/10 rounded-t-2xl`
- Backdrop: `bg-black/60 backdrop-blur-sm`
- Action rows: `py-4 px-5 flex items-center gap-4 border-b border-white/5 text-white`
- Destructive row: `text-red-400`
- Label header: `text-gray-400 text-xs uppercase tracking-wider px-5 pt-4 pb-2`
- Animate: `transition-transform duration-250 ease-out`

---

## Out of Scope

- Long-press on dashboard KPI cards (navigation only, no CRUD)
- Long-press on line items within estimate/invoice detail pages (handled by existing UI)
- Bulk selection / multi-delete
- Drag-to-reorder
