# Multi-Line Item Estimate Builder Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the estimate builder to support multiple line items per estimate with categorized browsing, wire run / conduit footage pricing, and a primary job + additional work flow.

**Architecture:** Category drawer pattern. Primary job selector at top with Good/Better/Best tier cards, 2x3 category grid below that opens bottom sheets for adding items, line item summary list, running total pinned at bottom. Pricebook gets `category`, `footage_group`, `per_foot_rate`, and `is_footage_item` columns. No new tables.

**Tech Stack:** Next.js 16 App Router, React, Tailwind CSS v4, Supabase PostgreSQL

**Spec:** `docs/superpowers/specs/2026-03-22-multi-line-estimate-builder-design.md`

---

## File Structure

### Modified files
| File | Responsibility |
|------|---------------|
| `types/index.ts` | Add `category`, `per_foot_rate`, `is_footage_item`, `footage_group` to `PricebookEntry`. Add `category?`, `footage?`, `is_primary?` to `LineItem`. |
| `lib/actions/pricebook.ts` | Update `getAllPricebook()` to order by category, add `getPricebookByCategory()` |
| `lib/actions/estimates.ts` | Update `saveEstimate()` to accept full multi-item line_items array |
| `components/estimate-builder/EstimateBuilder.tsx` | Major rewrite: multi-item state management, renders PrimaryJobSelector + CategoryGrid + LineItemList |
| `components/estimate-builder/LiveTotal.tsx` | Sum primary + additional + addons + custom items |
| `components/settings/PricebookTable.tsx` | Group entries by category |
| `app/estimates/[id]/view/page.tsx` | Render multi-line-item estimates with primary job highlighted |
| `lib/ai/tools.ts` | Update `create_estimate` tool to support `additional_items` |
| `lib/ai/prompts.ts` | Update system prompt to document `additional_items` parameter |

### New files
| File | Responsibility |
|------|---------------|
| `components/estimate-builder/PrimaryJobSelector.tsx` | Job type picker filtered by category, with "Skip" option |
| `components/estimate-builder/CategoryGrid.tsx` | 2x3 grid of category buttons with icons |
| `components/estimate-builder/CategorySheet.tsx` | Bottom sheet listing pricebook items for a category, tap to add |
| `components/estimate-builder/LineItemList.tsx` | Summary list of all added additional items |
| `components/estimate-builder/LineItemRow.tsx` | Single row: description, tier toggle, price, footage, remove |
| `components/estimate-builder/FootageInput.tsx` | Bracket preset buttons + custom footage text input |

### Unchanged files
`CustomerSelector.tsx`, `AIContextProvider.tsx`, `TierCard.tsx`, `TierCards.tsx`, `AddOnsPanel.tsx`, `CustomLineItems.tsx`, `SendSheet.tsx`, `BottomSheet.tsx`

---

### Task 1: Pricebook Schema Migration + Seed Data

**Files:**
- Modify: `types/index.ts:46-58` (PricebookEntry interface)
- Modify: `lib/actions/pricebook.ts`

- [ ] **Step 1: Add new columns to pricebook table via Supabase SQL**

Run this SQL in Supabase SQL Editor (or via REST API):

```sql
ALTER TABLE pricebook ADD COLUMN IF NOT EXISTS category text DEFAULT 'Uncategorized';
ALTER TABLE pricebook ADD COLUMN IF NOT EXISTS per_foot_rate numeric DEFAULT null;
ALTER TABLE pricebook ADD COLUMN IF NOT EXISTS is_footage_item boolean DEFAULT false;
ALTER TABLE pricebook ADD COLUMN IF NOT EXISTS footage_group text DEFAULT null;
```

- [ ] **Step 2: Assign categories to existing entries**

```sql
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

- [ ] **Step 3: Insert new wire run pricebook entries**

```sql
-- 12-2 Romex
INSERT INTO pricebook (job_type, category, description_good, description_better, description_best, price_good, price_better, price_best, is_footage_item, footage_group, per_foot_rate, active)
VALUES
  ('12-2 Romex up to 25ft', 'Wiring & Circuits', 'Standard 12-2 run, basic', 'Standard 12-2 run, neat routing', 'Premium 12-2 run, concealed routing', 85, 125, 175, true, '12-2 Romex', 3.50, true),
  ('12-2 Romex 25-50ft', 'Wiring & Circuits', 'Standard 12-2 run, basic', 'Standard 12-2 run, neat routing', 'Premium 12-2 run, concealed routing', 150, 210, 295, true, '12-2 Romex', 3.50, true),
  ('12-2 Romex 50-100ft', 'Wiring & Circuits', 'Standard 12-2 run, basic', 'Standard 12-2 run, neat routing', 'Premium 12-2 run, concealed routing', 225, 325, 450, true, '12-2 Romex', 3.50, true);

-- 10-2 Romex
INSERT INTO pricebook (job_type, category, description_good, description_better, description_best, price_good, price_better, price_best, is_footage_item, footage_group, per_foot_rate, active)
VALUES
  ('10-2 Romex up to 25ft', 'Wiring & Circuits', 'Standard 10-2 run, basic', 'Standard 10-2 run, neat routing', 'Premium 10-2 run, concealed routing', 110, 160, 225, true, '10-2 Romex', 4.50, true),
  ('10-2 Romex 25-50ft', 'Wiring & Circuits', 'Standard 10-2 run, basic', 'Standard 10-2 run, neat routing', 'Premium 10-2 run, concealed routing', 195, 275, 385, true, '10-2 Romex', 4.50, true),
  ('10-2 Romex 50-100ft', 'Wiring & Circuits', 'Standard 10-2 run, basic', 'Standard 10-2 run, neat routing', 'Premium 10-2 run, concealed routing', 300, 425, 595, true, '10-2 Romex', 4.50, true);

-- 6-3 Romex
INSERT INTO pricebook (job_type, category, description_good, description_better, description_best, price_good, price_better, price_best, is_footage_item, footage_group, per_foot_rate, active)
VALUES
  ('6-3 Romex up to 25ft', 'Wiring & Circuits', 'Standard 6-3 run, basic', 'Standard 6-3 run, neat routing', 'Premium 6-3 run, concealed routing', 175, 250, 350, true, '6-3 Romex', 7.00, true),
  ('6-3 Romex 25-50ft', 'Wiring & Circuits', 'Standard 6-3 run, basic', 'Standard 6-3 run, neat routing', 'Premium 6-3 run, concealed routing', 300, 425, 595, true, '6-3 Romex', 7.00, true),
  ('6-3 Romex 50-100ft', 'Wiring & Circuits', 'Standard 6-3 run, basic', 'Standard 6-3 run, neat routing', 'Premium 6-3 run, concealed routing', 475, 675, 950, true, '6-3 Romex', 7.00, true);
