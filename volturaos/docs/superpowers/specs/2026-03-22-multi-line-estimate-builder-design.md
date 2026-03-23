# Multi-Line Item Estimate Builder — Design Spec

**Goal:** Redesign the estimate builder to support multiple line items per estimate, organized by category with a primary job + additional work flow, including wire run and conduit footage-based pricing.

**Architecture:** Category drawer pattern — primary job selector at top with Good/Better/Best tier cards, followed by a 2x3 category grid that opens bottom sheets for browsing and adding items. All added items appear in a line item summary list. Running total pinned at bottom.

**Tech Stack:** Next.js App Router, React, Tailwind CSS v4, Supabase PostgreSQL

---

## 1. User Flow

1. **Select customer** (unchanged from today)
2. **Pick primary job** (optional) — filtered selector showing Panel & Service + Specialty categories. Selecting shows Good/Better/Best tier cards. This is the anchor item. A "Skip" link allows creating estimates with only additional items.
3. **Add additional line items** — tap category buttons in a 2x3 grid. Each opens a bottom sheet listing pricebook items in that category. Tap an item → it is immediately added at Better tier. The item appears in the line item summary below, where the tier can be changed. Wire/conduit items also show a footage input.
4. **Review line items** — scrollable summary list showing all added items. Tap to expand and change tier or footage. Tap X to remove.
5. **Add-ons** (unchanged) — whole-home surge, AFCI upgrade, permit, priority scheduling, warranty
6. **Custom line items** (unchanged) — freeform description + price
7. **Notes** (unchanged)
8. **Save / Send** (unchanged)

## 2. Pricebook Schema Changes

### New columns on `pricebook` table

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `category` | text | `'Uncategorized'` | Groups items for the category grid |
| `per_foot_rate` | numeric | `null` | Per-foot rate for custom footage pricing (same rate for all brackets of a wire/conduit type) |
| `is_footage_item` | boolean | `false` | Flags items that show the footage input |
| `footage_group` | text | `null` | Groups bracket entries for the same wire/conduit type (e.g., `"12-2 Romex"`, `"EMT"`) |

### SQL Migration

```sql
-- Add new columns
ALTER TABLE pricebook ADD COLUMN IF NOT EXISTS category text DEFAULT 'Uncategorized';
ALTER TABLE pricebook ADD COLUMN IF NOT EXISTS per_foot_rate numeric DEFAULT null;
ALTER TABLE pricebook ADD COLUMN IF NOT EXISTS is_footage_item boolean DEFAULT false;
ALTER TABLE pricebook ADD COLUMN IF NOT EXISTS footage_group text DEFAULT null;

-- Assign categories to existing entries
UPDATE pricebook SET category = 'Panel & Service' WHERE job_type IN (
  'Panel upgrade 100A to 200A', 'Panel upgrade 100A to 225A',
  'FPE/Zinsco panel replacement', 'Meter base replacement',
  'Subpanel install', 'Grounding system upgrade'
);
UPDATE pricebook SET category = 'Wiring & Circuits' WHERE job_type IN (
  'New circuit 20A', 'New circuit 240V dedicated', 'Dedicated home office circuit'
);
UPDATE pricebook SET category = 'Fixtures & Devices' WHERE job_type IN (
  'Standard outlet install', 'GFCI outlet install', 'USB GFCI outlet install',
  'GFCI upgrade (audible alert)', 'Light switch / dimmer install',
  'Ceiling fan (existing box)', 'Ceiling fan (new wiring)',
  'Recessed lighting (per light)', 'Bathroom exhaust fan',
  'Outdoor/landscape lighting', 'Smoke/CO detector'
);
UPDATE pricebook SET category = 'Troubleshoot' WHERE job_type IN (
  'Troubleshoot Level 1 (simple)', 'Troubleshoot Level 2 (moderate)',
  'Troubleshoot Level 3 (complex)', 'Electrical inspection',
  'Service call / diagnostic'
);
UPDATE pricebook SET category = 'Specialty' WHERE job_type IN (
  'EV Charger L2 (circuit only)', 'EV Charger L2 (full install)',
  'Hot tub / spa circuit', 'Generator transfer switch',
  'Whole-home surge protector', 'Aluminum wiring remediation',
  'AFCI breaker replacement', 'Breaker replacement (standard)'
);
```

New pricebook entry INSERTs and pricing TBD at implementation — Dev will provide actual pricing for wire runs and conduit brackets.

### Categories

