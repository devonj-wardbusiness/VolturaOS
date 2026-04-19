# UX Polish Pass — Design Spec

> **For agentic workers:** Use superpowers:executing-plans to implement this plan.

**Goal:** Fix the four highest-impact UX friction points identified in the code audit: double-tap protection gaps, missing `force-dynamic` on 10 pages, missing empty states on 2 settings pages, and unreadable AI error messages.

**Approach:** Surgical targeted fixes. No new abstractions, no new components (except using the existing `EmptyState`). Every change is isolated to the file it affects. Zero behavior changes to existing working features.

**Priority order:** A (double-tap) → C (force-dynamic) → D (empty states) → B (error messages)

---

## Files Changed

### A — Double-tap protection
- Modify: `components/jobs/JobDetail.tsx` — audit all async buttons
- Modify: `components/customers/CustomerDetail.tsx` — fix maintenance Cancel button (confirmed gap: line ~107)
- Modify: `components/invoices/InvoiceList.tsx` — audit async action buttons
- Modify: `components/estimates/EstimateGroupCard.tsx` — audit delete/duplicate buttons

### C — Missing `force-dynamic`
Add `export const dynamic = 'force-dynamic'` as the first line to each of these 10 pages:
- `app/(app)/page.tsx`
- `app/(app)/customers/[id]/page.tsx`
- `app/(app)/customers/new/page.tsx`
- `app/(app)/estimates/[id]/page.tsx`
- `app/(app)/invoices/[id]/page.tsx`
- `app/(app)/invoices/new/page.tsx`
- `app/(app)/jobs/new/page.tsx`
- `app/(app)/search/page.tsx`
- `app/(app)/tools/load-calc/page.tsx`
- `app/(app)/tools/quick-quote/page.tsx`

### D — Empty states
- Modify: `app/(app)/settings/pricebook/page.tsx`
- Modify: `app/(app)/settings/templates/page.tsx`

### B — AI error messages
- Modify: `app/api/ai/route.ts`

---

## A — Double-Tap Protection

### Confirmed gap
`components/customers/CustomerDetail.tsx` — the maintenance plan Cancel button (~line 118) renders "Cancel" in both idle and loading states. The button has `disabled={agreementPending}` correctly, but the label never changes. Fix the text content only:

```tsx
// Before (line ~118) — static text, no loading feedback
Cancel

// After
{agreementPending ? 'Cancelling…' : 'Cancel'}
```

### Sweep pattern
For every `<button>` with an async `onClick` across JobDetail, InvoiceList, EstimateGroupCard:
- Must have `disabled={isPending}` (or equivalent loading boolean)
- Must show different text or a visual indicator when loading
- The loading boolean must be set to `true` BEFORE the async call and `false` in `finally`

**Standard pattern to apply where missing:**
```tsx
const [isPending, setIsPending] = useState(false)

async function handleAction() {
  setIsPending(true)
  try {
    await someAction()
  } finally {
    setIsPending(false)
  }
}

<button onClick={handleAction} disabled={isPending}>
  {isPending ? 'Working…' : 'Do Thing'}
</button>
```

**Already correct — do not touch:**
- `PaymentForm.tsx` ✓
- `NewInvoiceForm.tsx` ✓
- `QuickAddForm.tsx` ✓
- `CustomerDetail.tsx` delete button ✓
- `EstimateBuilder.tsx` all action buttons ✓
- `JobDetail.tsx` status change buttons (uses `useTransition`) ✓

---

## C — Missing `force-dynamic`

Add exactly this line as the **very first line** of each of the 10 files listed above:

```ts
export const dynamic = 'force-dynamic'
```

**Why this matters:** Without it, Vercel may cache the page at build time and serve stale data. On a detail page (`/customers/[id]`, `/invoices/[id]`, etc.) this means you could see old customer info or a stale invoice total after updating it. On a form page (`/customers/new`, `/invoices/new`) it prevents the pricebook or customer list from updating.

**Already correct — do not touch:**
- `app/(app)/estimates/page.tsx` ✓
- `app/(app)/jobs/page.tsx` ✓
- `app/(app)/invoices/page.tsx` ✓
- `app/(app)/customers/page.tsx` ✓
- `app/(app)/settings/pricebook/page.tsx` ✓
- `app/(app)/settings/templates/page.tsx` ✓
- `app/(app)/tools/nec/page.tsx` ✓

---

## D — Empty States

### Pricebook page (`app/(app)/settings/pricebook/page.tsx`)
Currently renders `<PricebookTable entries={entries} />` unconditionally. When `entries` is empty the table renders blank with no guidance.

Fix — wrap with conditional:
```tsx
{entries.length === 0 ? (
  <EmptyState
    message="No pricebook items yet — add your first service or material"
    ctaLabel="+ Add Item"
    ctaHref="/settings/pricebook/new"
  />
) : (
  <PricebookTable entries={entries} />
)}
```

Import `EmptyState` from `@/components/ui/EmptyState`.

### Templates page (`app/(app)/settings/templates/page.tsx`)
Currently renders a bare text paragraph when `templates` is empty. Replace with the `EmptyState` component:

```tsx
// Before (plain text, no CTA — actual current text on line 13)
<p className="text-gray-500 text-sm">No templates yet. Open any estimate and tap 🔖 to save it as a template.</p>

// After (uses EmptyState, consistent with rest of app)
<EmptyState
  message="No templates yet — open any estimate and tap 🔖 to save one"
/>
```

No CTA button needed — creating a template requires opening an estimate first, so there's no direct "new template" page to link to.

---

## B — AI Error Messages

**File:** `app/api/ai/route.ts`

Current behavior in the catch block:
```ts
const msg = error instanceof Anthropic.APIError
  ? `AI error (${error.status}): ${error.message}`
  : 'AI service unavailable'
```

This leaks raw API error messages like `"AI error (400): invalid_request_error"` into the chat UI.

**Fix — replace with status-based translator:**
```ts
function friendlyAIError(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    switch (error.status) {
      case 401:
      case 403:
        return 'AI authentication error — please contact support'
      case 429:
        return 'AI is busy right now — wait a moment and try again'
      case 500:
      case 529:
        return 'AI service is temporarily down — try again in a minute'
      default:
        return 'Something went wrong with the AI — try again'
    }
  }
  return 'Could not reach the AI service — check your connection'
}
```

Then use it in the catch block:
```ts
controller.enqueue(encoder.encode(`\n\n[Error: ${friendlyAIError(error)}]`))
```

The error display in `StreamingResponse.tsx` already renders `[Error: ...]` lines in red — no changes needed there.

---

## What This Does NOT Change

- Zero changes to server actions
- Zero changes to DB queries
- Zero new components (uses existing `EmptyState`)
- Zero changes to routes or navigation
- No changes to estimate builder (just refactored)
- No changes to the public estimate/invoice view pages
