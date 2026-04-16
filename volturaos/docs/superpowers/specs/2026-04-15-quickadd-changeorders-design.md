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

## Architecture

### Feature 1 — Quick-Add Sheet

A `QuickAddSheet` bottom sheet component replaces the existing category grid navigation inside `EstimateBuilder`. It is also reused inside `ChangeOrderBuilder`.

**Three tabs, layered:**

| Tab | Default? | Mechanism | Fallback |
|-----|----------|-----------|----------|
| 🎤 Voice | Yes | Web Speech API → Claude API → pricebook match | Falls through to Search |
| 🔍 Search | No | Supabase full-text / ilike on pricebook_items | None |
| ⏱ Recents | No | Top 6 pricebook_items ORDER BY use_count DESC | Empty state |

**Voice flow:**
1. User holds mic button → Web Speech API records transcript
2. On release → transcript sent to `/api/voice-line-items` (new route)
3. Route sends transcript + full pricebook to Claude (claude-sonnet-4-20250514)
4. Claude returns array of `{ name, price, qty }` matched to real pricebook items
5. Proposed items shown with prices — user taps "Add N Items" to confirm
6. On confirm → `use_count` incremented for each added pricebook item

**Search flow:**
1. Input with 200ms debounce
2. Queries `pricebook_items` via `ilike '%query%'` on name
3. Results show name, category, price, and `+ Add` button
4. Tap `+ Add` → item added to estimate line items immediately

**Recents flow:**
1. On sheet open → load top 6 `pricebook_items` by `use_count DESC, last_used_at DESC`
2. Shown as tap-once chips: `+ 200A Panel`, `+ EV Charger`, etc.
3. Tap → item added instantly, sheet stays open for more adds

---

### Feature 2 — Change Orders

A change order is additional work added to a job after the original estimate has been signed. It captures a separate customer signature.

**Entry point:** Job detail page (`/jobs/[id]`) shows an "Add Change Order" button when the job has a signed estimate and status is `Scheduled`, `In Progress`, or `Completed`.

**Change order builder flow:**
1. Tap "Add Change Order" on job detail
2. Opens `ChangeOrderBuilder` — pre-linked to `job_id` and `estimate_id`
3. Context banner shows: *"Adding to: [original job title] · Original: $X · Signed"*
4. Build additional line items using `QuickAddSheet` (same component as estimate builder)
5. Shows running total: change order subtotal + new combined job total
6. Tap "Present to Customer" → navigates to `/change-orders/[id]/view`

**Customer sign page** (`/change-orders/[id]/view`):
- Shows original items greyed (already authorized, not re-signable)
- Shows new change order items prominently
- Combined total
- Signature canvas (same `InPersonSignature` component reused)
- Tap "Authorize Change Order" → saves `signature_data` + sets status to `Signed`
- Telegram notification fires: `📋 Change order signed — [customer] — $[amount]`

**Invoice integration:**
- `createInvoice` from a job queries `change_orders` for that job
- Invoice `total` = original estimate total + sum of all signed change order totals
- Invoice `line_items` = original items + change order items merged with a divider label

---

## Data Model

### New table: `change_orders`

```sql
CREATE TABLE change_orders (
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

### Modified table: `pricebook_items`

```sql
ALTER TABLE pricebook_items
  ADD COLUMN IF NOT EXISTS use_count    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;
```

### No changes needed: `invoices`, `estimates`, `jobs`

Invoice total is computed dynamically when creating the invoice from a job (not stored on change_orders).

---

## New Components

| Component | Type | Location | Purpose |
|-----------|------|----------|---------|
| `QuickAddSheet` | client | `components/estimate-builder/` | Bottom sheet — Voice / Search / Recents tabs |
| `VoiceLineItems` | client | `components/estimate-builder/` | Mic button, transcript, proposed items |
| `LineItemSearch` | client | `components/estimate-builder/` | Debounced pricebook search |
| `RecentsRow` | client | `components/estimate-builder/` | Top-6 chips by use_count |
| `ChangeOrderBuilder` | client | `components/jobs/` | Mini estimate builder for additional work |
| `ChangeOrderView` | server | `app/change-orders/[id]/view/` | Public customer sign page |

## New Server Actions

| File | Function | Description |
|------|----------|-------------|
| `lib/actions/change-orders.ts` | `createChangeOrder(jobId, estimateId)` | Creates Draft record |
| | `updateChangeOrderItems(id, lineItems, total)` | Saves items while building |
| | `signChangeOrder(id, signatureData)` | Sets Signed status |
| | `getChangeOrder(id)` | Fetch with job + estimate + customer |
| | `listChangeOrdersForJob(jobId)` | All COs for a job |
| `lib/actions/pricebook.ts` | `incrementPricebookUseCount(ids[])` | Batch increment after add |
| `lib/actions/pricebook.ts` | `getRecentPricebookItems(limit)` | Top-N by use_count |

## New API Route

| Route | Method | Purpose |
|-------|--------|---------|
| `app/api/voice-line-items/route.ts` | POST | Receives transcript + pricebook, calls Claude, returns matched line items |

---

## Component Integration

### EstimateBuilder changes
- Remove `CategoryGrid` / `CategorySheet` call-to-action
- Add `<QuickAddSheet onAdd={(items) => appendLineItems(items)} />` 
- On item added via QuickAddSheet → call `incrementPricebookUseCount`

### JobDetail changes  
- Add "Add Change Order" button when `job.status` is Scheduled/In Progress/Completed AND job has a linked signed estimate
- Button navigates to `ChangeOrderBuilder` rendered below job detail (or modal)

### InvoiceDetail / createInvoice changes
- `createInvoice` server action: fetch `change_orders` for job, sum signed totals, merge line items

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Voice API call fails | Show "Couldn't match — try typing" banner, focus search tab |
| Web Speech API not available (some Android browsers) | Voice tab hidden, search tab shown as default |
| No pricebook items match voice input | Show "No matches — add manually" with pre-filled name from transcript |
| Change order sign page accessed after already signed | Show signed confirmation state, no re-sign allowed |
| Job has no linked estimate | "Add Change Order" button not shown |

---

## Telegram Notifications

- Change order created: `📋 Change order created — [customer] — [job type]`
- Change order signed: `✅ Change order signed — [customer] — $[amount]`

---

## Testing Checklist

- [ ] Voice tab: transcript → Claude match → items added to estimate
- [ ] Voice tab: API failure → falls back to search tab with error banner
- [ ] Search tab: 2-letter query → results within 300ms
- [ ] Recents tab: shows top 6 by use_count, updates after add
- [ ] use_count increments correctly after items added via any tab
- [ ] Change order creates with Draft status
- [ ] Change order sign page shows original items greyed + new items
- [ ] Signature saves, status → Signed
- [ ] createInvoice from job includes original + change order total
- [ ] "Add Change Order" button only visible with signed estimate present
- [ ] Telegram fires on CO created and CO signed
