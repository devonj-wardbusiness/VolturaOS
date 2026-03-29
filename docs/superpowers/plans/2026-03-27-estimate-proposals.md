# Estimate Proposals & AI Upsells — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded Good/Better/Best tier system with flat named estimates that can be grouped into proposals (up to 3) and presented side-by-side, plus an AI-powered Suggested Items panel.

**Architecture:** Two new DB columns (`name`, `proposal_id`) link estimates into proposals without a new table. The estimate builder is simplified to flat line items with a name field and a duplicate button. PresentMode is extended to show multi-column comparison. A new `SuggestedItems` client component calls `/api/ai` for upsell recommendations.

**Tech Stack:** Next.js 15 App Router, Supabase (admin client for all DB ops), TypeScript, Tailwind CSS, Anthropic SDK (Claude Haiku via `/api/ai`)

**Spec:** `docs/superpowers/specs/2026-03-27-estimate-proposals-design.md`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `volturaos/types/index.ts` | Modify | Add `name`, `proposal_id` to Estimate; remove TierName from EstimateBuilder usage |
| `volturaos/app/api/ai/route.ts` | Modify | Comment out auth check |
| `volturaos/lib/ai/prompts.ts` | Modify | Add JSON-only instruction to SYSTEM_PROMPT |
| `volturaos/lib/actions/estimates.ts` | Modify | Add `duplicateEstimate`, `getProposalEstimates`; update `saveEstimate`, `getPublicEstimate` |
| `volturaos/app/(app)/estimates/page.tsx` | Modify | Group proposals in list, remove tier badge |
| `volturaos/app/(app)/estimates/[id]/page.tsx` | Modify | Load proposal group, pass count + group to builder + present mode |
| `volturaos/components/estimate-builder/EstimateBuilder.tsx` | Modify | Remove tier state/logic; add name field, duplicate button, SuggestedItems |
| `volturaos/components/estimate-builder/TierCards.tsx` | Delete | No longer needed |
| `volturaos/components/estimate-builder/TierCard.tsx` | Delete | No longer needed |
| `volturaos/components/estimate-builder/PrimaryJobSelector.tsx` | Modify | Remove tier selection; keep job type picker only |
| `volturaos/components/estimate-builder/LineItemRow.tsx` | Modify | Remove tier badge, tier change buttons; keep footage inputs |
| `volturaos/components/estimate-builder/SuggestedItems.tsx` | Create | AI upsell suggestions panel |
| `volturaos/components/estimates/PresentMode.tsx` | Modify | Multi-estimate comparison layout; sibling decline on approval |

---

## Task 1: Run DB Migration in Supabase

**Files:**
- Run SQL in Supabase Dashboard → SQL Editor

- [ ] **Step 1: Run migration**

Open Supabase Dashboard → SQL Editor and run:

```sql
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'Estimate';
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS proposal_id uuid REFERENCES estimates(id) ON DELETE SET NULL;
```

- [ ] **Step 2: Verify columns exist**

In Supabase → Table Editor → estimates, confirm `name` and `proposal_id` columns appear. All existing rows should show `name = 'Estimate'` and `proposal_id = NULL`.

- [ ] **Step 3: Commit note**

