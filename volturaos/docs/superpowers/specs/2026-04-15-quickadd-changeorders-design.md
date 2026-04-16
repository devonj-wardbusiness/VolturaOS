# Design: Quick-Add + Change Orders

**Date:** 2026-04-15  
**Status:** Approved  
**Author:** Devon Ward (brainstormed with Claude)

---

## Problem

Building an estimate while talking to a customer on-site is too slow. Finding the right line item requires navigating category menus — multiple taps that break conversation flow and eye contact. This is the #1 friction point in the field.

A second problem: when a signed estimate needs additional work (e.g. diagnostic call uncovers a burnt splice in the attic), there is no way to add to the authorized scope. Devon must either invoice for undocumented work or start over. This creates liability exposure and unprofessional-looking records.

---

## Goals

1. Add line items to an estimate in under 5 seconds without breaking conversation
2. Support voice input so Devon can keep eye contact with the customer
3. Allow signed estimates to be extended with a formal change order
4. Capture a second customer signature on change order work before proceeding
5. Preserve both original and change order signatures as separate records

---

## Out of Scope

- PDF export of change orders (can be added later)
- Customer-initiated change order requests
- Multi-technician assignment
- Offline/PWA support

---

## Pre-flight Migrations

Run both of these in the Supabase SQL Editor **before starting any code**:

```sql
-- 1. Add recency tracking to pricebook
ALTER TABLE pricebook
  ADD COLUMN IF NOT EXISTS use_count    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- 2. Create change_orders table
CREATE TABLE IF NOT EXISTS change_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  estimate_id     UUID REFERENCES estimates(id) ON DELETE SET NULL,
  line_items      JSONB NOT NULL DEFAULT '[]',
  total           NUMERIC NOT NULL DEFAULT 0,
  signature_data  TEXT,
  status          TEXT NOT NULL DEFAULT 'Draft',  -- Draft | Pending | Signed
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

---

## Architecture

### Feature 1 — Quick-Add Sheet

A `QuickAddSheet` bottom sheet component replaces the existing category grid navigation inside `EstimateBuilder`. It is also reused inside `ChangeOrderBuilder`.

**Three tabs, layered:**

| Tab | Default? | Mechanism | Fallback |
|-----|----------|-----------|----------|
| 🎤 Voice | Yes | Web Speech API → Claude API → pricebook match | Falls through to Search tab |
| 🔍 Search | No | Supabase `ilike '%query%'` on `pricebook.job_type` | None |
| ⏱ Recents | No | Top 6 `pricebook` rows `ORDER BY use_count DESC, last_used_at DESC` | Empty state with prompt to add items |

**`QuickAddSheet` component interface:**

```typescript
interface QuickAddSheetProps {
  open: boolean
  onClose: () => void
  onAdd: (items: LineItem[]) => void   // LineItem from types/index.ts
  initialRecents: PricebookEntry[]     // passed from parent server page — top 6 by use_count
}
```

Items returned via `onAdd` must conform to `LineItem` from `types/index.ts`:
```typescript
{ description: string, price: number, is_override: false, original_price: number, tier: 'better', category: string }
```
`description` = `entry.job_type`, `price` = `entry.price_better ?? 0`, `original_price` = same as price, `tier` = `'better'`.

---

**Voice flow:**
1. User holds mic button → Web Speech API records transcript
2. On `speechend` → transcript sent to `POST /api/voice-line-items`
3. Route trims pricebook to `{ id, job_type, price_better, category }[]` — no descriptions or flags — to minimize tokens
4. Route calls `claude-sonnet-4-20250514` with transcript + trimmed pricebook
5. Claude returns `{ id: string, qty: number }[]` — pricebook IDs only, no hallucinated items
6. Route resolves full `PricebookEntry` from returned IDs and builds `LineItem[]` response
7. Proposed items shown with prices — user taps "Add N Items" to confirm
8. On confirm → `incrementPricebookUseCount(ids[])` called

If Web Speech API is unavailable, Voice tab is hidden and Search tab is shown as default. Detection must check both the standard and webkit-prefixed variants (Chrome for Android exposes `webkitSpeechRecognition`, not `SpeechRecognition`):

```typescript
const supported = typeof window !== 'undefined' &&
  (typeof (window as any).SpeechRecognition !== 'undefined' ||
   typeof (window as any).webkitSpeechRecognition !== 'undefined')

