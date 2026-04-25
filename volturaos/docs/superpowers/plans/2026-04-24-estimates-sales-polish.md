# Estimates & Sales Polish — Implementation Plan

**Goal:** Fill every identified gap in the estimate/sales flow: pricebook descriptions, custom add-ons, valid-until dates, payment terms, clean discount display, category grouping, change order UI, printable approved copy, template previews, expiration countdown, builder category grouping, public upsell suggestions, and referral Telegram notifications.

**Architecture:** All DB changes are additive (new nullable columns). No existing data is touched. New fields flow: DB migration → types/index.ts → saveEstimate action → builder UI → public view. Change orders reuse existing pricebook components. PDF/print uses `window.print()` + `@media print` CSS — no new library.

**Tech Stack:** Next.js 15 App Router · TypeScript · Tailwind CSS v4 · Supabase (admin client) · existing pricebook/estimate infrastructure

---

## Pre-flight: DB Migrations (run in Supabase SQL editor FIRST)

```sql
-- Task 4 & 5: valid_until + payment_terms on estimates
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS valid_until date;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS payment_terms text;
```

Run this once before starting any tasks. No rows returned = success.

---

## Task 1: Pricebook descriptions auto-populate (Item 2)

**Status check — verify it's actually broken first.**

**Files:**
- Check: `components/estimate-builder/useEstimateEditor.ts` line ~122
- Check: `components/estimate-builder/QuickAddSheet.tsx`
- Check: `components/estimate-builder/CategoryGrid.tsx`

**Steps:**

- [ ] Open `useEstimateEditor.ts` and search for all places a `LineItem` is constructed from a pricebook entry. Confirm `pricebook_description: entry.description_good ?? undefined` is present in ALL paths (QuickAdd, CategoryGrid, PrimaryJobSelector).

- [ ] Open `components/estimate-builder/QuickAddSheet.tsx` — find where it calls `onAdd`. Confirm the passed item includes `pricebook_description`.

- [ ] Open `components/estimate-builder/CategoryGrid.tsx` — same check. If any `onAdd` call is missing `pricebook_description`, add it:
```typescript
// In every spot that builds a LineItem from a PricebookEntry:
{
  description: entry.job_type,
  price: entry.price_better ?? entry.price_good ?? 0,
  is_override: false,
  original_price: entry.price_better ?? entry.price_good ?? 0,
  pricebook_description: entry.description_good ?? entry.description_better ?? undefined,
  category: entry.category,
}
```

- [ ] Test in app: add a pricebook item that has a `description_good` value in Settings → Pricebook. On public view, confirm the `›` expand arrow appears and shows the description.

- [ ] Commit: `fix: ensure pricebook_description populates on all add-item paths`

---

## Task 2: Custom add-ons (Item 3)

**Files:**
- Modify: `components/estimate-builder/AddOnsPanel.tsx`
- Modify: `components/estimate-builder/useEstimateEditor.ts` (add `handleAddCustomAddon`)

**Steps:**

- [ ] Add `onAddCustom: (name: string, price: number) => void` to `AddOnsPanelProps`.

- [ ] Add local state + UI at the bottom of `AddOnsPanel.tsx`:
```tsx
const [customName, setCustomName] = useState('')
const [customPrice, setCustomPrice] = useState('')

// Below existing addons list:
<div className="mt-3 border-t border-white/5 pt-3">
  <p className="text-gray-500 text-xs mb-2">Add custom add-on</p>
  <div className="flex gap-2">
    <input
      value={customName}
      onChange={e => setCustomName(e.target.value)}
      placeholder="Name"
      className="flex-1 bg-volturaNavy text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold"
    />
    <input
      value={customPrice}
      onChange={e => setCustomPrice(e.target.value)}
      inputMode="decimal"
      placeholder="$"
      className="w-20 bg-volturaNavy text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold"
    />
    <button
      onClick={() => {
        const p = parseFloat(customPrice)
        if (!customName.trim() || !p) return
        onAddCustom(customName.trim(), p)
        setCustomName(''); setCustomPrice('')
      }}
      className="bg-volturaNavy text-volturaGold px-3 py-2 rounded-lg text-sm font-semibold active:opacity-70"
    >
      Add
    </button>
  </div>
</div>
```