```bash
git add docs/superpowers/plans/2026-03-27-estimate-proposals.md
git commit -m "feat: DB migration for estimate proposals (name + proposal_id columns)"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `volturaos/types/index.ts`

- [ ] **Step 1: Add `name` and `proposal_id` to Estimate interface**

In `volturaos/types/index.ts`, find the `Estimate` interface (line 82) and add two fields after `tier_selected`:

```typescript
export interface Estimate {
  id: string
  job_id: string | null
  customer_id: string
  status: EstimateStatus
  name: string                  // display label, e.g. "Gold Package"
  proposal_id: string | null    // links to anchor estimate; null = this IS the anchor
  tier_selected: TierName | null
  line_items: LineItem[] | null
  addons: Addon[] | null
  subtotal: number | null
  total: number | null
  notes: string | null
  sent_at: string | null
  viewed_at: string | null
  approved_at: string | null
  declined_at: string | null
  created_at: string
}
```

- [ ] **Step 2: Commit**

```bash
git add volturaos/types/index.ts
git commit -m "feat: add name and proposal_id to Estimate type"
```

---

## Task 3: Fix AI Route Auth + Update Prompts

**Files:**
- Modify: `volturaos/app/api/ai/route.ts` lines 10-14
- Modify: `volturaos/lib/ai/prompts.ts`

- [ ] **Step 1: Comment out auth check in AI route**

In `volturaos/app/api/ai/route.ts`, replace lines 10-14:

```typescript
export async function POST(request: Request) {
  // auth disabled — matches rest of app
  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user) {
  //   return new Response('Unauthorized', { status: 401 })
  // }

  const { message, context, history = [] } = (await request.json()) as {
```

- [ ] **Step 2: Add JSON-only instruction to SYSTEM_PROMPT**

In `volturaos/lib/ai/prompts.ts`, find `SYSTEM_PROMPT` and append this paragraph before the closing backtick:

```
When the user's message contains the phrase "Return a JSON array only", your entire response must be a single valid JSON array with no surrounding text, no markdown code fences, and no explanation.
```

- [ ] **Step 3: Commit**

```bash
git add volturaos/app/api/ai/route.ts volturaos/lib/ai/prompts.ts
git commit -m "feat: disable AI route auth, add JSON-only prompt instruction"
```

---

## Task 4: New + Updated Server Actions

**Files:**
- Modify: `volturaos/lib/actions/estimates.ts`

- [ ] **Step 1: Update `saveEstimate` signature and body**

Replace the existing `saveEstimate` function (lines 31-56) with:

```typescript
export async function saveEstimate(id: string, updates: {
  name?: string
  lineItems?: LineItem[]
  addons?: Addon[]
  subtotal?: number
  total?: number
  notes?: string
}): Promise<Estimate> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('estimates')
    .update({
      name: updates.name?.trim() || 'Estimate',
      tier_selected: null,
      line_items: updates.lineItems,
      addons: updates.addons,
      subtotal: updates.subtotal,
      total: updates.total,
      notes: updates.notes,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Estimate
}
```

- [ ] **Step 2: Add `getProposalEstimates` after `saveEstimate`**

```typescript
export async function getProposalEstimates(estimateId: string): Promise<Estimate[]> {
  const admin = createAdminClient()
  const { data: source, error: sourceErr } = await admin
    .from('estimates')
    .select('id, proposal_id')
    .eq('id', estimateId)
    .single()
  if (sourceErr || !source) return []
  const anchorId = (source as Record<string, unknown>).proposal_id ?? source.id
  const { data, error } = await admin
    .from('estimates')
    .select('*, customers(id, name, phone)')
    .or(`id.eq.${anchorId},proposal_id.eq.${anchorId}`)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as Record<string, unknown>[]).map(({ customers, ...e }) => ({
    ...e,
    customer: customers,
  })) as Estimate[]
}
```

- [ ] **Step 3: Add `duplicateEstimate` after `getProposalEstimates`**

```typescript
export async function duplicateEstimate(sourceId: string): Promise<Estimate> {
  const admin = createAdminClient()
  const { data: source, error: sourceErr } = await admin
    .from('estimates')
    .select('*')
    .eq('id', sourceId)
    .single()
  if (sourceErr || !source) throw new Error('Estimate not found')
  const src = source as Record<string, unknown>
  const anchorId = (src.proposal_id as string | null) ?? (src.id as string)

  const { count, error: countErr } = await admin
    .from('estimates')
    .select('id', { count: 'exact', head: true })
    .or(`id.eq.${anchorId},proposal_id.eq.${anchorId}`)
  if (countErr) throw new Error(countErr.message)
  if ((count ?? 0) >= 3) throw new Error('Proposal already has 3 estimates')

  const baseName = ((src.name as string) ?? 'Estimate').slice(0, 93)
  const newName = `${baseName} (Copy)`

  const { data, error } = await admin
    .from('estimates')
    .insert({
      customer_id: src.customer_id,
      job_id: src.job_id ?? null,
      line_items: src.line_items ?? null,
      addons: src.addons ?? null,
      notes: src.notes ?? null,
      subtotal: src.subtotal ?? null,
      total: src.total ?? null,
      name: newName,
      proposal_id: anchorId,
      status: 'Draft',
      tier_selected: null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Estimate
}
```

- [ ] **Step 4: Update `getPublicEstimate` to load the full proposal group**

Replace `getPublicEstimate` (lines 99-112) with:

```typescript
export async function getPublicEstimate(id: string): Promise<{
  estimates: (Estimate & { customer: { name: string; phone: string | null } })[]
} | null> {
  const admin = createAdminClient()
  // Load the requested estimate first to check status
  const { data, error } = await admin
    .from('estimates')
    .select('*, customers(name, phone)')
    .eq('id', id)
    .single()
  if (error || !data) return null
  const row = data as Record<string, unknown>
  const allowedStatuses: EstimateStatus[] = ['Sent', 'Viewed', 'Approved', 'Declined']
  if (!allowedStatuses.includes(row.status as EstimateStatus)) return null

  // Load full proposal group
  const group = await getProposalEstimates(id)
  if (group.length === 0) return null

  // Stamp anchor as Viewed if it's still Sent
  const anchor = group[0]
  if (anchor.status === 'Sent') {
    await admin
      .from('estimates')
      .update({ status: 'Viewed', viewed_at: new Date().toISOString() })
      .eq('id', anchor.id)
    anchor.status = 'Viewed'
  }

  return {
    estimates: group as (Estimate & { customer: { name: string; phone: string | null } })[],
  }
}
```

- [ ] **Step 5: Update the import line at top of estimates.ts to include `Estimate` if missing**

Verify line 8 includes `Estimate` in the import (it already does).

- [ ] **Step 6: Commit**

```bash
git add volturaos/lib/actions/estimates.ts
git commit -m "feat: add duplicateEstimate, getProposalEstimates; update saveEstimate and getPublicEstimate"
```

---

## Task 5: Estimates List Page — Proposal Grouping

**Files:**
- Modify: `volturaos/app/(app)/estimates/page.tsx`

- [ ] **Step 1: Rewrite the page**

Replace the entire file with:

```typescript
import { listEstimates } from '@/lib/actions/estimates'
import { StatusPill } from '@/components/ui/StatusPill'
import { EmptyState } from '@/components/ui/EmptyState'
import Link from 'next/link'
import type { Estimate } from '@/types'

type EstimateWithCustomer = Estimate & { customer: { name: string } }

function groupEstimates(estimates: EstimateWithCustomer[]) {
  const anchors = new Map<string, EstimateWithCustomer[]>()
  const childIds = new Set<string>()

  for (const est of estimates) {
    if (est.proposal_id) {
      childIds.add(est.id)
      const group = anchors.get(est.proposal_id) ?? []
      group.push(est)
      anchors.set(est.proposal_id, group)
    }
  }

  const result: { anchor: EstimateWithCustomer; children: EstimateWithCustomer[] }[] = []
  for (const est of estimates) {
    if (childIds.has(est.id)) continue // skip children, they're grouped under anchor
    result.push({ anchor: est, children: anchors.get(est.id) ?? [] })
  }
  return result
}

function proposalStatus(group: EstimateWithCustomer[]) {
  if (group.some((e) => e.status === 'Approved')) return 'Approved'
  if (group.some((e) => e.status === 'Sent')) return 'Sent'
  return group[0]?.status ?? 'Draft'
}

export default async function EstimatesPage() {
  const estimates = await listEstimates()
  const groups = groupEstimates(estimates)

  return (
    <div className="px-4 pt-6 pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-volturaGold text-xl font-bold">Estimates</h1>
        <Link href="/estimates/new" className="bg-volturaGold text-volturaBlue font-bold px-4 py-2 rounded-xl text-sm">+ New</Link>
      </div>
      {groups.length === 0 ? (
        <EmptyState message="No estimates yet — tap + to create one" ctaLabel="+ New Estimate" ctaHref="/estimates/new" />
      ) : (
        <div className="space-y-2">
          {groups.map(({ anchor, children }) => {
            const all = [anchor, ...children].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
            const isProposal = children.length > 0
            const status = proposalStatus(all) as import('@/types').EstimateStatus
            const maxTotal = Math.max(...all.map((e) => e.total ?? 0))
            const names = all.map((e) => e.name).join(' · ')

            return (
              <Link key={anchor.id} href={`/estimates/${anchor.id}`} className="block bg-volturaNavy/50 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-white font-semibold">{anchor.customer?.name ?? 'Unknown'}</p>
                    {isProposal ? (
                      <p className="text-gray-400 text-xs truncate">{names}</p>
                    ) : (
                      <p className="text-gray-400 text-xs">{anchor.name}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <StatusPill status={status} />
                    {maxTotal > 0 && (
                      <p className="text-volturaGold font-bold text-sm mt-1">${maxTotal.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add volturaos/app/(app)/estimates/page.tsx
git commit -m "feat: group proposal estimates in list view"
```

---

## Task 6: Estimate Detail Page — Load Proposal Group

**Files:**
- Modify: `volturaos/app/(app)/estimates/[id]/page.tsx`

- [ ] **Step 1: Rewrite the page**

Replace the entire file with:

```typescript
import { getEstimateById, getProposalEstimates, duplicateEstimate } from '@/lib/actions/estimates'
import { getAllPricebook } from '@/lib/actions/pricebook'
import { EstimateBuilder } from '@/components/estimate-builder/EstimateBuilder'
import { EstimateActions } from '@/components/estimates/EstimateActions'
import { StatusPill } from '@/components/ui/StatusPill'
import { notFound } from 'next/navigation'

export default async function EstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let estimate, pricebook, proposal
  try {
    ;[estimate, pricebook, proposal] = await Promise.all([
      getEstimateById(id),
      getAllPricebook(),
      getProposalEstimates(id),
    ])
  } catch {
    notFound()
  }

  const proposalCount = proposal.length

  return (
    <div className="min-h-dvh bg-volturaBlue">
      <header className="px-4 pt-4 pb-2 flex items-center gap-3">
        <a href="/estimates" className="text-gray-400 text-sm">&larr; Estimates</a>
        <h1 className="text-white font-semibold flex-1 truncate">{estimate.customer.name}</h1>
        <StatusPill status={estimate.status} />
        <a
          href={`/estimates/new?customerId=${estimate.customer.id}&customerName=${encodeURIComponent(estimate.customer.name)}`}
          className="text-volturaGold text-xs font-semibold border border-volturaGold/40 px-2.5 py-1 rounded-lg"
        >
          + New
        </a>
      </header>

      <EstimateActions
        estimateId={id}
        customerId={estimate.customer.id}
        status={estimate.status}
      />

      <EstimateBuilder
        estimateId={id}
        pricebook={pricebook}
        initialCustomerId={estimate.customer.id}
        initialCustomerName={estimate.customer.name}
        estimateCreatedAt={estimate.created_at}
        proposalCount={proposalCount}
        proposalEstimates={proposal}
        initialEstimate={{
          name: estimate.name,
          line_items: estimate.line_items,
          addons: estimate.addons,
          notes: estimate.notes,
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "volturaos/app/(app)/estimates/[id]/page.tsx"
git commit -m "feat: load proposal group in estimate detail page"
```

---

## Task 7: Strip Tier System — Delete TierCards + Simplify LineItemRow + PrimaryJobSelector

**Files:**
- Delete: `volturaos/components/estimate-builder/TierCards.tsx`
- Delete: `volturaos/components/estimate-builder/TierCard.tsx`
- Modify: `volturaos/components/estimate-builder/LineItemRow.tsx`
- Modify: `volturaos/components/estimate-builder/PrimaryJobSelector.tsx`

- [ ] **Step 1: Delete TierCards.tsx and TierCard.tsx**

```bash
rm volturaos/components/estimate-builder/TierCards.tsx
rm volturaos/components/estimate-builder/TierCard.tsx
```

- [ ] **Step 2: Rewrite LineItemRow to remove tier badge and tier buttons**

Replace the entire `volturaos/components/estimate-builder/LineItemRow.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { LineItem, PricebookEntry } from '@/types'
import { FootageInput } from './FootageInput'

interface LineItemRowProps {
  item: LineItem
  pricebookEntry?: PricebookEntry
  onFootageChange: (footage: number | null, price: number) => void
  onRemove: () => void
}

export function LineItemRow({ item, pricebookEntry, onFootageChange, onRemove }: LineItemRowProps) {
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
        onClick={() => isFootage ? setExpanded(!expanded) : undefined}
      >
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm truncate">{item.description}</p>
          {item.footage && (
            <p className="text-gray-500 text-xs">{item.footage}ft</p>
          )}
        </div>
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

      {expanded && isFootage && pricebookEntry && (
        <div className="px-3 pb-3 border-t border-volturaNavy/50 pt-2">
          <FootageInput
            footageGroup={pricebookEntry.footage_group ?? ''}
            brackets={brackets}
            perFootRate={pricebookEntry.per_foot_rate ?? 0}
            selectedBracketIndex={null}
            customFootage={item.footage ?? null}
            onBracketSelect={(_idx, price) => onFootageChange(null, price)}
            onCustomFootage={(ft, price) => onFootageChange(ft, price)}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Update LineItemList to remove `onTierChange` prop**

Open `volturaos/components/estimate-builder/LineItemList.tsx`. Find where `LineItemRow` is rendered and remove the `onTierChange` prop from the call. Also remove `onTierChange` from the `LineItemListProps` interface. The updated render should pass only `item`, `pricebookEntry`, `onFootageChange`, and `onRemove`.

- [ ] **Step 4: Simplify PrimaryJobSelector — remove tier selection**

Open `volturaos/components/estimate-builder/PrimaryJobSelector.tsx`. The component currently shows categories and job types. It does NOT have tier selection built-in (tier cards are in EstimateBuilder). So this file only needs a check: remove any import or reference to `TierName` if it exists. The `onSelect(jobType: string)` callback stays unchanged. Verify no tier-related code exists in the file — if clean, no changes needed.

- [ ] **Step 5: Commit**

```bash
git add volturaos/components/estimate-builder/LineItemRow.tsx
git add volturaos/components/estimate-builder/LineItemList.tsx
git add volturaos/components/estimate-builder/PrimaryJobSelector.tsx
git commit -m "feat: remove tier badges and tier buttons from line item UI"
```

---

## Task 8: Build SuggestedItems Component

**Files:**
- Create: `volturaos/components/estimate-builder/SuggestedItems.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { LineItem } from '@/types'

interface Suggestion {
  name: string
  price: number
  reason: string
}

interface SuggestedItemsProps {
  currentLineItems: LineItem[]
  customerType?: 'residential' | 'commercial'
  onAdd: (name: string, price: number) => void
}

export function SuggestedItems({ currentLineItems, customerType, onAdd }: SuggestedItemsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())

  const fetchSuggestions = useCallback(async () => {
    setLoading(true)
    setSuggestions([])
    setDismissed(new Set())
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Suggest 4-5 electrical services to add. Return a JSON array only, no other text: [{"name": string, "price": number, "reason": string}]',
          context: {
            mode: 'upsell',
            currentLineItems,
            customerType: customerType ?? 'residential',
          },
        }),
      })
      if (!res.ok) return
      const text = await res.text()
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed) && parsed.length > 0) {
        setSuggestions(parsed as Suggestion[])
      }
    } catch {
      // hide panel on any error
    } finally {
      setLoading(false)
    }
  }, [currentLineItems, customerType])

  useEffect(() => {
    fetchSuggestions()
  }, []) // fetch once on mount only

  if (!loading && suggestions.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-gray-400 text-sm">Suggested for This Job</label>
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className="text-gray-500 text-xs hover:text-gray-300 disabled:opacity-40"
          title="Refresh suggestions"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="space-y-1.5">
        {loading && [0, 1, 2].map((i) => (
          <div key={i} className="bg-volturaNavy/30 rounded-xl px-4 py-3 animate-pulse">
            <div className="h-3 bg-volturaNavy rounded w-3/4 mb-1" />
            <div className="h-2 bg-volturaNavy rounded w-1/2" />
          </div>
        ))}

        {!loading && suggestions.map((s, i) => {
          if (dismissed.has(i)) return null
          return (
            <div key={i} className="bg-volturaNavy/30 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm">{s.name}</p>
                <p className="text-gray-500 text-xs truncate">{s.reason}</p>
              </div>
              <span className="text-volturaGold text-sm font-semibold shrink-0">
                ${s.price.toLocaleString()}
              </span>
              <button
                onClick={() => {
                  onAdd(s.name, s.price)
                  setDismissed((prev) => new Set(prev).add(i))
                }}
                className="text-volturaGold text-xs font-semibold border border-volturaGold/40 px-2 py-1 rounded-lg shrink-0 hover:bg-volturaGold/10"
              >
                + Add
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add volturaos/components/estimate-builder/SuggestedItems.tsx
git commit -m "feat: add SuggestedItems AI upsell panel component"
```

---

## Task 9: Rewrite EstimateBuilder + PresentMode Together

> **Important:** EstimateBuilder and PresentMode must be committed together in this task. The new EstimateBuilder passes `proposalEstimates` and `lineItems` to PresentMode — if PresentMode isn't updated first, TypeScript will fail. Complete all steps in this task before committing.

## Task 9a: Rewrite PresentMode First (no commit yet)

**Files:**
- Modify: `volturaos/components/estimate-builder/EstimateBuilder.tsx`

- [ ] **Step 1: Rewrite EstimateBuilder.tsx**

Replace the entire file:

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { PricebookEntry, LineItem, Addon, AIPageContext, Estimate } from '@/types'
import { DEFAULT_ADDONS } from '@/types'
import { CustomerSelector } from './CustomerSelector'
import { PresentMode } from '@/components/estimates/PresentMode'
import { SuggestedItems } from './SuggestedItems'

const EstimateDownloadButton = dynamic(
  () => import('@/components/pdf/EstimateDownloadButton').then((m) => m.EstimateDownloadButton),
  { ssr: false, loading: () => null }
)
import { PrimaryJobSelector } from './PrimaryJobSelector'
import { CategoryGrid } from './CategoryGrid'
import { LineItemList } from './LineItemList'
import { AddOnsPanel } from './AddOnsPanel'
import { CustomLineItems } from './CustomLineItems'
import { LiveTotal, calculateTotal } from './LiveTotal'
import { SendSheet } from './SendSheet'
import { AIContextProvider } from './AIContextProvider'
import { saveEstimate, duplicateEstimate } from '@/lib/actions/estimates'

interface EstimateBuilderProps {
  estimateId: string
  pricebook: PricebookEntry[]
  initialCustomerId?: string
  initialCustomerName?: string
  estimateCreatedAt?: string
  proposalCount: number
  proposalEstimates: Estimate[]
  initialEstimate?: {
    name: string
    line_items: LineItem[] | null
    addons: Addon[] | null
    notes: string | null
  }
}

export function EstimateBuilder({
  estimateId,
  pricebook,
  initialCustomerId,
  initialCustomerName,
  estimateCreatedAt,
  proposalCount,
  proposalEstimates,
  initialEstimate,
}: EstimateBuilderProps) {
  const router = useRouter()

  // Customer
  const [customerId, setCustomerId] = useState(initialCustomerId ?? null)
  const [customerName, setCustomerName] = useState(initialCustomerName ?? null)

  // Estimate name
  const [estimateName, setEstimateName] = useState(initialEstimate?.name ?? 'Estimate')

  // Primary job type (no tier)
  const [primaryJobType, setPrimaryJobType] = useState<string | null>(null)
  const [primarySkipped, setPrimarySkipped] = useState(
    () => (initialEstimate?.line_items ?? []).length > 0
  )

  // Line items (all equal, no is_primary)
  const [lineItems, setLineItems] = useState<LineItem[]>(
    () => initialEstimate?.line_items ?? []
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
  const [presenting, setPresenting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)

  // Primary job handler (no tier, just tracks job type for AI context)
  const handlePrimaryJobSelect = useCallback((jobType: string) => {
    setPrimaryJobType(jobType || null)
    setPrimarySkipped(true)
    // Add as a regular line item
    const entry = pricebook.find((p) => p.job_type === jobType)
    if (!entry) return
    const price = entry.price_good ?? 0
    setLineItems((prev) => [
      { description: entry.job_type, price, is_override: false, original_price: price, category: entry.category },
      ...prev,
    ])
  }, [pricebook])

  // Additional item from category grid
  const handleAddItem = useCallback((entry: PricebookEntry) => {
    const price = entry.price_good ?? 0
    setLineItems((prev) => [...prev, {
      description: entry.job_type,
      price,
      is_override: false,
      original_price: price,
      category: entry.category,
      footage: entry.is_footage_item ? null : undefined,
    }])
  }, [])

  const handleFootageChange = useCallback((index: number, footage: number | null, price: number) => {
    setLineItems((prev) => prev.map((item, i) =>
      i === index ? { ...item, footage, price, is_override: footage !== null } : item
    ))
  }, [])

  const handleRemoveItem = useCallback((index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Add suggestion as custom line item
  const handleAddSuggestion = useCallback((name: string, price: number) => {
    setCustomItems((prev) => [...prev, { description: name, price, is_override: false, original_price: price }])
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

  const allLineItems = [...lineItems, ...customItems]
  const total = calculateTotal([], lineItems, addons, customItems)

  async function handleSave() {
    setSaving(true)
    try {
      await saveEstimate(estimateId, {
        name: estimateName,
        lineItems: allLineItems,
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

  async function handleDuplicate() {
    if (duplicating || proposalCount >= 3) return
    setDuplicating(true)
    try {
      const newEst = await duplicateEstimate(estimateId)
      router.push(`/estimates/${newEst.id}`)
    } catch (e) {
      alert((e as Error).message)
      setDuplicating(false)
    }
  }

  const aiContext: AIPageContext = {
    mode: 'estimate',
    jobType: primaryJobType ?? undefined,
    currentLineItems: allLineItems,
  }

  const hasItems = allLineItems.length > 0

  return (
    <AIContextProvider context={aiContext}>
      <div className="px-4 pt-4 pb-40 space-y-6">

        {/* Duplicate button row */}
        <div className="flex items-center justify-between">
          <input
            type="text"
            value={estimateName}
            onChange={(e) => setEstimateName(e.target.value)}
            onBlur={() => { if (!estimateName.trim()) setEstimateName('Estimate') }}
            maxLength={100}
            placeholder="Name this estimate…"
            className="bg-transparent text-white font-semibold text-lg flex-1 focus:outline-none placeholder:text-gray-600"
          />
          <button
            onClick={handleDuplicate}
            disabled={duplicating || proposalCount >= 3 || saving}
            title={proposalCount >= 3 ? 'Max 3 per proposal' : 'Duplicate this estimate'}
            className="text-volturaGold text-xs font-semibold border border-volturaGold/40 px-2.5 py-1 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed ml-3 shrink-0"
          >
            {duplicating ? 'Copying…' : 'Duplicate'}
          </button>
        </div>

        <CustomerSelector
          selectedId={customerId}
          selectedName={customerName}
          onSelect={(id, name) => { setCustomerId(id); setCustomerName(name) }}
        />

        {/* Primary job (optional) */}
        {!primarySkipped && (
          <PrimaryJobSelector
            pricebook={pricebook}
            selected={primaryJobType}
            onSelect={handlePrimaryJobSelect}
            onSkip={() => setPrimarySkipped(true)}
          />
        )}

        {primarySkipped && !primaryJobType && (
          <div className="bg-volturaNavy/30 rounded-xl p-3 flex items-center justify-between">
            <p className="text-gray-500 text-sm">No primary job selected</p>
            <button onClick={() => setPrimarySkipped(false)} className="text-volturaGold text-xs">Add one</button>
          </div>
        )}

        {/* Category grid */}
        <CategoryGrid pricebook={pricebook} onAddItem={handleAddItem} />

        {/* AI suggested items */}
        <SuggestedItems
          currentLineItems={allLineItems}
          onAdd={handleAddSuggestion}
        />

        {/* Line items */}
        <LineItemList
          items={lineItems}
          pricebook={pricebook}
          onFootageChange={handleFootageChange}
          onRemove={handleRemoveItem}
        />

        <AddOnsPanel addons={addons} onToggle={handleAddonToggle} onPriceChange={handleAddonPriceChange} />
        <CustomLineItems items={customItems} onAdd={addCustomItem} onUpdate={updateCustomItem} onRemove={removeCustomItem} />

        <div>
          <label className="block text-gray-400 text-sm mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold"
            placeholder="Notes for this estimate..."
          />
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-volturaBlue border-t border-volturaNavy z-30 px-4 py-3">
        <LiveTotal primaryItems={[]} additionalItems={lineItems} addons={addons} customItems={customItems} />
        <div className="flex gap-2 mt-2">
          <button onClick={handleSave} disabled={saving || !hasItems} className="flex-1 bg-volturaNavy text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50">
            {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Draft'}
          </button>
          <button
            onClick={() => setPresenting(true)}
            disabled={!hasItems}
            className="flex-1 bg-white/10 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 border border-white/20"
          >
            Present
          </button>
          <button onClick={() => { handleSave(); setSendOpen(true) }} disabled={!hasItems} className="flex-1 bg-volturaGold text-volturaBlue py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
            Send
          </button>
        </div>
        {hasItems && estimateCreatedAt && (
          <div className="mt-2">
            <EstimateDownloadButton
              estimateId={estimateId}
              customerName={customerName ?? 'Customer'}
              lineItems={allLineItems}
              addons={addons}
              total={total}
              notes={notes}
              createdAt={estimateCreatedAt}
            />
          </div>
        )}
      </div>

      <SendSheet open={sendOpen} onClose={() => setSendOpen(false)} estimateId={estimateId} total={total} />

      {presenting && (
        <PresentMode
          estimateId={estimateId}
          customerName={customerName}
          proposalEstimates={proposalEstimates}
          lineItems={lineItems}
          addons={addons}
          customItems={customItems}
          onClose={() => setPresenting(false)}
          onApproved={() => {
            setPresenting(false)
            window.location.reload()
          }}
        />
      )}
    </AIContextProvider>
  )
}
```

**Note:** `CategoryGrid`'s `onAddItem` prop currently passes `(entry, tier)`. Update the `CategoryGrid` component's `onAddItem` type to `(entry: PricebookEntry) => void` and update `CategorySheet`'s call to just `onAddItem(entry)` (no tier arg). This was partially done in a previous session — verify `CategoryGrid.tsx` and `CategorySheet.tsx` match.

- [ ] **Step 2: Fix CategoryGrid + CategorySheet onAddItem signatures**

In `volturaos/components/estimate-builder/CategoryGrid.tsx`, change:
```typescript
onAddItem: (entry: PricebookEntry, tier: TierName) => void
```
to:
```typescript
onAddItem: (entry: PricebookEntry) => void
```
Remove `TierName` import if no longer used.

In `volturaos/components/estimate-builder/CategorySheet.tsx`, the `handleAdd` function should call `onAddItem(entry)` (no second arg). Verify this is already the case from prior work; if not, update.

- [ ] **Step 3: Fix LineItemList to remove onTierChange**

Open `volturaos/components/estimate-builder/LineItemList.tsx`. Remove the `onTierChange` prop from the interface and from the `LineItemRow` render call. Verify `LineItemRow` no longer accepts `onTierChange`.

**⚠️ DO NOT COMMIT YET — complete Task 10 (PresentMode rewrite) before committing. Both files must go in the same commit to avoid a TypeScript compile error.**

---

## Task 10: Rewrite PresentMode (commit together with Task 9)

**Files:**
- Modify: `volturaos/components/estimates/PresentMode.tsx`

- [ ] **Step 1: Rewrite PresentMode.tsx**

Replace the entire file:

```typescript
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { updateEstimateStatus } from '@/lib/actions/estimates'
import { calculateTotal } from '@/components/estimate-builder/LiveTotal'
import type { LineItem, Addon, Estimate } from '@/types'

interface PresentModeProps {
  estimateId: string           // the currently open estimate (used for solo flow)
  customerName: string | null
  proposalEstimates: Estimate[] // 1-3 estimates in the proposal, anchor first
  lineItems: LineItem[]        // current estimate's line items
  addons: Addon[]
  customItems: LineItem[]
  onClose: () => void
  onApproved: () => void
}

export function PresentMode({
  estimateId,
  customerName,
  proposalEstimates,
  lineItems,
  addons,
  customItems,
  onClose,
  onApproved,
}: PresentModeProps) {
  const isProposal = proposalEstimates.length > 1
  const [step, setStep] = useState<'compare' | 'sign'>(isProposal ? 'compare' : 'sign')
  const [selectedEstimateId, setSelectedEstimateId] = useState<string>(estimateId)
  const [signing, setSigning] = useState(false)
  const [approved, setApproved] = useState(false)
  const [hasSig, setHasSig] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Solo flow: skip straight to sign using current estimate's data
  const soloTotal = calculateTotal([], lineItems, addons, customItems)

  // Canvas drawing
  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDrawing.current = true
    lastPos.current = getPos(e)
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath()
    ctx.strokeStyle = '#F5C518'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (lastPos.current) { ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y) }
    ctx.stroke()
    lastPos.current = pos
    setHasSig(true)
  }
  function onPointerUp() { isDrawing.current = false; lastPos.current = null }
  function clearSignature() {
    if (!canvasRef.current) return
    canvasRef.current.getContext('2d')!.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    setHasSig(false)
  }

  const handleApprove = useCallback(async () => {
    if (!hasSig) return
    setSigning(true)
    try {
      // Approve selected, decline all siblings
      await updateEstimateStatus(selectedEstimateId, 'Approved')
      const siblings = proposalEstimates.filter((e) => e.id !== selectedEstimateId)
      await Promise.all(siblings.map((e) => updateEstimateStatus(e.id, 'Declined')))
      setApproved(true)
      setTimeout(() => onApproved(), 2200)
    } catch {
      alert('Failed to approve — please try again.')
      setSigning(false)
    }
  }, [hasSig, selectedEstimateId, proposalEstimates, onApproved])

  return (
    <div className="fixed inset-0 z-50 bg-volturaBlue flex flex-col" style={{ touchAction: 'none' }}>

      {/* ── Comparison step (multi-estimate) ── */}
      {step === 'compare' && isProposal && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-6 pb-4">
            <button onClick={onClose} className="text-gray-500 text-sm">✕ Close</button>
            <span className="text-volturaGold font-bold tracking-widest text-xs uppercase">Voltura Power Group</span>
            <div className="w-16" />
          </div>
          <div className="px-6 pb-3">
            <p className="text-gray-400 text-sm">{customerName}</p>
            <h1 className="text-white text-xl font-bold mt-1">Choose Your Package</h1>
          </div>

          {/* Horizontal snap-scroll columns */}
          <div className="flex-1 flex overflow-x-auto snap-x snap-mandatory gap-3 px-4 pb-4 scrollbar-none">
            {proposalEstimates.map((est) => {
              const estTotal = (est.total ?? 0)
              const estItems = (est.line_items ?? [])
              const estAddons = (est.addons ?? []).filter((a: Addon) => a.selected)
              return (
                <div
                  key={est.id}
                  className="snap-center shrink-0 w-[85vw] max-w-sm bg-volturaNavy rounded-2xl flex flex-col overflow-hidden"
                >
                  <div className="px-5 pt-5 pb-3 border-b border-white/10">
                    <h2 className="text-volturaGold text-xl font-bold">{est.name}</h2>
                    <p className="text-white text-3xl font-bold mt-1">${estTotal.toLocaleString()}</p>
                  </div>
                  <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
                    {estItems.map((item: LineItem, i: number) => (
                      <div key={i} className="flex justify-between gap-3">
                        <p className="text-gray-300 text-sm flex-1">{item.description}</p>
                        <p className="text-white text-sm shrink-0">${item.price.toLocaleString()}</p>
                      </div>
                    ))}
                    {estAddons.map((addon: Addon, i: number) => (
                      <div key={`addon-${i}`} className="flex justify-between gap-3">
                        <p className="text-gray-400 text-sm flex-1">{addon.name}</p>
                        <p className="text-gray-400 text-sm shrink-0">${addon.price.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-5 py-4 border-t border-white/10">
                    <button
                      onClick={() => { setSelectedEstimateId(est.id); setStep('sign') }}
                      className="w-full bg-volturaGold text-volturaBlue font-bold py-3 rounded-xl"
                    >
                      Choose {est.name}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-center gap-1.5 pb-4">
            {proposalEstimates.map((est) => (
              <div key={est.id} className="w-2 h-2 rounded-full bg-volturaNavy/60" />
            ))}
          </div>
        </div>
      )}

      {/* ── Sign step ── */}
      {step === 'sign' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-volturaNavy/50">
            <button
              onClick={() => isProposal ? setStep('compare') : onClose()}
              className="text-gray-400 text-sm"
            >
              {isProposal ? '← Back' : '✕ Close'}
            </button>
            <span className="text-white font-semibold">Sign to Approve</span>
            <div className="w-12" />
          </div>

          {approved ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center text-4xl">✅</div>
              <h2 className="text-white text-2xl font-bold">Approved!</h2>
              <p className="text-gray-400">Estimate approved for {customerName}.</p>
              <p className="text-gray-500 text-sm">We&apos;ll be in touch to schedule your service.</p>
            </div>
          ) : (
            <>
              <div className="flex-1 flex flex-col px-5 py-5 gap-4">
                <div className="text-center">
                  {isProposal && (
                    <p className="text-gray-400 text-sm">
                      {proposalEstimates.find((e) => e.id === selectedEstimateId)?.name ?? 'Estimate'}
                    </p>
                  )}
                  <p className="text-volturaGold text-3xl font-bold mt-1">
                    ${isProposal
                      ? (proposalEstimates.find((e) => e.id === selectedEstimateId)?.total ?? 0).toLocaleString()
                      : soloTotal.toLocaleString()
                    }
                  </p>
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400 text-sm">Sign below</p>
                    {hasSig && (
                      <button onClick={clearSignature} className="text-gray-500 text-xs underline">Clear</button>
                    )}
                  </div>
                  <div className="flex-1 rounded-2xl border-2 border-dashed border-volturaNavy overflow-hidden bg-volturaNavy/20">
                    <canvas
                      ref={canvasRef}
                      className="w-full h-full touch-none"
                      style={{ display: 'block' }}
                      onPointerDown={onPointerDown}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      onPointerLeave={onPointerUp}
                      width={typeof window !== 'undefined' ? window.innerWidth : 400}
                      height={260}
                    />
                  </div>
                  {!hasSig && (
                    <p className="text-gray-600 text-xs text-center">Use your finger or stylus to sign</p>
                  )}
                </div>

                <p className="text-gray-500 text-xs text-center leading-relaxed">
                  By signing, you authorize Voltura Power Group to proceed with the work described in this estimate.
                </p>
              </div>

              <div className="px-5 pb-6">
                <button
                  onClick={handleApprove}
                  disabled={!hasSig || signing}
                  className="w-full bg-volturaGold text-volturaBlue font-bold py-4 rounded-2xl text-lg disabled:opacity-40"
                >
                  {signing ? 'Approving...' : 'Approve Estimate'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit EstimateBuilder + PresentMode together**

```bash
git add volturaos/components/estimate-builder/EstimateBuilder.tsx
git add volturaos/components/estimate-builder/CategoryGrid.tsx
git add volturaos/components/estimate-builder/CategorySheet.tsx
git add volturaos/components/estimate-builder/LineItemList.tsx
git add volturaos/components/estimates/PresentMode.tsx
git commit -m "feat: flat estimate builder with name/duplicate/AI suggestions + proposal comparison in PresentMode"
```

---

## Task 11: Update Public View

**Files:**
- Modify: `volturaos/app/(app)/estimates/[id]/view/page.tsx` (or wherever the public view lives)

- [ ] **Step 1: Find the public view file**

```bash
find volturaos/app -name "*.tsx" | xargs grep -l "getPublicEstimate"
```

- [ ] **Step 2: Update to use new getPublicEstimate return shape**

`getPublicEstimate` now returns `{ estimates: Estimate[] } | null`. Update the page to:
1. Destructure `{ estimates }` from the result
2. If `estimates.length > 1`, render a swipeable comparison (same layout as PresentMode's compare step but with direct Approve buttons — no signature step)
3. If `estimates.length === 1`, render the existing single-estimate view

For the comparison view on public view, build a client component `PublicCompareView` that:
- Renders horizontally scrollable columns (same card layout as PresentMode compare step)
- Each column has an "Approve" button
- On approve: calls a server action `approvePublicEstimate(approvedId, allIds)` which calls `updateEstimateStatus(approvedId, 'Approved')` + `updateEstimateStatus(siblingId, 'Declined')` for each sibling, checking `status NOT IN ('Approved','Declined')` first
- After approval: replaces Approve buttons with status labels

- [ ] **Step 3: Add `approvePublicEstimate` server action to estimates.ts**

```typescript
export async function approvePublicEstimate(approvedId: string, allIds: string[]): Promise<void> {
  const admin = createAdminClient()
  // Guard: only update if not already settled
  const { data: current } = await admin.from('estimates').select('id, status').in('id', allIds)
  if (!current) return
  for (const row of current as { id: string; status: string }[]) {
    if (row.status === 'Approved' || row.status === 'Declined') continue
    if (row.id === approvedId) {
      await updateEstimateStatus(approvedId, 'Approved')
    } else {
      await updateEstimateStatus(row.id, 'Declined')
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add volturaos/app volturaos/lib/actions/estimates.ts
git commit -m "feat: public view supports multi-estimate comparison with direct approve"
```

---

## Task 12: Smoke Test

- [ ] **Step 1: Start dev server if not running**

```bash
cd volturaos && npm run dev
```

- [ ] **Step 2: Test estimate builder**
  - Open an existing estimate
  - Verify: name field appears at top, editable
  - Verify: Duplicate button in header
  - Verify: No tier cards visible
  - Verify: Category grid shows categories with item counts
  - Verify: Adding an item shows it in the line items list with price (no tier badge)
  - Verify: AI suggested items panel loads (may take a few seconds)
  - Verify: "+ Add" on a suggestion adds it to the list

- [ ] **Step 3: Test duplication**
  - Click Duplicate → should navigate to a new estimate with "(Copy)" in the name
  - Both estimates should appear grouped in the estimates list
  - Duplicate again from the copy → should create a 3rd, all grouped
  - 4th duplicate attempt → button should be disabled or show "Max 3" tooltip

- [ ] **Step 4: Test in-app present mode**
  - On the first estimate of a proposal, tap Present
  - Should show comparison columns for all 3 estimates (swipeable)
  - Tap "Choose [name]" → signature step appears
  - Sign → Approve → success screen

- [ ] **Step 5: Test estimates list grouping**
  - Proposal should appear as one card showing all names with ` · ` separator
  - Total shown should be the highest total in the group

- [ ] **Step 6: Commit any fixes found during testing**

```bash
git add -A
git commit -m "fix: smoke test corrections"
```

---

## Completion Checklist

- [ ] DB has `name` and `proposal_id` columns on estimates table
- [ ] Existing estimates show as solo cards in list (not broken)
- [ ] Tier cards are gone from estimate builder
- [ ] Name field is editable and saves
- [ ] Duplicate button works, max 3 enforced
- [ ] AI suggested items panel appears and "+ Add" works
- [ ] Proposal estimates group as one card in list
- [ ] Present mode shows comparison for proposals, single column for solo
- [ ] Signature step works for in-app approval
- [ ] Sibling estimates auto-declined when one is approved
- [ ] Public view renders comparison for proposal links