| Category | Existing Items | New Items |
|----------|---------------|-----------|
| Panel & Service | Panel upgrade 100A to 200A, Panel upgrade 100A to 225A, FPE/Zinsco panel replacement, Meter base replacement, Subpanel install, Grounding system upgrade | — |
| Wiring & Circuits | New circuit 20A, New circuit 240V dedicated, Dedicated home office circuit | 12-2 Romex (3 brackets), 10-2 Romex (3 brackets), 6-3 Romex (3 brackets) |
| Conduit & Feeders | — | EMT (3 brackets), Seal Tight (3 brackets), Car Flex (3 brackets), Flex Conduit (3 brackets) |
| Fixtures & Devices | Standard outlet, GFCI outlet, USB GFCI outlet, GFCI upgrade (audible), Light switch/dimmer, Ceiling fan (existing/new wiring), Recessed lighting, Bathroom exhaust fan, Outdoor/landscape lighting, Smoke/CO detector | — |
| Troubleshoot | Troubleshoot Level 1/2/3, Electrical inspection, Service call/diagnostic | — |
| Specialty | EV Charger L2 (circuit/full), Hot tub/spa circuit, Generator transfer switch, Whole-home surge protector, Aluminum wiring remediation, AFCI breaker replacement, Breaker replacement (standard) | — |

### Footage item grouping

All bracket entries for the same wire/conduit type share the same `footage_group` and `per_foot_rate`:
- `footage_group = "12-2 Romex"` for entries: "12-2 Romex up to 25ft", "12-2 Romex 25-50ft", "12-2 Romex 50-100ft"
- `footage_group = "EMT"` for entries: "EMT up to 25ft", "EMT 25-50ft", "EMT 50-100ft"
- etc.