- [ ] In `useEstimateEditor.ts`, add `handleAddCustomAddon`:
```typescript
const handleAddCustomAddon = useCallback((name: string, price: number) => {
  setAddons(prev => [...prev, { name, price, selected: true, original_price: price }])
}, [])
```

- [ ] Wire `onAddCustom={handleAddCustomAddon}` in `EstimateBuilder.tsx` where `AddOnsPanel` is rendered.

- [ ] Commit: `feat: add custom add-ons to estimate builder`

---

## Task 3: Valid-until date + expiration countdown (Items 4 + Polish)

**Files:**
- Modify: `types/index.ts` — add `valid_until` to `Estimate` interface
- Modify: `lib/actions/estimates.ts` — `saveEstimate` + `getPublicEstimate`
- Modify: `components/estimate-builder/EstimateBuilder.tsx` — date picker input
- Modify: `app/estimates/[id]/view/page.tsx` — display + countdown
- Modify: `components/estimates/PresentMode.tsx` — show in scope view

**Steps:**

- [ ] In `types/index.ts`, add to `Estimate` interface:
```typescript
valid_until: string | null  // ISO date string e.g. "2026-05-15"
```

- [ ] In `lib/actions/estimates.ts` → `saveEstimate` updates object, add:
```typescript
valid_until: updates.validUntil ?? null,
```
And add `validUntil?: string | null` to the `updates` parameter type.

- [ ] In `EstimateBuilder.tsx`, find the notes section and add below it:
```tsx
<div>
  <label className="block text-gray-400 text-sm mb-1">Valid until (optional)</label>
  <input
    type="date"
    value={validUntil ?? ''}
    onChange={e => setValidUntil(e.target.value || null)}
    className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold"
    style={{ colorScheme: 'dark' }}
  />
</div>
```
Add `validUntil` state to `useEstimateEditor` (initialized from `initialEstimate?.valid_until ?? null`) and include it in the save payload.

- [ ] In `app/estimates/[id]/view/page.tsx`, add expiration display after the customer card:
```tsx
{solo.valid_until && (() => {
  const days = Math.ceil((new Date(solo.valid_until).getTime() - Date.now()) / 86400000)
  if (days < 0) return (
    <div className="bg-red-900/30 border border-red-500/30 rounded-xl px-4 py-3 mb-4 text-red-400 text-sm text-center">
      This estimate has expired
    </div>
  )
  return (
    <div className={`rounded-xl px-4 py-3 mb-4 text-sm text-center ${days <= 3 ? 'bg-red-900/30 border border-red-500/30 text-red-400' : 'bg-volturaNavy/50 text-gray-400'}`}>
      {days === 0 ? 'Expires today' : `Valid for ${days} more day${days === 1 ? '' : 's'}`}
    </div>
  )
})()}
```

- [ ] Commit: `feat: valid-until date on estimates with expiration countdown on public view`

---

## Task 4: Deposit / payment terms (Item 5)

**Files:**
- Modify: `types/index.ts`
- Modify: `lib/actions/estimates.ts`
- Modify: `components/estimate-builder/EstimateBuilder.tsx` (or `useEstimateEditor.ts`)
- Modify: `app/estimates/[id]/view/page.tsx`

**Steps:**

- [ ] In `types/index.ts`, add to `Estimate` interface:
```typescript
payment_terms: string | null
```

- [ ] In `saveEstimate`, add `payment_terms: updates.paymentTerms ?? null` and add `paymentTerms?: string | null` to the updates param type.

- [ ] In the estimate builder, add a payment terms input below valid_until:
```tsx
<div>
  <label className="block text-gray-400 text-sm mb-1">Payment terms (optional)</label>
  <input
    value={paymentTerms ?? ''}
    onChange={e => setPaymentTerms(e.target.value || null)}
    placeholder="e.g. 50% deposit required to schedule"
    className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold"
  />
</div>
```
Quick-tap presets as buttons above the input:
```tsx
{['50% deposit to schedule', 'Full payment on completion', 'Net 15 days'].map(preset => (
  <button key={preset} onClick={() => setPaymentTerms(preset)}
    className="text-xs bg-volturaNavy/50 text-gray-400 px-3 py-1.5 rounded-lg active:opacity-70">
    {preset}
  </button>
))}
```

