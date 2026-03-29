# Estimate Proposals & AI Upsells — Design Spec
**Date:** 2026-03-27
**Status:** Approved by user

---

## Problem

The current estimate builder forces a Good/Better/Best tier structure that doesn't match how Dev actually works — he builds one scope, then creates variations (e.g., basic surge vs whole-home surge) that he wants to present side-by-side to the customer for comparison. The tier labels are also hardcoded, preventing him from naming packages the way he sells them.

---

## Solution Overview

Replace the tier card system with a flat, named estimate model. Estimates can be grouped into a **proposal** (up to 3 estimates) that share a `proposal_id`. Each estimate is independently editable with its own name and line items. The comparison view shows all estimates in a proposal side by side for customer presentation.

Add an AI **Suggested Items** panel inside the estimate builder that recommends upsells based on what's already on the estimate.

---

## Database Changes

Two new columns on the `estimates` table:

```sql
ALTER TABLE estimates ADD COLUMN name text NOT NULL DEFAULT 'Estimate';
ALTER TABLE estimates ADD COLUMN proposal_id uuid REFERENCES estimates(id) ON DELETE SET NULL;
```

**`name`** — free text label (e.g., "Gold", "Basic Package"). Max 100 chars. Empty string saves as `'Estimate'`.

**`proposal_id`** — points to the **anchor estimate** (anchor has `proposal_id = NULL`). Children point to the anchor's `id`. `ON DELETE SET NULL` orphans children on anchor delete — no cascade.

**Existing columns already present — no migration needed:**
- `approved_at`, `declined_at`, `sent_at`, `viewed_at` — already in schema
- `EstimateStatus` already includes `'Declined'`

**Existing records:** After migration, all get `name = 'Estimate'`, `proposal_id = NULL`. They display as solo estimates. The estimates list UI is updated to stop rendering the `tier_selected` badge entirely (both old and new records). No DB migration for `tier_selected` values — they are simply no longer displayed or written.

**`tier_selected`:** Kept in DB column. `saveEstimate` always writes `null` for this field going forward.

---

## TypeScript Type Changes

```typescript
// types/index.ts — Estimate interface additions
name: string                // NEW
proposal_id: string | null  // NEW
// tier_selected kept for DB compat, always null in new estimates
```

`listEstimates()` uses `.select('*')` — new columns included automatically after migration.

---

## Auth — AI Route Fix

`app/api/ai/route.ts` currently has a live Supabase session check (`if (!user) return 401`). Auth is disabled across the rest of the app. This check must be commented out to match:

```typescript
// const { data: { user } } = await supabase.auth.getUser()
// if (!user) return new Response('Unauthorized', { status: 401 })
```

This is a prerequisite for the SuggestedItems panel to work.

---

## Estimate Builder Redesign

### What's removed
- `TierCards.tsx`, `TierCard.tsx` — deleted
- Tier selection from `PrimaryJobSelector` — simplified to job type picker only
- `tierLineItems` state, `primaryTier` state, `buildTierLineItem()` — removed
- Tier badge (G/B/Bst) and tier change buttons in `LineItemRow` — removed
- `is_primary` flag logic — removed
- `tier_selected` seeding in `EstimateBuilder` page — removed

### What's added

**Editable name field** — below customer selector:
- `<input type="text">`, max 100 chars, placeholder `"Name this estimate…"`
- On blur: if empty, reset to `"Estimate"` client-side
- Saved as `name` via `saveEstimate`

**Duplicate button** — in the page header, next to "+ New":
- Calls `duplicateEstimate(estimateId)` then navigates to the new estimate
- `proposalCount` = total group size (anchor + children, range 1–3), passed as prop from server via `getProposalEstimates`
- **Disabled** when `saving === true` OR `proposalCount >= 3`
- When disabled due to max: tooltip `"Max 3 per proposal"`

**Suggested Items panel (`SuggestedItems.tsx`)** — between category grid and line items:
- **Fetch trigger:** Once on mount only. Manual "↻ Refresh" button at top-right to re-fetch. Does NOT auto-refetch when line items change.
- Calls `POST /api/ai`:
  ```json
  {
    "message": "Suggest 4-5 electrical services to add. Return a JSON array only, no other text: [{\"name\": string, \"price\": number, \"reason\": string}]",
    "context": { "mode": "upsell", "currentLineItems": [...], "customerType": "residential" }
  }
  ```
- **Stream consumption:** Read the full response as text (`await response.text()`) — do NOT stream incrementally. Parse the complete text as JSON after the request resolves.
- **Success:** Parse completed response as JSON → render suggestion rows
- **Public view approve guard:** The approve action checks `current status NOT IN ('Approved','Declined')` before writing — no-op if already settled. No auth token required; matches the rest of the app's auth-disabled posture.
- **Malformed JSON / empty array / error / timeout:** Hide panel entirely, no message shown
- **Loading:** 3 skeleton rows (pulse)
- **Row:** item name + reason (gray xs) + price + "+ Add"
- **Tapping "+ Add":** Adds custom line item (name + price), removes that row from panel. No re-fetch.

### What stays the same
- Customer selector
- Category grid + category sheet
- Line item list (footage inputs kept, tier badges removed)
- Add-ons panel
- Custom line items
- Notes
- Live total bar
- Save Draft / Present / Send flow

---

## New Server Actions

### `duplicateEstimate(sourceId: string): Promise<Estimate>`