When a user enters custom footage, the `per_foot_rate` from any entry in the group is used (they're identical). The bracket entry is selected based on which range the footage falls into.

## 3. TypeScript Type Changes

### `types/index.ts` updates

```typescript
// PricebookEntry — add new fields
export interface PricebookEntry {
  id: string
  job_type: string
  description_good: string | null
  description_better: string | null
  description_best: string | null
  price_good: number | null
  price_better: number | null
  price_best: number | null
  includes_permit: boolean
  notes: string | null
  active: boolean
  category: string           // NEW
  per_foot_rate: number | null  // NEW
  is_footage_item: boolean      // NEW
  footage_group: string | null  // NEW
}

// LineItem — add optional fields (backward compatible)
export interface LineItem {
  description: string
  price: number
  is_override: boolean
  original_price: number | null
  tier?: string              // already exists on some items
  category?: string          // NEW
  footage?: number | null    // NEW
  is_primary?: boolean       // NEW
}
```

### `estimates` table — `tier_selected` column

The `tier_selected` column is repurposed to store the **primary job's tier**. If no primary job, it is set to `null`. This maintains backward compatibility with existing estimates.

## 4. Estimate Line Items Data Shape

The `line_items` JSONB column on `estimates` already stores an array. Each item now includes:

```json
{
  "description": "12-2 Romex 50-100ft",
  "price": 275,
  "tier": "better",
  "is_override": false,
  "original_price": 275,
  "category": "Wiring & Circuits",
  "footage": 75,
  "is_primary": false
}
```

- `category` (string) — which category the item came from
- `footage` (number | null) — custom footage for wire/conduit items, null for non-footage items
- `is_primary` (boolean) — `true` for the main job (at most one), `false` for additional items

No table migration needed for estimates — this is a JSON shape change only.

## 5. Component Architecture

### Modified files

| File | Change |
|------|--------|
| `components/estimate-builder/EstimateBuilder.tsx` | Major rewrite: manages array of line items (primary + additional), renders PrimaryJobSelector + CategoryGrid + LineItemList + existing AddOnsPanel/CustomLineItems |
| `components/estimate-builder/JobTypeSelector.tsx` | Renamed to `PrimaryJobSelector.tsx` — filters pricebook to show all categories but selects a single primary item with tier cards |
| `components/estimate-builder/LiveTotal.tsx` | Updated to sum all line items (primary + additional + addons + custom) |
| `lib/actions/estimates.ts` | `saveEstimate` updated: accepts full line_items array (primary + additional). `tier_selected` set to primary item's tier or null. |
| `lib/ai/tools.ts` | `create_estimate` tool updated to accept `additional_items` parameter |
| `types/index.ts` | `PricebookEntry` and `LineItem` interfaces updated with new fields |
| `components/settings/PricebookTable.tsx` | Show category column, support `is_footage_item` and `per_foot_rate` editing |

### New files

| File | Responsibility |
|------|---------------|
| `components/estimate-builder/CategoryGrid.tsx` | 2x3 grid of category buttons with icons. Tapping opens CategorySheet. |
| `components/estimate-builder/CategorySheet.tsx` | Bottom sheet overlay listing pricebook items for a category. Each row shows item name + Better tier price. Tap to add immediately at Better tier. |
| `components/estimate-builder/LineItemList.tsx` | Scrollable summary of all added additional items. Each row rendered by LineItemRow. |
| `components/estimate-builder/LineItemRow.tsx` | Single line item row with compact tier toggle (G/B/B pill buttons), price display, X remove. Expandable: tap row to show tier change and footage adjust. |
| `components/estimate-builder/FootageInput.tsx` | For footage items: bracket range buttons ("0-25ft" / "25-50ft" / "50-100ft") matching pricebook brackets, plus a custom footage text input. Selecting a bracket picks that bracket's price. Entering custom footage calculates `per_foot_rate * footage`. |

### Files unchanged

- `CustomerSelector.tsx`, `AIContextProvider.tsx`, `TierCard.tsx`, `TierCards.tsx`, `AddOnsPanel.tsx`, `CustomLineItems.tsx`, `SendSheet.tsx`

## 6. Footage & Bracket Interaction

### How bracket selection works

Each wire/conduit type (e.g., "12-2 Romex") has 3 bracket entries in the pricebook sharing the same `footage_group`. In the CategorySheet:

1. User taps a footage group header (e.g., "12-2 Romex")
2. Shows 3 bracket buttons: "0-25ft" / "25-50ft" / "50-100ft" with Better tier prices
3. Tapping a bracket adds that specific pricebook entry at Better tier
4. Below the brackets: "Custom footage" text input
5. Entering custom footage (e.g., 60): calculates `per_foot_rate * 60`, creates a line item with `footage: 60`, `is_override: true`

### Which bracket entry is used for custom footage?

The bracket entry whose range contains the footage value. 60ft → "50-100ft" entry. The price is overridden to `per_foot_rate * footage` but the description comes from the matching bracket entry.

## 7. Public Estimate View

The existing public estimate view (`/estimates/[id]/view`) already renders `line_items` as an array. It will need a minor update to:
- Display multiple line items in a list format (description + price per row)
- Show the primary job prominently at top
- Show footage values where applicable (e.g., "12-2 Romex — 60ft")
- Total at bottom (unchanged)

## 8. AI Tools Update

The `create_estimate` tool in `lib/ai/tools.ts` changes:

```
Parameters:
  customer_id: string (required)
  job_type: string (optional — primary job type from pricebook)
  tier: string (optional — tier for primary job, default "better")
  additional_items: array (optional) — each: { job_type: string, tier?: string, footage?: number }
  notes: string (optional)
```

Behavior:
1. If `job_type` provided: look up pricebook, create primary line item with `is_primary: true`
2. For each `additional_items` entry: look up pricebook, create line item with `is_primary: false`
3. For footage items: if `footage` provided, calculate `per_foot_rate * footage`; otherwise use bracket price
4. Sum all prices for total
5. Return summary listing all items and total

## 9. Estimate-Job Relationship

The `job_id` on estimates remains a single foreign key. An estimate describes the scope of work; a job is the execution of that work. One estimate → one job. The `updateEstimateStatus` Telegram notification uses the primary line item's description (where `is_primary: true`) instead of `jobs(job_type)` when no job is linked.

## 10. Edge Cases

- **No primary job** — Allow estimates with only additional items (e.g., just outlet installs). Primary job section shows "Skip — add items below" link.
- **Duplicate items** — Allow adding the same item multiple times (e.g., 3 separate outlet installs in different locations). Each is its own line item.
- **Footage override pricing** — When custom footage is entered: `price = per_foot_rate * footage`. `is_override` set to `true`, `original_price` keeps the bracket price for reference.
- **Empty estimate** — Save Draft disabled until at least one line item exists.
- **Backward compatibility** — Old estimates with a single line item still render correctly. The `is_primary` field defaults to `true` for the first item if missing.

## 11. Out of Scope

- Drag-to-reorder line items (nice-to-have, not critical for v1)
- Grouping line items by room/area on the estimate
- Per-item notes
- Multi-quantity for a single line item (just add it multiple times)