- [ ] In `app/estimates/[id]/view/page.tsx`, replace the current payment methods card:
```tsx
<div className="bg-volturaNavy/50 rounded-2xl p-5 mb-6">
  <p className="text-gray-400 text-sm font-semibold mb-2">Payment Methods Accepted</p>
  <p className="text-white text-sm">Check · Zelle · Cash · Credit Card</p>
  {solo.payment_terms && (
    <p className="text-volturaGold text-sm mt-2 font-medium">{solo.payment_terms}</p>
  )}
</div>
```

- [ ] Commit: `feat: payment terms field on estimates`

---

## Task 5: Clean discount display on public view (Item 6)

The builder already handles % and $ discounts correctly. The fix is purely how negative line items render on the public-facing view.

**Files:**
- Modify: `components/estimates/LineItemsList.tsx`
- Modify: `app/estimates/[id]/view/page.tsx` (the addons section, check for negative)

**Steps:**

- [ ] In `LineItemsList.tsx`, update `ExpandableLineItem` to detect discounts:
```tsx
export function ExpandableLineItem({ item }: { item: LineItem }) {
  const [open, setOpen] = useState(false)
  const hasDesc = !!item.pricebook_description
  const isDiscount = item.price < 0

  if (isDiscount) {
    return (
      <div className="border-b border-white/5 last:border-0 py-2 flex items-center justify-between min-h-[44px]">
        <span className="flex items-center gap-2">
          <span className="text-xs bg-green-900/40 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">Discount</span>
          <span className="text-gray-400 text-sm">{item.description}</span>
        </span>
        <span className="text-green-400 text-sm font-semibold shrink-0">-${Math.abs(item.price).toLocaleString()}</span>
      </div>
    )
  }

  return (
    // ... existing non-discount rendering unchanged
  )
}
```

- [ ] Also update `LineItemsList` to show a "Subtotal before discounts" and "You save" line if any discounts exist:
```tsx
export function LineItemsList({ items }: { items: LineItem[] }) {
  const discounts = items.filter(i => i.price < 0)
  const hasDiscounts = discounts.length > 0
  const subtotalBeforeDiscount = items.filter(i => i.price > 0).reduce((s, i) => s + i.price, 0)
  const savings = Math.abs(discounts.reduce((s, i) => s + i.price, 0))

  return (
    <div>
      {items.map((item, i) => <ExpandableLineItem key={i} item={item} />)}
      {hasDiscounts && (
        <div className="border-t border-white/10 mt-2 pt-2 flex justify-between items-center">
          <span className="text-green-400 text-sm font-semibold">You save</span>
          <span className="text-green-400 text-sm font-bold">${savings.toLocaleString()}</span>
        </div>
      )}
    </div>
  )
}
```

- [ ] Commit: `feat: discount line items render as styled badges with savings summary on public view`

---

## Task 6: Category grouping in line items (Items 7 + Polish)

Applies to both the public view and the estimate builder line item list.

**Files:**
- Modify: `components/estimates/LineItemsList.tsx` — public view
- Modify: `components/estimate-builder/LineItemList.tsx` (or wherever line items render in builder)

**Steps:**

- [ ] In `LineItemsList.tsx`, update `LineItemsList` to group by category:
```tsx
export function LineItemsList({ items }: { items: LineItem[] }) {
  // Separate discounts
  const regular = items.filter(i => i.price >= 0)
  const discounts = items.filter(i => i.price < 0)
  const savings = Math.abs(discounts.reduce((s, i) => s + i.price, 0))

  // Group regular items by category
  const groups = new Map<string, LineItem[]>()
  for (const item of regular) {
    const cat = item.category ?? ''
    if (!groups.has(cat)) groups.set(cat, [])
    groups.get(cat)!.push(item)
  }

  return (
    <div>
      {Array.from(groups.entries()).map(([cat, groupItems]) => (
        <div key={cat}>
          {cat && (
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest pt-3 pb-1 first:pt-0">
              {cat.split(' / ').pop()}
            </p>
          )}
          {groupItems.map((item, i) => <ExpandableLineItem key={`${cat}-${i}`} item={item} />)}
        </div>
      ))}
      {discounts.map((item, i) => <ExpandableLineItem key={`d-${i}`} item={item} />)}
      {discounts.length > 0 && (
        <div className="border-t border-white/10 mt-2 pt-2 flex justify-between items-center">
          <span className="text-green-400 text-sm font-semibold">You save</span>
          <span className="text-green-400 text-sm font-bold">${savings.toLocaleString()}</span>
        </div>
      )}
    </div>
  )
}
```