// Instantiate with fallback:
const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
```

---

**Search flow:**
1. Input with 200ms debounce
2. Queries `pricebook` table via server action: `ilike '%query%'` on `job_type`, filtered to `active = true`
3. Results show `job_type`, `category`, `price_better`, and `+ Add` button
4. Tap `+ Add` → `onAdd([lineItem])` called immediately, `incrementPricebookUseCount([id])` called

---

**Recents flow:**
1. Parent server page fetches `getRecentPricebookItems(6)` and passes as `initialRecents` prop to `QuickAddSheet`
2. Shown as tap-once chips: `+ 200A Panel`, `+ EV Charger`, etc.
3. Tap → `onAdd([lineItem])` + `incrementPricebookUseCount([id])`
4. Re-ordering within an open sheet session is not live — recents re-sort on next sheet open

---

### Feature 2 — Change Orders

A change order is additional work added to a job after the original estimate has been signed. It captures a separate customer signature.

**Entry point:** Job detail page (`/jobs/[id]`) shows "Add Change Order" button when:
- Job status is `Scheduled`, `In Progress`, or `Completed`
- Job has a linked estimate with `status = 'Approved'` (signed)

The job detail server page must call a new action `getSignedEstimateForJob(jobId: string): Promise<{ id: string; total: number; name: string } | null>` (add to `lib/actions/estimates.ts`) which queries `estimates` for `job_id = jobId AND status = 'Approved'` returning the first match or null. The button is shown only when this returns non-null.

**Change order builder route:** `app/(app)/jobs/[id]/change-order/new/page.tsx`
- Server page, renders `ChangeOrderBuilder` client component
- On load: calls `createChangeOrder(jobId, estimateId)` → creates Draft record → redirects to `/jobs/[id]/change-order/[coId]`

**Edit route:** `app/(app)/jobs/[id]/change-order/[coId]/page.tsx`
- Renders `ChangeOrderBuilder` with existing Draft record
- Context banner: *"Adding to: [estimate name] · Original: $X · Signed"*
- Build additional line items using `QuickAddSheet` (same component)
- Shows: change order subtotal + new combined job total
- Tap "Present to Customer" → sets status to `Pending`, navigates to public sign URL

**Public sign page:** `app/change-orders/[id]/view/page.tsx` (outside `(app)` group — no layout wrapper)
- Server page fetching change order + original estimate + customer
- Renders `ChangeOrderSignClient` client component (client boundary — same pattern as `app/estimates/[id]/view/`)
- `ChangeOrderSignClient` renders:
  - Original estimate items (greyed, with "Already authorized" label)
  - Change order line items prominently
  - Combined total
  - `InPersonSignature` canvas (existing component, reused)
  - "Authorize Change Order" button → calls `signChangeOrder(id, signatureData)`
- **Auth note:** This page is public (no auth, consistent with rest of app). Anyone with the UUID can submit a signature. This is an accepted known risk matching the existing estimate sign page. Change order UUIDs are not guessable.

**After signing:** Status → `Signed`, Telegram fires, redirect to confirmation screen.

---

### Invoice Integration

**Modified action:** `createInvoiceFromEstimate(estimateId)` in `lib/actions/invoices.ts`

When called, it must:
1. Fetch the estimate (existing)
2. Fetch `change_orders` for `estimate.job_id` where `status = 'Signed'`
3. Merge line items: original estimate items + change order items (with a separator label `{ description: '— Additional Work —', price: 0 }` between them)
4. Sum totals: `invoice.total = estimate.total + sum(signedChangeOrders.map(co => co.total))`
5. Insert invoice with merged line items and combined total

The existing select uses `*` so `est.job_id` will be present in the response. The implementation must explicitly null-guard before querying change orders:

```typescript
const jobId = est.job_id as string | null
if (jobId) {
  // fetch and merge signed change orders
}
// else: skip — invoice total = estimate total only, behavior unchanged
```

If `estimate.job_id` is null, no change orders are fetched and behavior is unchanged from current.

---

## New Components

| Component | Type | Location | Purpose |
|-----------|------|----------|---------|
| `QuickAddSheet` | client | `components/estimate-builder/QuickAddSheet.tsx` | Bottom sheet — Voice / Search / Recents tabs |
| `VoiceLineItems` | client | `components/estimate-builder/VoiceLineItems.tsx` | Mic button, transcript display, proposed items confirm |
| `LineItemSearch` | client | `components/estimate-builder/LineItemSearch.tsx` | Debounced pricebook search |
| `RecentsRow` | client | `components/estimate-builder/RecentsRow.tsx` | Top-6 chips by use_count — receives `initialRecents` prop |
| `ChangeOrderBuilder` | client | `components/jobs/ChangeOrderBuilder.tsx` | Mini estimate builder for additional work, uses QuickAddSheet |
| `ChangeOrderSignClient` | client | `components/jobs/ChangeOrderSignClient.tsx` | Signature canvas wrapper for public sign page |

## New Server Actions

**`lib/actions/change-orders.ts`** (new file):

| Function | Signature | Description |
|----------|-----------|-------------|
| `createChangeOrder` | `(jobId: string, estimateId: string) => Promise<ChangeOrder>` | Creates Draft record |
| `updateChangeOrderItems` | `(id: string, lineItems: LineItem[], total: number) => Promise<void>` | Saves items during build |
| `signChangeOrder` | `(id: string, signatureData: string) => Promise<void>` | Sets Signed + fires Telegram |
| `getChangeOrder` | `(id: string) => Promise<ChangeOrder & { job, estimate, customer }>` | Fetch with relations |
| `listChangeOrdersForJob` | `(jobId: string) => Promise<ChangeOrder[]>` | All COs for a job |

**`lib/actions/pricebook.ts`** (additions):

| Function | Signature | Description |
|----------|-----------|-------------|
| `getRecentPricebookItems` | `(limit: number) => Promise<PricebookEntry[]>` | Top-N by use_count |
| `incrementPricebookUseCount` | `(ids: string[]) => Promise<void>` | Batch increment use_count + last_used_at |
| `searchPricebook` | `(query: string) => Promise<PricebookEntry[]>` | ilike on job_type, active only |

## New API Route

| Route | Method | Purpose |
|-------|--------|---------|
| `app/api/voice-line-items/route.ts` | POST | Body: `{ transcript: string, pricebook: { id, job_type, price_better, category }[] }` → returns `LineItem[]` matched by Claude |

## New Type

Add to `types/index.ts`:

```typescript
export interface ChangeOrder {
  id: string
  job_id: string
  estimate_id: string | null
  line_items: LineItem[]
  total: number
  signature_data: string | null
  status: 'Draft' | 'Pending' | 'Signed'
  notes: string | null
  created_at: string
}
```

---

## EstimateBuilder Changes

- Remove: `CategoryGrid` / `CategorySheet` as the primary add-item entry point
- Add: `<QuickAddSheet open={qaOpen} onClose={() => setQaOpen(false)} onAdd={appendLineItems} initialRecents={initialRecents} />`
- Add: `initialRecents: PricebookEntry[]` prop to `EstimateBuilder`
- Parent server page (`/estimates/[id]/page.tsx`) fetches `getRecentPricebookItems(6)` and passes down
- `appendLineItems` merges new items into existing `lineItems` state, then calls `incrementPricebookUseCount`

---

## Telegram Notifications

- Change order created: `📋 Change order created — [customer] — [job type]`
- Change order signed: `✅ Change order signed — [customer] — $[amount]`

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Voice API call fails (network/Claude error) | Show "Couldn't match — try typing" banner, auto-switch to Search tab |
| Web Speech API unavailable | Voice tab hidden; Search tab shown as default |
| No pricebook items match voice input | Show "No matches found — try typing or add manually" with search pre-filled from transcript |
| Change order sign page accessed after already signed | Show signed confirmation state, hide canvas and submit button |
| Job has no linked signed estimate | "Add Change Order" button not shown |
| `estimate.job_id` is null on invoice creation | Skip change order query, invoice total = estimate total only |

---

## Testing Checklist

- [ ] Voice tab: transcript → Claude match → items added to estimate with correct LineItem shape
- [ ] Voice tab: API failure → error banner shown → auto-switches to Search tab
- [ ] Voice tab: Web Speech unavailable → Voice tab hidden, Search shown as default
- [ ] Search tab: 2-letter query → pricebook results within 300ms, active items only
- [ ] Recents tab: shows top 6 by use_count from `initialRecents` prop
- [ ] `use_count` and `last_used_at` increment in DB after items added via any tab
- [ ] Recents re-sort correctly on next sheet open (not live within session)
- [ ] Change order creates with Draft status linked to correct job + estimate
- [ ] Change order builder shows original estimate context banner with correct total
- [ ] Change order sign page: original items greyed, new items prominent, combined total correct
- [ ] Signature saves to `change_orders.signature_data`, status → Signed
- [ ] `createInvoiceFromEstimate`: invoice total includes signed change order totals
- [ ] `createInvoiceFromEstimate`: invoice line items include separator label between original + CO items
- [ ] "Add Change Order" button only visible when job has signed estimate
- [ ] Telegram fires on CO created and CO signed
- [ ] CO sign page shows confirmation state if already signed (no re-sign)