```

- [ ] **Step 4: Insert new conduit pricebook entries**

```sql
-- EMT
INSERT INTO pricebook (job_type, category, description_good, description_better, description_best, price_good, price_better, price_best, is_footage_item, footage_group, per_foot_rate, active)
VALUES
  ('EMT up to 25ft', 'Conduit & Feeders', 'EMT conduit run, basic', 'EMT conduit run, neat bends', 'EMT conduit run, concealed + painted', 150, 225, 325, true, 'EMT', 6.00, true),
  ('EMT 25-50ft', 'Conduit & Feeders', 'EMT conduit run, basic', 'EMT conduit run, neat bends', 'EMT conduit run, concealed + painted', 275, 400, 575, true, 'EMT', 6.00, true),
  ('EMT 50-100ft', 'Conduit & Feeders', 'EMT conduit run, basic', 'EMT conduit run, neat bends', 'EMT conduit run, concealed + painted', 450, 650, 925, true, 'EMT', 6.00, true);

-- Seal Tight
INSERT INTO pricebook (job_type, category, description_good, description_better, description_best, price_good, price_better, price_best, is_footage_item, footage_group, per_foot_rate, active)
VALUES
  ('Seal Tight up to 25ft', 'Conduit & Feeders', 'Seal tight run, basic', 'Seal tight run, neat routing', 'Seal tight run, concealed', 125, 185, 265, true, 'Seal Tight', 5.00, true),
  ('Seal Tight 25-50ft', 'Conduit & Feeders', 'Seal tight run, basic', 'Seal tight run, neat routing', 'Seal tight run, concealed', 225, 325, 465, true, 'Seal Tight', 5.00, true),
  ('Seal Tight 50-100ft', 'Conduit & Feeders', 'Seal tight run, basic', 'Seal tight run, neat routing', 'Seal tight run, concealed', 375, 540, 770, true, 'Seal Tight', 5.00, true);

-- Car Flex
INSERT INTO pricebook (job_type, category, description_good, description_better, description_best, price_good, price_better, price_best, is_footage_item, footage_group, per_foot_rate, active)
VALUES
  ('Car Flex up to 25ft', 'Conduit & Feeders', 'Car flex run, basic', 'Car flex run, neat routing', 'Car flex run, concealed', 135, 200, 285, true, 'Car Flex', 5.50, true),
  ('Car Flex 25-50ft', 'Conduit & Feeders', 'Car flex run, basic', 'Car flex run, neat routing', 'Car flex run, concealed', 245, 355, 510, true, 'Car Flex', 5.50, true),
  ('Car Flex 50-100ft', 'Conduit & Feeders', 'Car flex run, basic', 'Car flex run, neat routing', 'Car flex run, concealed', 410, 590, 845, true, 'Car Flex', 5.50, true);

-- Flex Conduit
INSERT INTO pricebook (job_type, category, description_good, description_better, description_best, price_good, price_better, price_best, is_footage_item, footage_group, per_foot_rate, active)
VALUES
  ('Flex Conduit up to 25ft', 'Conduit & Feeders', 'Flex conduit run, basic', 'Flex conduit run, neat routing', 'Flex conduit run, concealed', 115, 170, 245, true, 'Flex Conduit', 4.50, true),
  ('Flex Conduit 25-50ft', 'Conduit & Feeders', 'Flex conduit run, basic', 'Flex conduit run, neat routing', 'Flex conduit run, concealed', 205, 300, 430, true, 'Flex Conduit', 4.50, true),
  ('Flex Conduit 50-100ft', 'Conduit & Feeders', 'Flex conduit run, basic', 'Flex conduit run, neat routing', 'Flex conduit run, concealed', 340, 490, 700, true, 'Flex Conduit', 4.50, true);
```

- [ ] **Step 5: Update TypeScript types**

Modify `types/index.ts` — update `PricebookEntry`:

```typescript
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
  category: string
  per_foot_rate: number | null
  is_footage_item: boolean
  footage_group: string | null
}
```

Update `LineItem`:

```typescript
export interface LineItem {
  description: string
  price: number
  is_override: boolean
  original_price: number | null
  tier?: TierName
  category?: string
  footage?: number | null
  is_primary?: boolean
}
```

- [ ] **Step 6: Update pricebook actions**

Modify `lib/actions/pricebook.ts` — update `getAllPricebook()` to order by category then job_type. Add `getPricebookByCategory()`:

```typescript
export async function getAllPricebook(): Promise<PricebookEntry[]> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('pricebook')
    .select('*')
    .eq('active', true)
    .order('category')
    .order('job_type')
  if (error) throw new Error(error.message)
  return data as PricebookEntry[]
}

export async function getPricebookByCategory(): Promise<Record<string, PricebookEntry[]>> {
  const entries = await getAllPricebook()
  const grouped: Record<string, PricebookEntry[]> = {}
  for (const entry of entries) {
    const cat = entry.category || 'Uncategorized'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(entry)
  }
  return grouped
}
```

- [ ] **Step 7: Verify build passes**

Run: `npx next build`
Expected: Compiles successfully (pricebook pages may show new fields as undefined until DB is updated, but types should compile)

- [ ] **Step 8: Commit**

```bash
git add types/index.ts lib/actions/pricebook.ts
git commit -m "feat: add pricebook categories and footage pricing types + actions"
```

---

### Task 2: FootageInput Component

**Files:**
- Create: `components/estimate-builder/FootageInput.tsx`

- [ ] **Step 1: Create FootageInput component**

```typescript
'use client'

import { useState } from 'react'

interface FootageInputProps {
  footageGroup: string
  brackets: { label: string; price: number }[]
  perFootRate: number
  selectedBracketIndex: number | null
  customFootage: number | null
  onBracketSelect: (index: number, price: number) => void
  onCustomFootage: (footage: number, price: number) => void
}