- [ ] Find where line items are listed in the estimate builder (likely `components/estimate-builder/LineItemList.tsx` or inside `EstimateBuilder.tsx`). Add the same category grouping with section headers. Keep the drag-to-reorder / delete buttons — just wrap each group in a `<div>` with a header label.

- [ ] Commit: `feat: group line items by category in public view and estimate builder`

---

## Task 7: Change order button on job page (Item 9)

Change orders are fully built (`app/(app)/jobs/[id]/change-order/new/page.tsx`, `lib/actions/change-orders.ts`). They just need a visible entry point on the job detail page.

**Files:**
- Read: `app/(app)/jobs/[id]/change-order/new/page.tsx` — understand what it expects
- Modify: `components/profile/tabs/JobTab.tsx` (or `components/jobs/JobDetail.tsx`) — add button
- Modify: `components/jobs/JobDetail.tsx` — display existing change orders

**Steps:**

- [ ] Read `app/(app)/jobs/[id]/change-order/new/page.tsx` to confirm what query params it needs (likely just `jobId` from the route).

- [ ] Read `app/(app)/jobs/[id]/change-order/[coId]/page.tsx` to see the edit/view UI.

- [ ] In `JobDetail.tsx` (or `JobTab.tsx`), find the section that renders the signed estimate or action buttons. Add a "Change Order" button that navigates to the new change order page:
```tsx
import { useRouter } from 'next/navigation'
// ...
<button
  onClick={() => router.push(`/jobs/${job.id}/change-order/new`)}
  className="w-full flex items-center justify-between bg-volturaNavy/50 rounded-xl px-4 py-3 text-white text-sm active:opacity-70"
>
  <span>➕ Add Change Order</span>
  <span className="text-gray-500 text-xs">Expand scope</span>
</button>
```