1. Fetch source estimate
2. `anchorId = source.proposal_id ?? source.id`
3. `SELECT COUNT(*) FROM estimates WHERE id = anchorId OR proposal_id = anchorId`
4. If count ≥ 3 → throw `"Proposal already has 3 estimates"`
5. Name: `source.name.slice(0, 93) + ' (Copy)'` (93 + 7 = max 100)
6. Insert new estimate: copy `customer_id`, `job_id`, `line_items`, `addons`, `notes`, `subtotal`, `total`; set `name`, `proposal_id = anchorId`, `status = 'Draft'`, `tier_selected = null`
7. Return new estimate

### `getProposalEstimates(estimateId: string): Promise<Estimate[]>`

1. Fetch estimate by `estimateId`
2. `anchorId = estimate.proposal_id ?? estimateId`
3. `SELECT * FROM estimates WHERE id = anchorId OR proposal_id = anchorId ORDER BY created_at ASC, id ASC`
4. Returns 1–3 estimates; anchor is always first (earliest `created_at`; `id ASC` is the tiebreaker)

### Updated `saveEstimate`
- Accepts `name`; saves empty string as `'Estimate'`
- Always writes `tier_selected: null`

---

## Estimates List Page

`listEstimates()` returns all estimates. Client-side grouping:

1. Separate into anchors (`proposal_id === null`) and children
2. Map each anchor to its children
3. Anchors with ≥1 child → **grouped card**
4. Anchors with 0 children → **solo card** (no change from today, except tier badge removed)
5. Children never rendered standalone

**Grouped card:**
- Names: all estimate `name` values joined with ` · `, ordered by `created_at ASC`
- Status: `Approved` if any Approved; else `Sent` if any Sent; else `Draft`
- Total: `Math.max(...group.map(e => e.total ?? 0))`
- Tap: navigates to anchor URL

**Tier badge removed** from all estimate list cards (solo and grouped).

---

## Present Mode (In-App)

The page loads `getProposalEstimates(estimateId)` and passes the full group to `PresentMode`.

**Multi-estimate proposal:**
- Show all estimates side by side as comparison columns (mobile: snap-scroll; desktop: CSS grid)
- Column order: anchor first by `created_at ASC`
- Each column: `name` (large, gold), condensed line items (description + price), total, "Approve" button
- When user taps "Approve" on a column: transition to the **signature step** for that estimate (existing canvas flow, unchanged). On signature submit: call `updateEstimateStatus(approvedId, 'Approved')` + `updateEstimateStatus(siblingId, 'Declined')` for all other estimates in the group. Telegram and Sheets notifications fire as today for the approved estimate.

**Solo estimate (1 estimate):**
- Single full-width column → goes straight to existing signature step. No change from today.

---

## Public View (`/estimates/[id]/view`)

`getPublicEstimate(id)` extended to call `getProposalEstimates(id)` and return the full group. Works from any estimate's URL (anchor or child). Anchor always renders as column 1. No redirect.

**Viewed-stamp:** After calling `getProposalEstimates`, identify the anchor (first result, `proposal_id = null`). If the anchor's `status === 'Sent'`, call `updateEstimateStatus(anchor.id, 'Viewed')`. No stamp if status is already Viewed/Approved/Declined. This always operates on the anchor row regardless of which estimate ID was in the URL.

**Multi-estimate proposal:**
- Swipeable comparison columns (same layout as in-app present mode)
- Each column has an "Approve" button — **no signature step** on public view (customer approves by tap)
- Tapping Approve: call `updateEstimateStatus(approvedId, 'Approved')` + `updateEstimateStatus(siblingId, 'Declined')` for all others. Stamps `approved_at` / `declined_at`.
- After any approval: all Approve buttons replaced with status labels ("✓ Approved" in gold, "Declined" in gray). No further action possible.

**Solo estimate:** Unchanged from today.

---

## AI Prompt Changes (`lib/ai/prompts.ts`)

Add to `SYSTEM_PROMPT`:

> When the user's message contains the phrase "Return a JSON array only", your entire response must be a single valid JSON array with no surrounding text, no markdown code fences, and no explanation.

---

## Files Changed

| File | Change |
|------|--------|
| `types/index.ts` | Add `name`, `proposal_id` to Estimate interface |
| `app/api/ai/route.ts` | Comment out auth check |
| `lib/actions/estimates.ts` | Add `duplicateEstimate`, `getProposalEstimates`; update `saveEstimate`, `getPublicEstimate` |
| `components/estimate-builder/EstimateBuilder.tsx` | Remove tier state/logic; add name field, duplicate button wiring, SuggestedItems |
| `components/estimate-builder/TierCards.tsx` | Delete |
| `components/estimate-builder/TierCard.tsx` | Delete |
| `components/estimate-builder/PrimaryJobSelector.tsx` | Remove tier selection, keep job type picker only |
| `components/estimate-builder/LineItemRow.tsx` | Remove tier badge and tier change buttons |
| `components/estimate-builder/SuggestedItems.tsx` | New — AI upsell panel |
| `app/(app)/estimates/page.tsx` | Grouped proposal cards; remove tier badge from all cards |
| `app/(app)/estimates/[id]/page.tsx` | Call `getProposalEstimates`, pass count + group to builder and present mode |
| `components/estimates/PresentMode.tsx` | Multi-estimate comparison layout; approval triggers sibling decline |
| `lib/ai/prompts.ts` | Add JSON-only instruction to system prompt |

---

## Out of Scope

- Reordering estimates within a proposal
- Merging two proposals
- More than 3 estimates per proposal
- Deleting a proposal as a unit
- Changing which estimate is the anchor
- Per-sibling Telegram/Sheets notifications (only the approved estimate triggers today's notification flow)