export function FootageInput({
  footageGroup,
  brackets,
  perFootRate,
  selectedBracketIndex,
  customFootage,
  onBracketSelect,
  onCustomFootage,
}: FootageInputProps) {
  const [customValue, setCustomValue] = useState(customFootage?.toString() ?? '')

  function handleCustomChange(value: string) {
    setCustomValue(value)
    const ft = parseFloat(value)
    if (!isNaN(ft) && ft > 0) {
      const price = Math.round(perFootRate * ft)
      onCustomFootage(ft, price)
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <p className="text-gray-500 text-xs">{footageGroup} — select length</p>
      <div className="flex gap-2">
        {brackets.map((b, i) => (
          <button
            key={b.label}
            onClick={() => onBracketSelect(i, b.price)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              selectedBracketIndex === i && customFootage === null
                ? 'bg-volturaGold text-volturaBlue'
                : 'bg-volturaNavy/50 text-gray-400'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={customValue}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="Custom ft"
          className={`flex-1 bg-volturaNavy text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-volturaGold/50 ${
            customFootage !== null ? 'ring-1 ring-volturaGold/50' : ''
          }`}
        />
        {customFootage !== null && (
          <span className="text-volturaGold text-sm font-semibold whitespace-nowrap">
            ${Math.round(perFootRate * customFootage).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

Run: `npx next build`
Expected: Compiles (component not mounted yet, just needs to type-check)

- [ ] **Step 3: Commit**

```bash
git add components/estimate-builder/FootageInput.tsx
git commit -m "feat: add FootageInput component for wire/conduit bracket pricing"
```

---

### Task 3: LineItemRow Component

**Files:**
- Create: `components/estimate-builder/LineItemRow.tsx`

- [ ] **Step 1: Create LineItemRow component**

```typescript
'use client'

import { useState } from 'react'
import type { TierName, LineItem, PricebookEntry } from '@/types'
import { FootageInput } from './FootageInput'

interface LineItemRowProps {
  item: LineItem
  pricebookEntry?: PricebookEntry
  onTierChange: (tier: TierName) => void
  onFootageChange: (footage: number | null, price: number) => void
  onRemove: () => void
}

const TIER_LABELS: { key: TierName; label: string }[] = [
  { key: 'good', label: 'G' },
  { key: 'better', label: 'B' },
  { key: 'best', label: 'Bst' },
]

export function LineItemRow({ item, pricebookEntry, onTierChange, onFootageChange, onRemove }: LineItemRowProps) {
  const [expanded, setExpanded] = useState(false)

  const isFootage = pricebookEntry?.is_footage_item ?? false
  const brackets = isFootage && pricebookEntry
    ? [
        { label: '0-25ft', price: pricebookEntry.price_good ?? 0 },
        { label: '25-50ft', price: pricebookEntry.price_better ?? 0 },
        { label: '50-100ft', price: pricebookEntry.price_best ?? 0 },
      ]
    : []

  return (
    <div className="bg-volturaNavy/30 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm truncate">{item.description}</p>
          {item.footage && (
            <p className="text-gray-500 text-xs">{item.footage}ft custom</p>
          )}
        </div>
        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
          item.tier === 'good' ? 'bg-gray-600 text-gray-300' :
          item.tier === 'best' ? 'bg-volturaGold/20 text-volturaGold' :
          'bg-blue-900 text-blue-300'
        }`}>
          {item.tier === 'good' ? 'G' : item.tier === 'best' ? 'Bst' : 'B'}
        </span>
        <span className="text-volturaGold font-semibold text-sm whitespace-nowrap">
          ${item.price.toLocaleString()}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="text-red-400/60 hover:text-red-400 text-lg leading-none px-1"
        >
          &times;
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-volturaNavy/50 pt-2 space-y-2">
          {/* Tier toggle */}
          <div className="flex gap-1">
            {TIER_LABELS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onTierChange(key)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  item.tier === key
                    ? 'bg-volturaGold text-volturaBlue'
                    : 'bg-volturaNavy/50 text-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Footage input for wire/conduit items */}
          {isFootage && pricebookEntry && (
            <FootageInput
              footageGroup={pricebookEntry.footage_group ?? ''}
              brackets={brackets}
              perFootRate={pricebookEntry.per_foot_rate ?? 0}
              selectedBracketIndex={null}
              customFootage={item.footage ?? null}
              onBracketSelect={(_idx, price) => onFootageChange(null, price)}
              onCustomFootage={(ft, price) => onFootageChange(ft, price)}
            />
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

Run: `npx next build`

- [ ] **Step 3: Commit**

```bash
git add components/estimate-builder/LineItemRow.tsx
git commit -m "feat: add LineItemRow component with tier toggle and footage support"
```

---

### Task 4: LineItemList Component

**Files:**
- Create: `components/estimate-builder/LineItemList.tsx`

- [ ] **Step 1: Create LineItemList component**

```typescript
'use client'

import type { TierName, LineItem, PricebookEntry } from '@/types'
import { LineItemRow } from './LineItemRow'

interface LineItemListProps {
  items: LineItem[]
  pricebook: PricebookEntry[]
  onTierChange: (index: number, tier: TierName) => void
  onFootageChange: (index: number, footage: number | null, price: number) => void
  onRemove: (index: number) => void
}

export function LineItemList({ items, pricebook, onTierChange, onFootageChange, onRemove }: LineItemListProps) {
  if (items.length === 0) return null

  // Find matching pricebook entry for each item by description
  function findEntry(item: LineItem): PricebookEntry | undefined {
    return pricebook.find((p) => p.job_type === item.description || p.footage_group === item.description?.split(' ').slice(0, -2).join(' '))
  }

  return (
    <div>
      <label className="block text-gray-400 text-sm mb-2">
        Line Items ({items.length})
      </label>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <LineItemRow
            key={`${item.description}-${i}`}
            item={item}
            pricebookEntry={findEntry(item)}
            onTierChange={(tier) => onTierChange(i, tier)}
            onFootageChange={(ft, price) => onFootageChange(i, ft, price)}
            onRemove={() => onRemove(i)}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build, commit**

```bash
npx next build
git add components/estimate-builder/LineItemList.tsx
git commit -m "feat: add LineItemList component"
```

---

### Task 5: CategoryGrid + CategorySheet Components

**Files:**
- Create: `components/estimate-builder/CategoryGrid.tsx`
- Create: `components/estimate-builder/CategorySheet.tsx`

- [ ] **Step 1: Create CategoryGrid component**

```typescript
'use client'

import { useState } from 'react'
import type { PricebookEntry, TierName } from '@/types'
import { CategorySheet } from './CategorySheet'

const CATEGORIES = [
  { name: 'Panel & Service', icon: '⚡' },
  { name: 'Wiring & Circuits', icon: '🔌' },
  { name: 'Conduit & Feeders', icon: '🔧' },
  { name: 'Fixtures & Devices', icon: '💡' },
  { name: 'Troubleshoot', icon: '🔍' },
  { name: 'Specialty', icon: '⭐' },
]

interface CategoryGridProps {
  pricebook: PricebookEntry[]
  onAddItem: (entry: PricebookEntry, tier: TierName) => void
}

export function CategoryGrid({ pricebook, onAddItem }: CategoryGridProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(null)

  const categoryEntries = openCategory
    ? pricebook.filter((p) => p.category === openCategory)
    : []

  return (
    <div>
      <label className="block text-gray-400 text-sm mb-2">Add Line Items</label>
      <div className="grid grid-cols-3 gap-2">
        {CATEGORIES.map((cat) => {
          const count = pricebook.filter((p) => p.category === cat.name).length
          return (
            <button
              key={cat.name}
              onClick={() => setOpenCategory(cat.name)}
              className="bg-volturaNavy/50 rounded-xl p-3 text-center hover:bg-volturaNavy transition-colors"
            >
              <span className="text-2xl block mb-1">{cat.icon}</span>
              <span className="text-white text-xs font-semibold block">{cat.name}</span>
              <span className="text-gray-500 text-xs">{count} items</span>
            </button>
          )
        })}
      </div>

      <CategorySheet
        open={openCategory !== null}
        onClose={() => setOpenCategory(null)}
        category={openCategory ?? ''}
        entries={categoryEntries}
        onAddItem={onAddItem}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create CategorySheet component**

```typescript
'use client'

import type { PricebookEntry, TierName } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'

interface CategorySheetProps {
  open: boolean
  onClose: () => void
  category: string
  entries: PricebookEntry[]
  onAddItem: (entry: PricebookEntry, tier: TierName) => void
}

export function CategorySheet({ open, onClose, category, entries, onAddItem }: CategorySheetProps) {
  // Group footage items by footage_group
  const footageGroups = new Map<string, PricebookEntry[]>()
  const regularItems: PricebookEntry[] = []

  for (const entry of entries) {
    if (entry.is_footage_item && entry.footage_group) {
      const existing = footageGroups.get(entry.footage_group) ?? []
      existing.push(entry)
      footageGroups.set(entry.footage_group, existing)
    } else {
      regularItems.push(entry)
    }
  }

  function handleAdd(entry: PricebookEntry) {
    onAddItem(entry, 'better')
    // Don't close — let user add multiple items
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={category}>
      <div className="max-h-[60vh] overflow-y-auto space-y-1.5 -mx-1 px-1">
        {/* Regular items */}
        {regularItems.map((entry) => (
          <button
            key={entry.id}
            onClick={() => handleAdd(entry)}
            className="w-full flex items-center justify-between bg-volturaNavy/30 rounded-xl px-4 py-3 text-left hover:bg-volturaNavy/50 transition-colors"
          >
            <span className="text-white text-sm flex-1 mr-3">{entry.job_type}</span>
            <span className="text-volturaGold text-sm font-semibold">
              ${(entry.price_better ?? entry.price_good ?? 0).toLocaleString()}
            </span>
          </button>
        ))}

        {/* Footage groups */}
        {Array.from(footageGroups.entries()).map(([group, groupEntries]) => (
          <div key={group} className="bg-volturaNavy/30 rounded-xl px-4 py-3">
            <p className="text-white text-sm font-semibold mb-2">{group}</p>
            <div className="grid grid-cols-3 gap-2">
              {groupEntries
                .sort((a, b) => (a.price_better ?? 0) - (b.price_better ?? 0))
                .map((entry, i) => {
                  const labels = ['0-25ft', '25-50ft', '50-100ft']
                  return (
                    <button
                      key={entry.id}
                      onClick={() => handleAdd(entry)}
                      className="bg-volturaNavy/50 rounded-lg py-2 px-2 text-center hover:bg-volturaNavy transition-colors"
                    >
                      <span className="text-gray-400 text-xs block">{labels[i] ?? entry.job_type}</span>
                      <span className="text-volturaGold text-xs font-semibold">
                        ${(entry.price_better ?? 0).toLocaleString()}
                      </span>
                    </button>
                  )
                })}
            </div>
          </div>
        ))}

        {entries.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No items in this category</p>
        )}
      </div>
    </BottomSheet>
  )
}
```

- [ ] **Step 3: Verify build, commit**

```bash
npx next build
git add components/estimate-builder/CategoryGrid.tsx components/estimate-builder/CategorySheet.tsx
git commit -m "feat: add CategoryGrid and CategorySheet for browsing pricebook by category"
```

---

### Task 6: PrimaryJobSelector Component

**Files:**
- Create: `components/estimate-builder/PrimaryJobSelector.tsx`

- [ ] **Step 1: Create PrimaryJobSelector**

This replaces `JobTypeSelector.tsx` for the primary job slot. Shows all categories but selects a single item with tier cards.

```typescript
'use client'

import { useState } from 'react'
import type { PricebookEntry } from '@/types'

interface PrimaryJobSelectorProps {
  pricebook: PricebookEntry[]
  selected: string | null
  onSelect: (jobType: string) => void
  onSkip: () => void
}

const CATEGORIES = [
  { name: 'Panel & Service', icon: '⚡' },
  { name: 'Wiring & Circuits', icon: '🔌' },
  { name: 'Conduit & Feeders', icon: '🔧' },
  { name: 'Fixtures & Devices', icon: '💡' },
  { name: 'Troubleshoot', icon: '🔍' },
  { name: 'Specialty', icon: '⭐' },
]

export function PrimaryJobSelector({ pricebook, selected, onSelect, onSkip }: PrimaryJobSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Filter non-footage items (footage items are typically add-ons, not primary jobs)
  const filteredEntries = activeCategory
    ? pricebook.filter((p) => p.category === activeCategory && !p.is_footage_item)
    : []

  if (selected) {
    return (
      <div className="bg-volturaNavy/50 rounded-xl p-3 flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-xs">Primary Job</p>
          <p className="text-white font-semibold text-sm">{selected}</p>
        </div>
        <button onClick={() => onSelect('')} className="text-gray-500 text-xs">Change</button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-gray-400 text-sm">Primary Job</label>
        <button onClick={onSkip} className="text-gray-500 text-xs underline">Skip — add items below</button>
      </div>

      {/* Category pills */}
      <div className="flex gap-1.5 flex-wrap mb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeCategory === cat.name
                ? 'bg-volturaGold text-volturaBlue'
                : 'bg-volturaNavy/50 text-gray-400'
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Items in selected category */}
      {activeCategory && (
        <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto">
          {filteredEntries.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.job_type)}
              className="text-left px-4 py-3 rounded-xl text-sm bg-volturaNavy/50 text-white hover:bg-volturaNavy transition-colors"
            >
              {p.job_type}
            </button>
          ))}
          {filteredEntries.length === 0 && (
            <p className="text-gray-500 text-sm py-4 text-center">No items in this category</p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build, commit**

```bash
npx next build
git add components/estimate-builder/PrimaryJobSelector.tsx
git commit -m "feat: add PrimaryJobSelector with category filtering"
```

---

### Task 7: Rewrite EstimateBuilder

**Files:**
- Modify: `components/estimate-builder/EstimateBuilder.tsx` (full rewrite)
- Modify: `components/estimate-builder/LiveTotal.tsx`

This is the core task — rewiring the main component to manage multiple line items.

- [ ] **Step 1: Update LiveTotal to accept all item types**

```typescript
import type { LineItem, Addon } from '@/types'

export function calculateTotal(
  primaryItems: LineItem[],
  additionalItems: LineItem[],
  addons: Addon[],
  customItems: LineItem[]
): number {
  const primary = primaryItems.reduce((sum, item) => sum + item.price, 0)
  const additional = additionalItems.reduce((sum, item) => sum + item.price, 0)
  const addonTotal = addons.filter((a) => a.selected).reduce((sum, a) => sum + a.price, 0)
  const custom = customItems.reduce((sum, item) => sum + item.price, 0)
  return primary + additional + addonTotal + custom
}

export function LiveTotal({
  primaryItems,
  additionalItems,
  addons,
  customItems,
}: {
  primaryItems: LineItem[]
  additionalItems: LineItem[]
  addons: Addon[]
  customItems: LineItem[]
}) {
  const total = calculateTotal(primaryItems, additionalItems, addons, customItems)
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400 text-sm">Total</span>
      <span className="text-volturaGold text-2xl font-bold">${total.toLocaleString('en-US')}</span>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite EstimateBuilder.tsx**

Full replacement of `components/estimate-builder/EstimateBuilder.tsx`:

```typescript
'use client'

import { useState, useCallback } from 'react'
import type { PricebookEntry, LineItem, Addon, TierName, AIPageContext } from '@/types'
import { DEFAULT_ADDONS } from '@/types'
import { CustomerSelector } from './CustomerSelector'
import { PrimaryJobSelector } from './PrimaryJobSelector'
import { TierCards } from './TierCards'
import { CategoryGrid } from './CategoryGrid'
import { LineItemList } from './LineItemList'
import { AddOnsPanel } from './AddOnsPanel'
import { CustomLineItems } from './CustomLineItems'
import { LiveTotal, calculateTotal } from './LiveTotal'
import { SendSheet } from './SendSheet'
import { AIContextProvider } from './AIContextProvider'
import { saveEstimate } from '@/lib/actions/estimates'

interface EstimateBuilderProps {
  estimateId: string
  pricebook: PricebookEntry[]
  initialCustomerId?: string
  initialCustomerName?: string
  initialEstimate?: {
    tier_selected: TierName | null
    line_items: LineItem[] | null
    addons: Addon[] | null
    notes: string | null
    jobType?: string
  }
}

function buildTierLineItem(entry: PricebookEntry, tier: TierName): LineItem {
  const price = tier === 'good' ? entry.price_good : tier === 'better' ? entry.price_better : entry.price_best
  const desc = tier === 'good' ? entry.description_good : tier === 'better' ? entry.description_better : entry.description_best
  return {
    description: desc ?? entry.job_type,
    price: price ?? 0,
    is_override: false,
    original_price: price ?? 0,
    tier,
    category: entry.category,
    is_primary: true,
  }
}

export function EstimateBuilder({ estimateId, pricebook, initialCustomerId, initialCustomerName, initialEstimate }: EstimateBuilderProps) {
  // Customer
  const [customerId, setCustomerId] = useState(initialCustomerId ?? null)
  const [customerName, setCustomerName] = useState(initialCustomerName ?? null)

  // Primary job
  const [primaryJobType, setPrimaryJobType] = useState<string | null>(initialEstimate?.jobType ?? null)
  const [primaryTier, setPrimaryTier] = useState<TierName | null>(initialEstimate?.tier_selected ?? null)
  const [primarySkipped, setPrimarySkipped] = useState(false)
  const [tierLineItems, setTierLineItems] = useState<Record<TierName, LineItem>>({
    good: { description: '', price: 0, is_override: false, original_price: 0, tier: 'good' },
    better: { description: '', price: 0, is_override: false, original_price: 0, tier: 'better' },
    best: { description: '', price: 0, is_override: false, original_price: 0, tier: 'best' },
  })

  // Additional items
  const [additionalItems, setAdditionalItems] = useState<LineItem[]>(
    () => (initialEstimate?.line_items ?? []).filter((li) => !li.is_primary)
  )

  // Add-ons and custom items
  const [addons, setAddons] = useState<Addon[]>(
    initialEstimate?.addons ?? DEFAULT_ADDONS.map((a) => ({ ...a, selected: false }))
  )
  const [customItems, setCustomItems] = useState<LineItem[]>([])
  const [notes, setNotes] = useState(initialEstimate?.notes ?? '')

  // UI state
  const [sendOpen, setSendOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Primary job handlers
  const handlePrimaryJobSelect = useCallback((jobType: string) => {
    if (!jobType) {
      setPrimaryJobType(null)
      setPrimaryTier(null)
      return
    }
    const entry = pricebook.find((p) => p.job_type === jobType)
    if (!entry) return
    setPrimaryJobType(jobType)
    setPrimaryTier(null)
    setPrimarySkipped(false)
    setTierLineItems({
      good: buildTierLineItem(entry, 'good'),
      better: buildTierLineItem(entry, 'better'),
      best: buildTierLineItem(entry, 'best'),
    })
  }, [pricebook])

  const handleTierSelect = useCallback((tier: TierName) => {
    setPrimaryTier(tier)
  }, [])

  const handleTierPriceChange = useCallback((tier: TierName, newPrice: number) => {
    setTierLineItems((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], price: newPrice, is_override: newPrice !== prev[tier].original_price },
    }))
  }, [])

  const handleTierDescChange = useCallback((tier: TierName, desc: string) => {
    setTierLineItems((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], description: desc },
    }))
  }, [])

  // Additional item handlers
  const handleAddItem = useCallback((entry: PricebookEntry, tier: TierName) => {
    const price = tier === 'good' ? entry.price_good : tier === 'better' ? entry.price_better : entry.price_best
    const desc = tier === 'good' ? entry.description_good : tier === 'better' ? entry.description_better : entry.description_best
    const newItem: LineItem = {
      description: desc ?? entry.job_type,
      price: price ?? 0,
      is_override: false,
      original_price: price ?? 0,
      tier,
      category: entry.category,
      is_primary: false,
      footage: entry.is_footage_item ? null : undefined,
    }
    setAdditionalItems((prev) => [...prev, newItem])
  }, [])

  const handleAdditionalTierChange = useCallback((index: number, tier: TierName) => {
    setAdditionalItems((prev) => prev.map((item, i) => {
      if (i !== index) return item
      // Find pricebook entry to get the new tier's price
      const entry = pricebook.find((p) =>
        p.job_type === item.description ||
        p.description_good === item.description ||
        p.description_better === item.description ||
        p.description_best === item.description
      )
      if (!entry) return { ...item, tier }
      const price = tier === 'good' ? entry.price_good : tier === 'better' ? entry.price_better : entry.price_best
      const desc = tier === 'good' ? entry.description_good : tier === 'better' ? entry.description_better : entry.description_best
      return {
        ...item,
        tier,
        price: item.footage ? Math.round((entry.per_foot_rate ?? 0) * item.footage) : (price ?? item.price),
        description: desc ?? entry.job_type,
        original_price: price ?? item.original_price,
      }
    }))
  }, [pricebook])

  const handleFootageChange = useCallback((index: number, footage: number | null, price: number) => {
    setAdditionalItems((prev) => prev.map((item, i) =>
      i === index ? { ...item, footage, price, is_override: footage !== null } : item
    ))
  }, [])

  const handleRemoveAdditional = useCallback((index: number) => {
    setAdditionalItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Addon handlers
  const handleAddonToggle = useCallback((index: number) => {
    setAddons((prev) => prev.map((a, i) => i === index ? { ...a, selected: !a.selected } : a))
  }, [])

  const handleAddonPriceChange = useCallback((index: number, price: number) => {
    setAddons((prev) => prev.map((a, i) => i === index ? { ...a, price } : a))
  }, [])

  // Custom item handlers
  const addCustomItem = useCallback(() => {
    setCustomItems((prev) => [...prev, { description: 'Custom item', price: 0, is_override: false, original_price: null }])
  }, [])

  const updateCustomItem = useCallback((index: number, updates: Partial<LineItem>) => {
    setCustomItems((prev) => prev.map((item, i) => i === index ? { ...item, ...updates } : item))
  }, [])

  const removeCustomItem = useCallback((index: number) => {
    setCustomItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Build all line items for saving
  const primaryItems: LineItem[] = primaryTier ? [tierLineItems[primaryTier]] : []
  const allLineItems = [...primaryItems.map((li) => ({ ...li, is_primary: true })), ...additionalItems]
  const total = calculateTotal(primaryItems, additionalItems, addons, customItems)

  async function handleSave() {
    setSaving(true)
    try {
      await saveEstimate(estimateId, {
        tierSelected: primaryTier ?? undefined,
        lineItems: [...allLineItems, ...customItems],
        addons,
        subtotal: total,
        total,
        notes,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const aiContext: AIPageContext = {
    mode: 'estimate',
    jobType: primaryJobType ?? undefined,
    currentLineItems: allLineItems,
  }

  const hasItems = allLineItems.length > 0 || customItems.length > 0

  return (
    <AIContextProvider context={aiContext}>
      <div className="px-4 pt-4 pb-40 space-y-6">
        <CustomerSelector
          selectedId={customerId}
          selectedName={customerName}
          onSelect={(id, name) => { setCustomerId(id); setCustomerName(name) }}
        />

        {/* Primary job */}
        {!primarySkipped && (
          <>
            <PrimaryJobSelector
              pricebook={pricebook}
              selected={primaryJobType}
              onSelect={handlePrimaryJobSelect}
              onSkip={() => setPrimarySkipped(true)}
            />

            {primaryJobType && (
              <TierCards
                items={tierLineItems}
                selectedTier={primaryTier}
                onTierSelect={handleTierSelect}
                onPriceChange={handleTierPriceChange}
                onDescChange={handleTierDescChange}
              />
            )}
          </>
        )}

        {primarySkipped && (
          <div className="bg-volturaNavy/30 rounded-xl p-3 flex items-center justify-between">
            <p className="text-gray-500 text-sm">No primary job selected</p>
            <button onClick={() => setPrimarySkipped(false)} className="text-volturaGold text-xs">Add one</button>
          </div>
        )}

        {/* Category grid for additional items */}
        <CategoryGrid pricebook={pricebook} onAddItem={handleAddItem} />

        {/* Added line items */}
        <LineItemList
          items={additionalItems}
          pricebook={pricebook}
          onTierChange={handleAdditionalTierChange}
          onFootageChange={handleFootageChange}
          onRemove={handleRemoveAdditional}
        />

        <AddOnsPanel addons={addons} onToggle={handleAddonToggle} onPriceChange={handleAddonPriceChange} />
        <CustomLineItems items={customItems} onAdd={addCustomItem} onUpdate={updateCustomItem} onRemove={removeCustomItem} />

        <div>
          <label className="block text-gray-400 text-sm mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold" placeholder="Notes for this estimate..." />
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-volturaBlue border-t border-volturaNavy z-30 px-4 py-3">
        <LiveTotal primaryItems={primaryItems} additionalItems={additionalItems} addons={addons} customItems={customItems} />
        <div className="flex gap-2 mt-2">
          <button onClick={handleSave} disabled={saving || !hasItems} className="flex-1 bg-volturaNavy text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50">
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Draft'}
          </button>
          <button onClick={() => { handleSave(); setSendOpen(true) }} disabled={!hasItems} className="flex-1 bg-volturaGold text-volturaBlue py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
            Send
          </button>
        </div>
      </div>

      <SendSheet open={sendOpen} onClose={() => setSendOpen(false)} estimateId={estimateId} total={total} />
    </AIContextProvider>
  )
}
```

- [ ] **Step 3: Verify build passes**

Run: `npx next build`
Expected: Compiles. The old `JobTypeSelector.tsx` is no longer imported but can remain in the codebase (dead code).

- [ ] **Step 4: Commit**

```bash
git add components/estimate-builder/EstimateBuilder.tsx components/estimate-builder/LiveTotal.tsx
git commit -m "feat: rewrite EstimateBuilder for multi-line-item support with categories"
```

---

### Task 8: Update Public Estimate View

**Files:**
- Modify: `app/estimates/[id]/view/page.tsx`

- [ ] **Step 1: Update public view to show multi-line items with primary job highlighted**

```typescript
import { getPublicEstimate } from '@/lib/actions/estimates'
import { notFound } from 'next/navigation'

export default async function PublicEstimateView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const estimate = await getPublicEstimate(id)
  if (!estimate) notFound()

  const lineItems = estimate.line_items ?? []
  const primaryItems = lineItems.filter((li) => li.is_primary)
  const additionalItems = lineItems.filter((li) => !li.is_primary)
  const addons = (estimate.addons ?? []).filter((a) => a.selected)
  const total = estimate.total ?? 0

  return (
    <div className="min-h-dvh bg-volturaBlue px-4 py-8 max-w-lg mx-auto">
      <header className="mb-8">
        <h1 className="text-volturaGold text-3xl font-bold tracking-widest">VOLTURA</h1>
        <p className="text-gray-400 text-sm">Power Group — Colorado Springs, CO</p>
        <p className="text-gray-400 text-xs mt-1">License #3001608</p>
      </header>

      <div className="bg-volturaNavy rounded-2xl p-5 mb-4">
        <p className="text-gray-400 text-sm mb-1">Estimate for</p>
        <p className="text-white text-xl font-bold">{estimate.customer.name}</p>
      </div>

      {/* Primary job */}
      {primaryItems.length > 0 && (
        <div className="mb-2">
          {primaryItems.map((item, i) => (
            <div key={i} className="flex justify-between items-start bg-volturaNavy rounded-xl px-4 py-3">
              <div className="flex-1 mr-4">
                <span className="text-white text-sm font-semibold">{item.description}</span>
                {item.footage && (
                  <span className="text-gray-400 text-xs block">{item.footage}ft</span>
                )}
              </div>
              <span className="text-volturaGold font-bold whitespace-nowrap">${item.price.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Additional items */}
      {additionalItems.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {additionalItems.map((item, i) => (
            <div key={i} className="flex justify-between items-start bg-volturaNavy/50 rounded-xl px-4 py-3">
              <div className="flex-1 mr-4">
                <span className="text-white text-sm">{item.description}</span>
                {item.footage && (
                  <span className="text-gray-400 text-xs block">{item.footage}ft</span>
                )}
              </div>
              <span className="text-volturaGold font-semibold whitespace-nowrap">${item.price.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add-ons */}
      {addons.length > 0 && (
        <div className="space-y-1.5 mb-6">
          {addons.map((addon, i) => (
            <div key={`a-${i}`} className="flex justify-between items-start bg-volturaNavy/30 rounded-xl px-4 py-3">
              <span className="text-gray-300 text-sm flex-1 mr-4">{addon.name}</span>
              <span className="text-volturaGold font-semibold whitespace-nowrap">+${addon.price.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-volturaNavy rounded-2xl p-5 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Total</span>
          <span className="text-volturaGold text-3xl font-bold">${total.toLocaleString()}</span>
        </div>
      </div>

      <div className="bg-volturaNavy/50 rounded-2xl p-5 mb-8">
        <p className="text-gray-400 text-sm font-semibold mb-2">Payment Methods Accepted</p>
        <p className="text-white text-sm">Check &middot; Zelle &middot; Cash &middot; Credit Card</p>
      </div>

      <footer className="text-center text-gray-500 text-sm">
        <p>Questions? Call Dev</p>
        <p className="text-volturaGold">Voltura Power Group &middot; Colorado Springs</p>
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Verify build, commit**

```bash
npx next build
git add app/estimates/[id]/view/page.tsx
git commit -m "feat: update public estimate view for multi-line items"
```

---

### Task 9: Update Pricebook Settings Page

**Files:**
- Modify: `components/settings/PricebookTable.tsx`

- [ ] **Step 1: Update PricebookTable to group by category**

```typescript
'use client'

import { useState, useTransition } from 'react'
import type { PricebookEntry } from '@/types'
import { EditablePrice } from '@/components/ui/EditablePrice'
import { updatePricebookPrice } from '@/lib/actions/pricebook'

export function PricebookTable({ entries }: { entries: PricebookEntry[] }) {
  const [saved, setSaved] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Group by category
  const grouped: Record<string, PricebookEntry[]> = {}
  for (const entry of entries) {
    const cat = entry.category || 'Uncategorized'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(entry)
  }

  function handlePriceChange(id: string, field: 'price_good' | 'price_better' | 'price_best', value: number) {
    startTransition(async () => {
      await updatePricebookPrice(id, field, value)
      setSaved(id + field)
      setTimeout(() => setSaved(null), 1500)
    })
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h2 className="text-white font-semibold text-sm mb-2 sticky top-0 bg-volturaBlue py-1">{category}</h2>
          <div className="space-y-2">
            {items.map((entry) => (
              <div key={entry.id} className="bg-volturaNavy/50 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-white font-semibold text-sm">{entry.job_type}</p>
                  {entry.is_footage_item && (
                    <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">
                      ${entry.per_foot_rate}/ft
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(['price_good', 'price_better', 'price_best'] as const).map((field) => {
                    const label = field === 'price_good' ? 'Good' : field === 'price_better' ? 'Better' : 'Best'
                    const val = entry[field]
                    if (val === null) return <div key={field} className="text-gray-600 text-xs">—</div>
                    return (
                      <div key={field}>
                        <p className="text-gray-500 text-xs mb-1">{label}</p>
                        <EditablePrice
                          value={val}
                          onChange={(v) => handlePriceChange(entry.id, field, v)}
                          size="sm"
                        />
                        {saved === entry.id + field && (
                          <span className="text-green-400 text-xs">✓ Saved</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify build, commit**

```bash
npx next build
git add components/settings/PricebookTable.tsx
git commit -m "feat: group pricebook settings by category, show per-foot rate badge"
```

---

### Task 10: Update AI Tools for Multi-Line Estimates

**Files:**
- Modify: `lib/ai/tools.ts` (create_estimate tool definition + handler)
- Modify: `lib/ai/prompts.ts` (system prompt)

- [ ] **Step 1: Update create_estimate tool definition**

In `lib/ai/tools.ts`, find the `create_estimate` tool definition and replace it:

```typescript
  {
    name: 'create_estimate',
    description: 'Create a new estimate for a customer. Supports a primary job with Good/Better/Best tier, plus additional line items from the pricebook.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_id: { type: 'string', description: 'Customer UUID from search_customers result' },
        job_type: { type: 'string', description: 'Primary job type from the pricebook (optional — can skip for items-only estimates)' },
        tier: { type: 'string', enum: ['good', 'better', 'best'], description: 'Pricing tier for the primary job (default: better)' },
        additional_items: {
          type: 'array',
          description: 'Additional line items to add to the estimate',
          items: {
            type: 'object',
            properties: {
              job_type: { type: 'string', description: 'Job type from pricebook' },
              tier: { type: 'string', enum: ['good', 'better', 'best'], description: 'Tier (default: better)' },
              footage: { type: 'number', description: 'Custom footage for wire/conduit items' },
            },
            required: ['job_type'],
          },
        },
        notes: { type: 'string', description: 'Optional notes for the estimate' },
      },
      required: ['customer_id'],
    },
  },
```

- [ ] **Step 2: Update create_estimate handler**

Replace the `case 'create_estimate'` block in `executeTool()`:

```typescript
    case 'create_estimate': {
      const customerId = input.customer_id as string
      const primaryJobType = input.job_type as string | undefined
      const primaryTier = (input.tier as TierName) || 'better'
      const additionalItemsInput = (input.additional_items as { job_type: string; tier?: string; footage?: number }[]) || []
      const notes = (input.notes as string) || null

      const lineItems: { description: string; price: number; is_override: boolean; original_price: number; tier: string; category: string; is_primary: boolean; footage?: number | null }[] = []
      let total = 0

      // Primary job
      if (primaryJobType) {
        const { data: pbData, error: pbError } = await admin
          .from('pricebook')
          .select('*')
          .eq('job_type', primaryJobType)
          .eq('active', true)
          .single()
        if (pbError || !pbData) return `Error: Primary job type "${primaryJobType}" not found in pricebook. Use lookup_pricebook to see available types.`

        const priceField = `price_${primaryTier}` as keyof typeof pbData
        const descField = `description_${primaryTier}` as keyof typeof pbData
        const price = pbData[priceField] as number | null
        if (!price) return `Error: No ${primaryTier} tier pricing for "${primaryJobType}".`

        lineItems.push({
          description: (pbData[descField] as string) || primaryJobType,
          price,
          is_override: false,
          original_price: price,
          tier: primaryTier,
          category: (pbData.category as string) || 'Uncategorized',
          is_primary: true,
        })
        total += price
      }

      // Additional items
      for (const item of additionalItemsInput) {
        const tier = (item.tier as TierName) || 'better'
        const { data: pbData, error: pbError } = await admin
          .from('pricebook')
          .select('*')
          .eq('job_type', item.job_type)
          .eq('active', true)
          .single()
        if (pbError || !pbData) return `Error: Job type "${item.job_type}" not found in pricebook.`

        let price: number
        let isOverride = false

        if (item.footage && (pbData.per_foot_rate as number)) {
          price = Math.round((pbData.per_foot_rate as number) * item.footage)
          isOverride = true
        } else {
          const priceField = `price_${tier}` as keyof typeof pbData
          price = (pbData[priceField] as number) || 0
        }

        const descField = `description_${tier}` as keyof typeof pbData
        lineItems.push({
          description: (pbData[descField] as string) || item.job_type,
          price,
          is_override: isOverride,
          original_price: price,
          tier,
          category: (pbData.category as string) || 'Uncategorized',
          is_primary: false,
          footage: item.footage ?? null,
        })
        total += price
      }

      if (lineItems.length === 0) return 'Error: At least one job_type or additional_items entry is required.'

      // Get customer name
      const { data: customer } = await admin.from('customers').select('name').eq('id', customerId).single()
      const customerName = customer?.name || 'Unknown'

      const { data, error } = await admin
        .from('estimates')
        .insert({
          customer_id: customerId,
          status: 'Draft',
          tier_selected: primaryJobType ? primaryTier : null,
          line_items: lineItems,
          subtotal: total,
          total,
          notes,
        })
        .select('id, status, total, created_at')
        .single()
      if (error) return `Error creating estimate: ${error.message}`

      const summary = lineItems.map((li) =>
        `  - ${li.description}${li.footage ? ` (${li.footage}ft)` : ''}: $${li.price.toLocaleString()} [${li.tier}]${li.is_primary ? ' ★' : ''}`
      ).join('\n')

      return `Estimate created!
- Customer: ${customerName}
- Items:
${summary}
- Total: $${total.toLocaleString()}
- Status: Draft
- Estimate ID: ${data.id}

View and edit in the Estimates tab.`
    }
```

- [ ] **Step 3: Update system prompt in `lib/ai/prompts.ts`**

Add `additional_items` to the create_estimate tool docs:

Find `- create_estimate: Create a real estimate for a customer` and replace:

```
- create_estimate: Create an estimate with a primary job + optional additional line items
```

Find the instruction block about estimate creation and replace:

```
2. For estimates: use lookup_pricebook, then create_estimate (can include additional_items for multi-line estimates)
```

- [ ] **Step 4: Verify build, commit**

```bash
npx next build
git add lib/ai/tools.ts lib/ai/prompts.ts
git commit -m "feat: update AI create_estimate tool for multi-line estimates"
```

---

### Task 11: Run Pricebook SQL Migration + Full Build Verification

- [ ] **Step 1: Execute the SQL from Task 1 steps 1-4 against Supabase**

Use the Supabase REST API or SQL Editor to run all 4 SQL blocks from Task 1.

- [ ] **Step 2: Verify migration by querying**

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const c = createClient('https://hljjblwgpryrafvcukur.supabase.co', 'SERVICE_KEY_HERE');
c.from('pricebook').select('job_type, category, is_footage_item, footage_group, per_foot_rate').eq('active', true).order('category').then(r => console.log(JSON.stringify(r.data, null, 2)));
"
```

Expected: All entries show their category, new wire/conduit entries show `is_footage_item: true` with `footage_group` and `per_foot_rate`.

- [ ] **Step 3: Full build verification**

Run: `npx next build`
Expected: Clean compile, all routes listed.

- [ ] **Step 4: Start dev server and test**

Run: `npx next dev --turbopack`
Test in browser:
1. Navigate to `/estimates/new` — should see customer selector, primary job selector with category pills
2. Select a primary job → tier cards appear
3. Tap a category in the grid → bottom sheet opens with items
4. Add an item → appears in line item list
5. Expand a line item → tier toggle works
6. Total updates live
7. Navigate to `/settings/pricebook` — entries grouped by category

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: multi-line estimate builder — complete implementation"
```