- [ ] In `JobDetail.tsx`, check if change orders are already fetched (they're in `UnifiedProfile`). If `changeOrders` is passed as prop, display them above the "Add Change Order" button:
```tsx
{changeOrders.length > 0 && (
  <div className="space-y-2 mb-2">
    {changeOrders.map(co => (
      <button
        key={co.id}
        onClick={() => router.push(`/jobs/${job.id}/change-order/${co.id}`)}
        className="w-full flex items-center justify-between bg-volturaNavy/50 rounded-xl px-4 py-3"
      >
        <div>
          <p className="text-white text-sm font-semibold">Change Order</p>
          <p className="text-gray-400 text-xs">{co.line_items?.length ?? 0} items · ${co.total.toLocaleString()}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
          co.status === 'Signed' ? 'bg-green-900/40 text-green-400' :
          co.status === 'Pending' ? 'bg-yellow-900/40 text-yellow-400' :
          'bg-volturaNavy text-gray-400'
        }`}>{co.status}</span>
      </button>
    ))}
  </div>
)}
```

- [ ] Commit: `feat: change order entry point and list on job detail page`

---

## Task 8: Printable / saveable approved estimate (Item 10)

Use `window.print()` + `@media print` CSS. No library. Works on all devices — mobile Chrome shows "Save as PDF" option.

**Files:**
- Modify: `app/estimates/[id]/view/page.tsx` — add print button (client component extract needed)
- Create: `components/estimates/PrintButton.tsx` — client component with `window.print()`
- Modify: `app/globals.css` — add `@media print` rules

**Steps:**

- [ ] Create `components/estimates/PrintButton.tsx`:
```tsx
'use client'
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="w-full bg-volturaNavy rounded-xl py-3 text-white text-sm font-semibold active:opacity-70 print:hidden"
    >
      🖨️ Save / Print
    </button>
  )
}
```

- [ ] In `app/globals.css`, add print rules:
```css
@media print {
  /* Hide nav, buttons, referral form */
  .print\:hidden { display: none !important; }
  
  /* Clean background for printing */
  body { background: white !important; }
  .bg-volturaBlue, .bg-volturaNavy, .bg-volturaNavy\/50 {
    background: white !important;
    color: black !important;
    border: 1px solid #ddd !important;
  }
  .text-volturaGold { color: #b8860b !important; }
  .text-white { color: black !important; }
  .text-gray-400, .text-gray-500 { color: #555 !important; }
  
  /* Force page break control */
  .rounded-2xl, .rounded-xl { border-radius: 4px !important; }
}
```

- [ ] In `app/estimates/[id]/view/page.tsx`, import `PrintButton` and add it:
  - For solo estimates: place it below the total card, before payment methods
  - For proposals: place it only when the estimate is Approved (check `solo.status === 'Approved'`)
  - Add `print:hidden` class to: `ReferralForm`, footer "Questions?" section, any "Share" or action buttons

```tsx
import { PrintButton } from '@/components/estimates/PrintButton'
// ... in solo section, after total card:
{solo.status === 'Approved' && (
  <div className="mb-4 print:hidden">
    <PrintButton />
  </div>
)}
```

- [ ] Test: Open approved estimate, tap "Save / Print" → mobile shows "Save as PDF" option, desktop prints.

- [ ] Commit: `feat: print/save PDF button on approved estimate public view`

---

## Task 9: Template preview before creating (Polish)

**Files:**
- Modify: `components/estimates/TemplatePicker.tsx`

**Steps:**

- [ ] Add expandable preview to each template card. Currently shows name + item count + total. Add a tap-to-expand that shows the first 5 line item names:
```tsx
const [expanded, setExpanded] = useState<string | null>(null)

// In each template button, change to:
<div key={t.id} className="bg-volturaNavy rounded-xl overflow-hidden">
  <button
    onClick={() => handleTemplate(t.id)}
    disabled={!!loading}
    className="w-full p-4 text-left disabled:opacity-50"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-volturaGold font-semibold">{t.name}</p>
        <p className="text-gray-400 text-xs mt-1">
          {t.line_items?.length ?? 0} items · ${(t.total ?? 0).toLocaleString()}
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(expanded === t.id ? null : t.id) }}
        className="text-gray-500 text-xs px-2 py-1 rounded bg-white/5"
      >
        {expanded === t.id ? 'Hide' : 'Preview'}
      </button>
    </div>
  </button>
  {expanded === t.id && (
    <div className="px-4 pb-3 border-t border-white/5">
      {(t.line_items as LineItem[] ?? []).slice(0, 5).map((item, i) => (
        <p key={i} className="text-gray-400 text-xs py-1 border-b border-white/5 last:border-0 flex justify-between">
          <span>{item.description}</span>
          <span className="text-volturaGold">${item.price.toLocaleString()}</span>
        </p>
      ))}
      {(t.line_items?.length ?? 0) > 5 && (
        <p className="text-gray-500 text-xs pt-1">+{t.line_items!.length - 5} more items</p>
      )}
    </div>
  )}
</div>
```
Import `LineItem` from `@/types`.

- [ ] Commit: `feat: template preview shows line items before creating estimate`

---

## Task 10: Upsell suggestions on public view (Polish)

Currently `SuggestedItems` only fires in `PresentMode` (in-person flow). Add a read-only version to the public estimate view for approved estimates so customers can see what else was recommended.

**Files:**
- Modify: `app/estimates/[id]/view/page.tsx`
- Check: `lib/actions/ai-tools.ts` — how `generateUpsellSuggestion` works

**Steps:**

- [ ] Read `lib/actions/ai-tools.ts` → find `generateUpsellSuggestion`. Understand its input/output.

- [ ] If the approved estimate has `notes` from the AI suggestion stored, surface them. Otherwise, fetch suggestions server-side and render them as a static "Customers also often add:" section.

- [ ] In `app/estimates/[id]/view/page.tsx`, after the addons section and before the total, add (only for non-approved estimates to drive action):
```tsx
{solo.status !== 'Approved' && solo.status !== 'Declined' && lineItems.length > 0 && (
  <div className="bg-volturaNavy/30 rounded-2xl p-5 mb-4 border border-volturaGold/10">
    <p className="text-volturaGold text-sm font-semibold mb-3">💡 Customers also consider</p>
    <div className="space-y-2">
      {/* Hardcoded smart suggestions based on what's in the estimate */}
      {/* These are static — no API call on public view for performance */}
      {!lineItems.some(i => i.description.toLowerCase().includes('surge')) && (
        <div className="flex justify-between items-center">
          <div>
            <p className="text-white text-sm">Whole-home surge protection</p>
            <p className="text-gray-400 text-xs">Protects all devices from power surges</p>
          </div>
          <span className="text-volturaGold text-sm font-semibold shrink-0 ml-3">+$500</span>
        </div>
      )}
      {!lineItems.some(i => i.description.toLowerCase().includes('afci')) && (
        <div className="flex justify-between items-center">
          <div>
            <p className="text-white text-sm">AFCI breaker upgrade</p>
            <p className="text-gray-400 text-xs">Arc-fault protection — required by modern code</p>
          </div>
          <span className="text-volturaGold text-sm font-semibold shrink-0 ml-3">+$350</span>
        </div>
      )}
    </div>
    <p className="text-gray-500 text-xs mt-3">Call or text to add these to your estimate</p>
  </div>
)}
```

Note: Static suggestions (no AI call) on public view is intentional — avoids latency and cost on a public page. The AI upsell already fires during in-person presentation.

- [ ] Commit: `feat: static upsell suggestions on public estimate view`

---

## Task 11: Referral Telegram notification (Polish)

**Files:**
- Modify: `lib/actions/referrals.ts`

**Steps:**

- [ ] Open `lib/actions/referrals.ts`. Find the `createReferral` function.

- [ ] After the insert, add Telegram notification:
```typescript
import { sendTelegram } from '@/lib/telegram'

// After successful insert:
void sendTelegram(
  `🤝 New referral!\nFrom estimate: ${input.estimateId}\nName: ${input.name}\nPhone: ${input.phone}\nProject: ${input.projectNotes ?? 'Not specified'}`
)
```

- [ ] Commit: `fix: fire Telegram alert when referral form is submitted`

---

## Execution Order

Run tasks in this order to minimize re-reads:
1. **DB migration** (Supabase SQL editor) — must be first
2. Task 11 (referral Telegram) — 5 minutes, zero risk
3. Task 1 (pricebook descriptions) — verify + fix
4. Task 5 (discount display) — pure UI
5. Task 6 (category grouping) — pure UI  
6. Task 3 (valid-until) — needs type + DB + UI
7. Task 4 (payment terms) — needs type + DB + UI
8. Task 2 (custom add-ons) — builder only
9. Task 8 (print/save PDF) — add component + CSS
10. Task 9 (template preview) — UI only
11. Task 10 (upsell on public view) — static content
12. Task 7 (change order button) — read existing routes first

## Testing Checklist

After all tasks:
- [ ] Create new estimate, add pricebook item with description → public view shows expand arrow
- [ ] Add custom add-on in builder → shows on public view
- [ ] Set valid-until to yesterday → public view shows "expired" banner
- [ ] Set valid-until to 2 days out → shows orange "2 days" countdown
- [ ] Set payment terms → shows on public view in gold
- [ ] Add 10% discount → public view shows green "Discount" badge + "You save $X"
- [ ] Add items from 2 different categories → public view groups by category with headers
- [ ] Open job with signed estimate → "Add Change Order" button visible
- [ ] Navigate to change order new page → form opens
- [ ] Open approved estimate public URL → "Save / Print" button appears
- [ ] Tap Save/Print on mobile → browser print dialog opens
- [ ] Open template picker with templates → "Preview" button expands line items
- [ ] Submit referral form → Telegram message fires within seconds
