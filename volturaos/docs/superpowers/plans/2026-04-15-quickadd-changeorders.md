# Quick-Add + Change Orders Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add voice/search/recents quick-add to the estimate builder, and a change order flow that lets Devon extend a signed estimate with a second customer signature.

**Architecture:** QuickAddSheet is a tabbed bottom sheet (Voice → Search → Recents) that replaces the CategoryGrid as the primary item-add entry point. Change orders are stored in a new `change_orders` table linked to jobs; `createInvoiceFromEstimate` merges signed change order items into the invoice total. The public customer sign page follows the same pattern as `/estimates/[id]/view/`.

**Tech Stack:** Next.js 15 App Router · TypeScript · Supabase (admin client) · Web Speech API (`webkitSpeechRecognition` fallback) · Claude `claude-sonnet-4-20250514` (voice matching) · Tailwind CSS v4

---

## Pre-flight (manual step — do this before writing any code)

Run both SQL statements in **Supabase → SQL Editor**:

```sql
ALTER TABLE pricebook
  ADD COLUMN IF NOT EXISTS use_count    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS change_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  estimate_id     UUID REFERENCES estimates(id) ON DELETE SET NULL,
  line_items      JSONB NOT NULL DEFAULT '[]',
  total           NUMERIC NOT NULL DEFAULT 0,
  signature_data  TEXT,
  status          TEXT NOT NULL DEFAULT 'Draft',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

Verify both succeed before proceeding.

---

## File Map

**New files:**
- `lib/actions/change-orders.ts` — all change order server actions
- `app/api/voice-line-items/route.ts` — voice transcript → Claude → LineItem[] 
- `components/estimate-builder/RecentsRow.tsx` — top-6 one-tap chips
- `components/estimate-builder/LineItemSearch.tsx` — debounced pricebook search
- `components/estimate-builder/VoiceLineItems.tsx` — mic + transcript + proposed items
- `components/estimate-builder/QuickAddSheet.tsx` — tabbed bottom sheet assembling all three
- `components/jobs/ChangeOrderBuilder.tsx` — mini estimate builder for additional work
- `components/jobs/ChangeOrderSignClient.tsx` — client signature canvas for public sign page
- `app/(app)/jobs/[id]/change-order/new/page.tsx` — creates Draft CO, redirects
- `app/(app)/jobs/[id]/change-order/[coId]/page.tsx` — edit/build CO
- `app/change-orders/[id]/view/page.tsx` — public customer sign page (outside app group)

**Modified files:**
- `lib/actions/pricebook.ts` — add `getRecentPricebookItems`, `searchPricebook`, `incrementPricebookUseCount`
- `lib/actions/estimates.ts` — add `getSignedEstimateForJob`
- `lib/actions/invoices.ts` — modify `createInvoiceFromEstimate` to merge signed COs
- `components/estimate-builder/EstimateBuilder.tsx` — add `initialRecents` prop, wire `QuickAddSheet`, keep `CategoryGrid` as secondary
- `app/(app)/estimates/[id]/page.tsx` — fetch and pass `initialRecents`
- `app/(app)/estimates/new/page.tsx` — fetch and pass `initialRecents`
- `app/(app)/jobs/[id]/page.tsx` — fetch signed estimate, show "Add Change Order" button
- `components/jobs/JobDetail.tsx` — render "Add Change Order" button

---

## Task 1: Pricebook server actions

**Files:**
- Modify: `lib/actions/pricebook.ts`

- [ ] **Step 1: Add three new exports to `lib/actions/pricebook.ts`**

Append below `updatePricebookPrice`:

```typescript
export async function getRecentPricebookItems(limit = 6): Promise<PricebookEntry[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('pricebook')
    .select('*')
    .eq('active', true)
    .order('use_count', { ascending: false })
    .order('last_used_at', { ascending: false, nullsFirst: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []) as PricebookEntry[]
}

export async function searchPricebook(query: string): Promise<PricebookEntry[]> {
  if (!query.trim()) return []
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('pricebook')
    .select('*')
    .eq('active', true)
    .ilike('job_type', `%${query}%`)
    .order('use_count', { ascending: false })
    .limit(12)
  if (error) throw new Error(error.message)
  return (data ?? []) as PricebookEntry[]
}

export async function incrementPricebookUseCount(ids: string[]): Promise<void> {
  if (!ids.length) return
  const admin = createAdminClient()
  // Increment each matched row's use_count by 1 and set last_used_at
  for (const id of ids) {
    const { data: row } = await admin.from('pricebook').select('use_count').eq('id', id).single()
    await admin.from('pricebook').update({
      use_count: ((row?.use_count as number) ?? 0) + 1,
      last_used_at: new Date().toISOString(),
    }).eq('id', id)
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/Devon/VolturaOS/volturaos && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/pricebook.ts
git commit -m "feat: add getRecentPricebookItems, searchPricebook, incrementPricebookUseCount"
```

---

## Task 2: Change order server actions

**Files:**
- Create: `lib/actions/change-orders.ts`

- [ ] **Step 1: Create `lib/actions/change-orders.ts`**

```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegram } from '@/lib/telegram'
import type { ChangeOrder, LineItem } from '@/types'

export async function createChangeOrder(
  jobId: string,
  estimateId: string
): Promise<ChangeOrder> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('change_orders')
    .insert({ job_id: jobId, estimate_id: estimateId, status: 'Draft' })
    .select()
    .single()
  if (error) throw new Error(error.message)

  // Fetch job/customer for Telegram
  const { data: jobData } = await admin
    .from('jobs')
    .select('job_type, customers(name)')
    .eq('id', jobId)
    .single()
  const custName = (jobData?.customers as Record<string, unknown> | null)?.name as string ?? 'Unknown'
  void sendTelegram(`📋 Change order created — ${custName} — ${jobData?.job_type ?? ''}`)

  return data as ChangeOrder
}

export async function updateChangeOrderItems(
  id: string,
  lineItems: LineItem[],
  total: number
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('change_orders')
    .update({ line_items: lineItems, total })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function signChangeOrder(
  id: string,
  signatureData: string
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('change_orders')
    .update({ signature_data: signatureData, status: 'Signed' })
    .eq('id', id)
  if (error) throw new Error(error.message)

  // Fetch for Telegram
  const { data: co } = await admin
    .from('change_orders')
    .select('total, jobs(job_type, customers(name))')
    .eq('id', id)
    .single()
  const job = co?.jobs as Record<string, unknown> | null
  const custName = (job?.customers as Record<string, unknown> | null)?.name as string ?? 'Unknown'
  void sendTelegram(`✅ Change order signed — ${custName} — $${(co?.total as number)?.toLocaleString()}`)
}

export async function getChangeOrder(id: string): Promise<ChangeOrder & {
  job: { id: string; job_type: string; customer_id: string }
  customer: { name: string; address: string | null }
  originalEstimate: { line_items: LineItem[] | null; total: number; name: string } | null
}> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('change_orders')
    .select('*, jobs(id, job_type, customer_id, customers(name, address)), estimates(line_items, total, name)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  const { jobs: jobData, estimates: estData, ...co } = data as Record<string, unknown>
  const job = jobData as { id: string; job_type: string; customer_id: string; customers: { name: string; address: string | null } }
  return {
    ...(co as ChangeOrder),
    job: { id: job.id, job_type: job.job_type, customer_id: job.customer_id },
    customer: job.customers,
    originalEstimate: estData as { line_items: LineItem[] | null; total: number; name: string } | null,
  }
}

export async function listChangeOrdersForJob(jobId: string): Promise<ChangeOrder[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('change_orders')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as ChangeOrder[]
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/change-orders.ts
git commit -m "feat: add change order server actions"
```

---

## Task 3: getSignedEstimateForJob action

**Files:**
- Modify: `lib/actions/estimates.ts`

- [ ] **Step 1: Append to `lib/actions/estimates.ts`**

```typescript
export async function getSignedEstimateForJob(
  jobId: string
): Promise<{ id: string; total: number; name: string } | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('estimates')
    .select('id, total, name')
    .eq('job_id', jobId)
    .eq('status', 'Approved')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data ? { id: data.id as string, total: data.total as number, name: (data.name as string) ?? 'Estimate' } : null
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/actions/estimates.ts
git commit -m "feat: add getSignedEstimateForJob"
```

---

## Task 4: Voice API route

**Files:**
- Create: `app/api/voice-line-items/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { LineItem } from '@/types'

const client = new Anthropic()

interface SlimEntry {
  id: string
  job_type: string
  price_better: number | null
  category: string
}

export async function POST(req: NextRequest) {
  try {
    const { transcript, pricebook } = await req.json() as {
      transcript: string
      pricebook: SlimEntry[]
    }

    if (!transcript?.trim() || !pricebook?.length) {
      return NextResponse.json({ items: [] })
    }

    const pricebookText = pricebook
      .map((e) => `id:${e.id} | ${e.job_type} | $${e.price_better ?? 0} | ${e.category}`)
      .join('\n')

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `You are a line-item matcher for an electrical contractor's estimate app.

PRICEBOOK (id | job_type | price | category):
${pricebookText}

TECHNICIAN SAID: "${transcript}"

Return a JSON array of matched pricebook items. Only use IDs from the pricebook above — never invent items.
Format: [{"id":"<uuid>","qty":1}, ...]
If nothing matches, return [].
Return ONLY the JSON array, no explanation.`,
        },
      ],
    })

    const text = (message.content[0] as { text: string }).text.trim()
    const matches = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? '[]') as { id: string; qty: number }[]

    const items: LineItem[] = matches
      .map(({ id, qty }) => {
        const entry = pricebook.find((e) => e.id === id)
        if (!entry) return null
        const price = (entry.price_better ?? 0) * (qty ?? 1)
        return {
          description: qty > 1 ? `${entry.job_type} (×${qty})` : entry.job_type,
          price,
          is_override: false,
          original_price: price,
          tier: 'better' as const,
          category: entry.category,
        }
      })
      .filter(Boolean) as LineItem[]

    return NextResponse.json({ items })
  } catch (err) {
    console.error('[voice-line-items]', err)
    return NextResponse.json({ items: [], error: 'Match failed' }, { status: 200 })
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/voice-line-items/route.ts
git commit -m "feat: add voice-line-items API route"
```

---

## Task 5: RecentsRow component

**Files:**
- Create: `components/estimate-builder/RecentsRow.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import type { PricebookEntry, LineItem } from '@/types'

interface RecentsRowProps {
  items: PricebookEntry[]
  onAdd: (items: LineItem[]) => void
}

export function RecentsRow({ items, onAdd }: RecentsRowProps) {
  if (!items.length) {
    return (
      <p className="text-gray-500 text-xs text-center py-4">
        No recent items yet — they'll appear here as you build estimates.
      </p>
    )
  }

  function toLineItem(entry: PricebookEntry): LineItem {
    const price = entry.price_better ?? 0
    return {
      description: entry.job_type,
      price,
      is_override: false,
      original_price: price,
      tier: 'better',
      category: entry.category,
    }
  }

  return (
    <div className="flex gap-2 flex-wrap py-2">
      {items.map((entry) => (
        <button
          key={entry.id}
          onClick={() => onAdd([toLineItem(entry)])}
          className="flex items-center gap-1.5 bg-volturaGold/10 border border-volturaGold/30 rounded-full px-3 py-2 text-volturaGold text-xs font-medium active:scale-95 transition-transform"
        >
          <span className="text-volturaGold/50">+</span>
          {entry.job_type}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/estimate-builder/RecentsRow.tsx
git commit -m "feat: add RecentsRow component"
```

---

## Task 6: LineItemSearch component

**Files:**
- Create: `components/estimate-builder/LineItemSearch.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { searchPricebook } from '@/lib/actions/pricebook'
import type { PricebookEntry, LineItem } from '@/types'

interface LineItemSearchProps {
  onAdd: (items: LineItem[]) => void
  autoFocus?: boolean
}

function toLineItem(entry: PricebookEntry): LineItem {
  const price = entry.price_better ?? 0
  return {
    description: entry.job_type,
    price,
    is_override: false,
    original_price: price,
    tier: 'better',
    category: entry.category,
  }
}

export function LineItemSearch({ onAdd, autoFocus }: LineItemSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PricebookEntry[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchPricebook(query)
        setResults(data)
      } finally {
        setLoading(false)
      }
    }, 200)
  }, [query])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 bg-white/7 rounded-xl px-3 py-2.5">
        <span className="text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type 2+ letters to search..."
          autoFocus={autoFocus}
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-500"
        />
        {loading && <span className="text-gray-500 text-xs">…</span>}
      </div>

      {results.length > 0 && (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {results.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between bg-white/4 rounded-xl px-3 py-2.5"
            >
              <div>
                <p className="text-white text-sm">{entry.job_type}</p>
                <p className="text-gray-500 text-xs">{entry.category}</p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <span className="text-volturaGold text-sm font-semibold">
                  ${(entry.price_better ?? 0).toLocaleString()}
                </span>
                <button
                  onClick={() => { onAdd([toLineItem(entry)]); setQuery(''); setResults([]) }}
                  className="bg-volturaGold/15 text-volturaGold text-xs font-bold rounded-lg px-2.5 py-1.5 active:scale-95 transition-transform"
                >
                  + Add
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {query.length >= 2 && results.length === 0 && !loading && (
        <p className="text-gray-500 text-xs text-center py-2">No matches — try different words</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/estimate-builder/LineItemSearch.tsx
git commit -m "feat: add LineItemSearch component"
```

---

## Task 7: VoiceLineItems component

**Files:**
- Create: `components/estimate-builder/VoiceLineItems.tsx`

- [ ] **Step 1: Create the component**

Note: `transcript` is stored in a `useRef` (not state) inside `onend` to avoid the stale closure problem. State `displayTranscript` is used only for rendering.

```typescript
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { PricebookEntry, LineItem } from '@/types'

interface VoiceLineItemsProps {
  pricebook: PricebookEntry[]
  onAdd: (items: LineItem[]) => void
  onFallback: () => void  // called when voice fails — parent switches to Search tab
}

export function VoiceLineItems({ pricebook, onAdd, onFallback }: VoiceLineItemsProps) {
  const [supported, setSupported] = useState(true)
  const [listening, setListening] = useState(false)
  const [displayTranscript, setDisplayTranscript] = useState('')
  const [proposed, setProposed] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recogRef = useRef<SpeechRecognition | null>(null)
  // Use a ref for transcript so onend handler always reads the latest value
  const transcriptRef = useRef('')

  const pricebookRef = useRef(pricebook)
  pricebookRef.current = pricebook
  const onFallbackRef = useRef(onFallback)
  onFallbackRef.current = onFallback

  useEffect(() => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) { setSupported(false); return }
    const recog: SpeechRecognition = new SR()
    recog.continuous = false
    recog.interimResults = true
    recog.lang = 'en-US'
    recog.onresult = (e: SpeechRecognitionEvent) => {
      const t = Array.from(e.results).map((r) => r[0].transcript).join(' ')
      transcriptRef.current = t
      setDisplayTranscript(t)
    }
    recog.onend = async () => {
      setListening(false)
      const t = transcriptRef.current  // read from ref — always fresh
      if (!t.trim()) return
      setLoading(true)
      setError(null)
      try {
        const slim = pricebookRef.current.map((e) => ({
          id: e.id,
          job_type: e.job_type,
          price_better: e.price_better,
          category: e.category,
        }))
        const res = await fetch('/api/voice-line-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: t, pricebook: slim }),
        })
        const { items, error: apiError } = await res.json()
        if (apiError || !items.length) {
          setError("Couldn't match — try typing instead")
          onFallbackRef.current()
        } else {
          setProposed(items)
        }
      } catch {
        setError("Couldn't match — try typing instead")
        onFallbackRef.current()
      } finally {
        setLoading(false)
      }
    }
    recogRef.current = recog
  }, [])  // empty deps — created once, refs keep values fresh

  if (!supported) {
    return <p className="text-gray-500 text-xs text-center py-4">Voice not available on this browser — use Search.</p>
  }

  function startListening() {
    transcriptRef.current = ''
    setDisplayTranscript('')
    setProposed([])
    setError(null)
    recogRef.current?.start()
    setListening(true)
  }

  function stopListening() {
    recogRef.current?.stop()
  }

  function handleConfirm() {
    onAdd(proposed)
    setProposed([])
    setDisplayTranscript('')
    transcriptRef.current = ''
  }

  return (
    <div className="space-y-3 py-2">
      <p className="text-gray-400 text-xs text-center">
        {listening ? 'Listening… let go when done' : 'Hold mic · say what you need · let go'}
      </p>

      <div className="flex justify-center">
        <button
          onTouchStart={startListening}
          onTouchEnd={stopListening}
          onMouseDown={startListening}
          onMouseUp={stopListening}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-volturaBlue font-bold text-2xl transition-all select-none ${
            listening
              ? 'bg-volturaGold scale-110 shadow-[0_0_0_12px_rgba(245,200,66,0.2)]'
              : 'bg-volturaGold shadow-[0_0_0_8px_rgba(245,200,66,0.12)]'
          }`}
          aria-label={listening ? 'Release to process' : 'Hold to speak'}
        >
          🎤
        </button>
      </div>

      {displayTranscript && (
        <div className="bg-white/5 rounded-xl px-4 py-3 text-sm text-white/70 italic text-center">
          "{displayTranscript}"
        </div>
      )}

      {loading && (
        <p className="text-gray-400 text-xs text-center animate-pulse">Matching to your pricebook…</p>
      )}

      {error && (
        <p className="text-red-400 text-xs text-center">{error}</p>
      )}

      {proposed.length > 0 && (
        <div className="space-y-2">
          <p className="text-gray-400 text-xs uppercase tracking-wider text-center">Matched to your pricebook</p>
          {proposed.map((item, i) => (
            <div key={i} className="flex justify-between items-center bg-volturaGold/8 border border-volturaGold/20 rounded-xl px-4 py-3">
              <span className="text-white text-sm">{item.description}</span>
              <span className="text-volturaGold font-bold text-sm">${item.price.toLocaleString()}</span>
            </div>
          ))}
          <button
            onClick={handleConfirm}
            className="w-full bg-volturaGold text-volturaBlue font-bold rounded-xl py-3 text-sm active:scale-[0.98] transition-transform"
          >
            Add {proposed.length} Item{proposed.length > 1 ? 's' : ''} →
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/estimate-builder/VoiceLineItems.tsx
git commit -m "feat: add VoiceLineItems component"
```

---

## Task 8: QuickAddSheet component

**Files:**
- Create: `components/estimate-builder/QuickAddSheet.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { VoiceLineItems } from './VoiceLineItems'
import { LineItemSearch } from './LineItemSearch'
import { RecentsRow } from './RecentsRow'
import { incrementPricebookUseCount } from '@/lib/actions/pricebook'
import type { PricebookEntry, LineItem } from '@/types'

type Tab = 'voice' | 'search' | 'recents'

interface QuickAddSheetProps {
  open: boolean
  onClose: () => void
  onAdd: (items: LineItem[]) => void
  pricebook: PricebookEntry[]
  initialRecents: PricebookEntry[]
}

export function QuickAddSheet({ open, onClose, onAdd, pricebook, initialRecents }: QuickAddSheetProps) {
  // Default to voice if Web Speech API is available, else search
  const hasVoice = typeof window !== 'undefined' &&
    (typeof (window as any).SpeechRecognition !== 'undefined' ||
     typeof (window as any).webkitSpeechRecognition !== 'undefined')

  const [tab, setTab] = useState<Tab>(hasVoice ? 'voice' : 'search')

  async function handleAdd(items: LineItem[]) {
    // Extract pricebook IDs from matched items by description
    const ids = items
      .map((item) => pricebook.find((e) => e.job_type === item.description.replace(/ \(×\d+\)$/, ''))?.id)
      .filter(Boolean) as string[]
    if (ids.length) void incrementPricebookUseCount(ids)
    onAdd(items)
  }

  const TABS: { id: Tab; label: string }[] = [
    ...(hasVoice ? [{ id: 'voice' as Tab, label: '🎤 Voice' }] : []),
    { id: 'search', label: '🔍 Search' },
    { id: 'recents', label: '⏱ Recents' },
  ]

  return (
    <BottomSheet open={open} onClose={onClose} title="Quick Add Item">
      {/* Tab bar */}
      <div className="flex gap-2 mb-4">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
              tab === id
                ? 'bg-volturaGold text-volturaBlue'
                : 'bg-white/5 text-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'voice' && (
        <VoiceLineItems
          pricebook={pricebook}
          onAdd={(items) => { handleAdd(items); onClose() }}
          onFallback={() => setTab('search')}
        />
      )}
      {tab === 'search' && (
        <LineItemSearch
          onAdd={(items) => { handleAdd(items) }}
          autoFocus={tab === 'search'}
        />
      )}
      {tab === 'recents' && (
        <RecentsRow
          items={initialRecents}
          onAdd={(items) => { handleAdd(items); onClose() }}
        />
      )}
    </BottomSheet>
  )
}
```

- [ ] **Step 2: Check `BottomSheet` accepts `title` prop — read `components/ui/BottomSheet.tsx` and adjust if needed**

If `BottomSheet` doesn't accept `title`, add a title slot or render it inline above the tab bar.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/estimate-builder/QuickAddSheet.tsx
git commit -m "feat: add QuickAddSheet (voice + search + recents)"
```

---

## Task 9: Wire QuickAddSheet into EstimateBuilder

**Files:**
- Modify: `components/estimate-builder/EstimateBuilder.tsx`
- Modify: `app/(app)/estimates/[id]/page.tsx`
- Modify: `app/(app)/estimates/new/page.tsx`

- [ ] **Step 1: Add `initialRecents` prop to `EstimateBuilderProps`**

In the `EstimateBuilderProps` interface, add:

```typescript
initialRecents: PricebookEntry[]
```

- [ ] **Step 2: Add QuickAddSheet state and import**

At the top of imports add only:
```typescript
import { QuickAddSheet } from './QuickAddSheet'
```
Do NOT import `getRecentPricebookItems` here — `EstimateBuilder` is a client component. Recents are fetched server-side and passed as `initialRecents` prop.

In the component body, add state:
```typescript
const [qaOpen, setQaOpen] = useState(false)
```

Destructure `initialRecents` from props.

- [ ] **Step 3: Add `handleQuickAdd` handler**

```typescript
const handleQuickAdd = useCallback((items: LineItem[]) => {
  setLineItems((prev) => [...prev, ...items])
}, [])
```

- [ ] **Step 4: Replace CategoryGrid with QuickAddSheet button + keep CategoryGrid as fallback**

Find the `{/* Category grid */}` block (around line 394–396) and replace with:

```tsx
{/* Quick Add — primary entry point */}
<button
  onClick={() => setQaOpen(true)}
  className="w-full flex items-center justify-center gap-2 bg-volturaGold/10 border border-volturaGold/30 text-volturaGold font-semibold rounded-xl py-3 text-sm active:scale-[0.98] transition-transform"
>
  <span>⚡</span> Quick Add Item
</button>

<QuickAddSheet
  open={qaOpen}
  onClose={() => setQaOpen(false)}
  onAdd={handleQuickAdd}
  pricebook={pricebook}
  initialRecents={initialRecents}
/>

{/* Category grid — still available as secondary */}
<CategoryGrid pricebook={pricebook} onAddItem={handleAddItem} />
```

- [ ] **Step 5: Pass `initialRecents` from `app/(app)/estimates/[id]/page.tsx`**

In the parallel fetch:
```typescript
import { getAllPricebook, getRecentPricebookItems } from '@/lib/actions/pricebook'

// In Promise.all:
const [estimate, pricebook, recents, proposal, linkedInvoice] = await Promise.all([
  getEstimateById(id),
  getAllPricebook(),
  getRecentPricebookItems(6),
  getProposalEstimates(id),
  getLinkedInvoice(id),
])
```

Pass to `EstimateBuilder`:
```tsx
initialRecents={recents}
```

- [ ] **Step 6: Repeat for `app/(app)/estimates/new/page.tsx`**

Check how it fetches pricebook and add the same `getRecentPricebookItems(6)` call, pass as `initialRecents` to `EstimateBuilder`.

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 8: Smoke test**
  - Open an estimate in the browser
  - Tap "⚡ Quick Add Item" — sheet should slide up with Voice / Search / Recents tabs
  - Search tab: type "panel" — results appear
  - Recents tab: chips appear (or empty state if no history)
  - Add an item — it appears in the line items list

- [ ] **Step 9: Commit**

```bash
git add components/estimate-builder/EstimateBuilder.tsx app/(app)/estimates/[id]/page.tsx app/(app)/estimates/new/page.tsx
git commit -m "feat: wire QuickAddSheet into EstimateBuilder"
```

---

## Task 10: ChangeOrderBuilder component

**Files:**
- Create: `components/jobs/ChangeOrderBuilder.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { PricebookEntry, LineItem, ChangeOrder } from '@/types'
import { updateChangeOrderItems } from '@/lib/actions/change-orders'
import { QuickAddSheet } from '@/components/estimate-builder/QuickAddSheet'
import { LineItemList } from '@/components/estimate-builder/LineItemList'
import { calculateTotal } from '@/components/estimate-builder/LiveTotal'

interface ChangeOrderBuilderProps {
  changeOrder: ChangeOrder
  originalEstimateName: string
  originalTotal: number
  pricebook: PricebookEntry[]
  initialRecents: PricebookEntry[]
  jobId: string
}

export function ChangeOrderBuilder({
  changeOrder,
  originalEstimateName,
  originalTotal,
  pricebook,
  initialRecents,
  jobId,
}: ChangeOrderBuilderProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [lineItems, setLineItems] = useState<LineItem[]>(
    (changeOrder.line_items ?? []) as LineItem[]
  )
  const [qaOpen, setQaOpen] = useState(false)

  const handleAdd = useCallback((items: LineItem[]) => {
    setLineItems((prev) => [...prev, ...items])
  }, [])

  const handleRemove = useCallback((index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const coTotal = calculateTotal([], lineItems, [], [])
  const combinedTotal = originalTotal + coTotal

  async function handlePresent() {
    startTransition(async () => {
      await updateChangeOrderItems(changeOrder.id, lineItems, coTotal)
      router.push(`/change-orders/${changeOrder.id}/view`)
    })
  }

  return (
    <div className="px-4 pb-8 space-y-4">
      {/* Context banner */}
      <div className="bg-volturaGold/6 border border-volturaGold/15 rounded-xl px-4 py-3">
        <p className="text-gray-400 text-xs">Adding to:</p>
        <p className="text-white font-semibold text-sm">{originalEstimateName}</p>
        <p className="text-gray-500 text-xs mt-0.5">Original: ${originalTotal.toLocaleString()} · Signed</p>
      </div>

      {/* Additional items */}
      <div>
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Additional Work</p>
        {lineItems.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-3">No items added yet</p>
        ) : (
          <LineItemList
            items={lineItems}
            pricebook={pricebook}
            onFootageChange={() => {}}  // intentional no-op — footage items won't appear in change orders
            onRemove={handleRemove}
          />
        )}
      </div>

      {/* Quick add */}
      <button
        onClick={() => setQaOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-volturaGold/10 border border-volturaGold/30 text-volturaGold font-semibold rounded-xl py-3 text-sm"
      >
        <span>⚡</span> Quick Add Item
      </button>

      <QuickAddSheet
        open={qaOpen}
        onClose={() => setQaOpen(false)}
        onAdd={handleAdd}
        pricebook={pricebook}
        initialRecents={initialRecents}
      />

      {/* Totals */}
      {lineItems.length > 0 && (
        <div className="bg-volturaNavy/50 rounded-xl p-4 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Change order</span>
            <span className="text-volturaGold font-semibold">${coTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-white/10 pt-1.5">
            <span className="text-gray-400">New job total</span>
            <span className="text-white font-bold">${combinedTotal.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Present button */}
      <button
        onClick={handlePresent}
        disabled={isPending || lineItems.length === 0}
        className="w-full bg-green-600 text-white font-bold py-3 rounded-xl text-base disabled:opacity-40"
      >
        {isPending ? 'Saving…' : 'Present to Customer →'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/jobs/ChangeOrderBuilder.tsx
git commit -m "feat: add ChangeOrderBuilder component"
```

---

## Task 11: Change order routes

**Files:**
- Create: `app/(app)/jobs/[id]/change-order/new/page.tsx`
- Create: `app/(app)/jobs/[id]/change-order/[coId]/page.tsx`

- [ ] **Step 1: Create the "new" redirect page**

`app/(app)/jobs/[id]/change-order/new/page.tsx`:

```typescript
import { redirect, notFound } from 'next/navigation'
import { getJobById } from '@/lib/actions/jobs'
import { getSignedEstimateForJob } from '@/lib/actions/estimates'
import { createChangeOrder } from '@/lib/actions/change-orders'
import { PageHeader } from '@/components/ui/PageHeader'

export default async function NewChangeOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = await params
  const [job, signedEstimate] = await Promise.all([
    getJobById(jobId).catch(() => null),
    getSignedEstimateForJob(jobId),
  ])
  if (!job || !signedEstimate) notFound()

  const co = await createChangeOrder(jobId, signedEstimate.id)
  redirect(`/jobs/${jobId}/change-order/${co.id}`)
}
```

- [ ] **Step 2: Create the edit/build page**

`app/(app)/jobs/[id]/change-order/[coId]/page.tsx`:

```typescript
export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getChangeOrder } from '@/lib/actions/change-orders'
import { getAllPricebook, getRecentPricebookItems } from '@/lib/actions/pricebook'
import { ChangeOrderBuilder } from '@/components/jobs/ChangeOrderBuilder'
import { PageHeader } from '@/components/ui/PageHeader'

export default async function EditChangeOrderPage({
  params,
}: { params: Promise<{ id: string; coId: string }> }) {
  const { id: jobId, coId } = await params
  const [co, pricebook, recents] = await Promise.all([
    getChangeOrder(coId).catch(() => null),
    getAllPricebook(),
    getRecentPricebookItems(6),
  ])
  if (!co || co.job.id !== jobId) notFound()
  if (co.status === 'Signed') {
    return (
      <div className="px-4 pt-14 text-center">
        <PageHeader title="Change Order" />
        <p className="text-green-400 font-semibold mt-8">✅ Already signed</p>
      </div>
    )
  }

  return (
    <>
      <PageHeader title="Change Order" />
      <div className="pt-14">
        <ChangeOrderBuilder
          changeOrder={co}
          originalEstimateName={co.originalEstimate?.name ?? 'Estimate'}
          originalTotal={co.originalEstimate?.total ?? 0}
          pricebook={pricebook}
          initialRecents={recents}
          jobId={jobId}
        />
      </div>
    </>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/jobs/[id]/change-order/"
git commit -m "feat: add change order new + edit routes"
```

---

## Task 12: Add Change Order button to Job Detail

**Files:**
- Modify: `app/(app)/jobs/[id]/page.tsx`
- Modify: `components/jobs/JobDetail.tsx`

- [ ] **Step 1: Fetch signed estimate in job page**

In `app/(app)/jobs/[id]/page.tsx`, add the import and fetch:

```typescript
import { getSignedEstimateForJob } from '@/lib/actions/estimates'

// In parallel fetch (alongside getJobById etc.):
const [job, checklist, photos, signedEstimate] = await Promise.all([
  getJobById(id),
  getOrCreateChecklist(id),
  getJobPhotos(id),
  getSignedEstimateForJob(id),
])
```

Pass to `JobDetail`:
```tsx
<JobDetail
  job={job}
  checklist={checklist}
  photos={photos}
  signedEstimateId={signedEstimate?.id ?? null}
/>
```

- [ ] **Step 2: Add `signedEstimateId` prop to `JobDetail` and render button**

In `components/jobs/JobDetail.tsx`, add `signedEstimateId: string | null` to `JobDetailProps`.

In the action buttons section (after the `nextAction` button, before Cancel), add:

```tsx
{signedEstimateId && (job.status === 'Scheduled' || job.status === 'In Progress' || job.status === 'Completed') && (
  <button
    onClick={() => router.push(`/jobs/${job.id}/change-order/new`)}
    className="w-full bg-volturaGold/10 border border-volturaGold/30 text-volturaGold font-semibold py-3 rounded-xl text-sm"
  >
    📋 Add Change Order
  </button>
)}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Smoke test**
  - Important: The test job's estimate must have `job_id` set. If you created the estimate via `/estimates/new?jobId=...` or via "Create Invoice" from a job, `job_id` will be set. If the estimate was created standalone, `getSignedEstimateForJob` will return null and the button won't appear — that is correct behavior.
  - Open a job with a signed (Approved) estimate linked to it
  - "Add Change Order" button should appear
  - Tap it → redirects to change order builder with context banner showing original estimate name + total
  - Add items using Quick Add
  - Tap "Present to Customer →"

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/jobs/[id]/page.tsx" components/jobs/JobDetail.tsx
git commit -m "feat: add Change Order button to job detail"
```

---

## Task 13: Change order sign page

**Files:**
- Create: `components/jobs/ChangeOrderSignClient.tsx`
- Create: `app/change-orders/[id]/view/page.tsx`

- [ ] **Step 1: Create `ChangeOrderSignClient`**

Note: `InPersonSignature` is a full-screen T&C flow that calls `signEstimate` internally — it cannot be reused here. This component implements its own lightweight inline signature canvas using the same pointer event + canvas pattern.

```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { signChangeOrder } from '@/lib/actions/change-orders'
import type { LineItem, ChangeOrder } from '@/types'

interface ChangeOrderSignClientProps {
  changeOrder: ChangeOrder
  originalLineItems: LineItem[]
  originalTotal: number
  customerName: string
}

export function ChangeOrderSignClient({
  changeOrder,
  originalLineItems,
  originalTotal,
  customerName,
}: ChangeOrderSignClientProps) {
  const [signed, setSigned] = useState(changeOrder.status === 'Signed')
  const [hasSig, setHasSig] = useState(false)
  const [signing, setSigning] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  const coItems = (changeOrder.line_items ?? []) as LineItem[]
  const combinedTotal = originalTotal + changeOrder.total

  // Size canvas on mount
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    const ctx = canvas.getContext('2d')!
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
  }, [])

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
    ctx.strokeStyle = '#C9A227'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (lastPos.current) {
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
    }
    ctx.stroke()
    lastPos.current = pos
    setHasSig(true)
  }
  function onPointerUp() { isDrawing.current = false; lastPos.current = null }

  function clearCanvas() {
    if (!canvasRef.current) return
    const c = canvasRef.current
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    setHasSig(false)
  }

  async function handleAuthorize() {
    if (!hasSig || signing) return
    setSigning(true)
    try {
      const dataUrl = canvasRef.current!.toDataURL('image/png')
      await signChangeOrder(changeOrder.id, dataUrl)
      setSigned(true)
    } catch {
      alert('Failed to save signature. Please try again.')
    } finally {
      setSigning(false)
    }
  }

  if (signed) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">✅</p>
        <p className="text-white font-bold text-xl mb-1">Change Order Authorized</p>
        <p className="text-gray-400 text-sm">Work can now proceed. Thank you!</p>
        <p className="text-volturaGold font-bold text-2xl mt-4">${combinedTotal.toLocaleString()}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-300 text-sm leading-relaxed">
        Additional work was found during your service. Please review and sign to authorize:
      </p>

      {/* Original items (greyed) */}
      <div className="opacity-50">
        <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Original (already authorized)</p>
        {originalLineItems.map((item, i) => (
          <div key={i} className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-gray-400 text-sm">{item.description}</span>
            <span className="text-gray-400 text-sm">${item.price.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* New change order items */}
      <div>
        <p className="text-volturaGold text-xs font-bold uppercase tracking-wider mb-2">Additional work</p>
        {coItems.map((item, i) => (
          <div key={i} className="flex justify-between py-2 border-b border-volturaGold/10">
            <span className="text-white text-sm">{item.description}</span>
            <span className="text-volturaGold font-semibold text-sm">${item.price.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* Combined total */}
      <div className="flex justify-between pt-2 border-t border-white/10">
        <span className="text-white font-bold">Total</span>
        <span className="text-volturaGold font-bold text-lg">${combinedTotal.toLocaleString()}</span>
      </div>

      {/* Inline signature canvas */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-400 text-xs">Sign to authorize additional work:</p>
          {hasSig && (
            <button onClick={clearCanvas} className="text-gray-500 text-xs">Clear</button>
          )}
        </div>
        <canvas
          ref={canvasRef}
          className="w-full h-28 bg-white/5 border border-white/15 rounded-xl touch-none"
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      </div>

      <button
        onClick={handleAuthorize}
        disabled={!hasSig || signing}
        className="w-full bg-volturaGold text-volturaBlue font-bold py-3 rounded-xl text-base disabled:opacity-40"
      >
        {signing ? 'Saving…' : 'Authorize Change Order'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Note — do NOT use `InPersonSignature` here** (it is a full T&C flow for estimates only)

- [ ] **Step 3: Create public sign page `app/change-orders/[id]/view/page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import { getChangeOrder } from '@/lib/actions/change-orders'
import { ChangeOrderSignClient } from '@/components/jobs/ChangeOrderSignClient'
import type { LineItem } from '@/types'

export default async function ChangeOrderViewPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const co = await getChangeOrder(id).catch(() => null)
  if (!co) notFound()

  const originalLineItems = (co.originalEstimate?.line_items ?? []) as LineItem[]

  return (
    <div className="min-h-dvh bg-volturaBlue px-4 py-8 max-w-lg mx-auto">
      <header className="mb-8">
        <h1 className="text-volturaGold text-3xl font-bold tracking-widest">VOLTURA</h1>
        <p className="text-gray-400 text-sm">Power Group — Colorado Springs, CO</p>
        <p className="text-gray-400 text-xs mt-1">License #3001608</p>
      </header>

      <div className="bg-volturaNavy rounded-2xl p-5 mb-6">
        <p className="text-gray-400 text-sm mb-1">Change Order for</p>
        <p className="text-white text-xl font-bold">{co.customer.name}</p>
      </div>

      <div className="bg-volturaNavy rounded-2xl p-5">
        <ChangeOrderSignClient
          changeOrder={co}
          originalLineItems={originalLineItems}
          originalTotal={co.originalEstimate?.total ?? 0}
          customerName={co.customer.name}
        />
      </div>

      <footer className="text-center text-gray-500 text-sm mt-8">
        <p className="text-volturaGold">Voltura Power Group · Colorado Springs</p>
      </footer>
    </div>
  )
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Smoke test**
  - Complete Task 12 first so you have a change order with items
  - Tap "Present to Customer →" in the builder
  - Redirects to `/change-orders/[id]/view`
  - Original items appear greyed, new items highlighted
  - Signature canvas works
  - After signing: confirmation screen appears

- [ ] **Step 6: Commit**

```bash
git add components/jobs/ChangeOrderSignClient.tsx app/change-orders/
git commit -m "feat: change order public sign page"
```

---

## Task 14: Invoice integration

**Files:**
- Modify: `lib/actions/invoices.ts`

- [ ] **Step 1: Update `createInvoiceFromEstimate` to merge signed change orders**

Find the `createInvoiceFromEstimate` function (starts around line 43). Replace it with:

```typescript
export async function createInvoiceFromEstimate(estimateId: string): Promise<Invoice> {
  await requireAuth()
  const admin = createAdminClient()
  const { data: est, error: estErr } = await admin
    .from('estimates')
    .select('*, customers(name)')
    .eq('id', estimateId)
    .single()
  if (estErr || !est) throw new Error('Estimate not found')

  // Fetch signed change orders if estimate is linked to a job
  const jobId = est.job_id as string | null
  let mergedLineItems: LineItem[] = (est.line_items ?? []) as LineItem[]
  let mergedTotal: number = est.total as number

  if (jobId) {
    const { data: changeOrders } = await admin
      .from('change_orders')
      .select('line_items, total')
      .eq('job_id', jobId)
      .eq('status', 'Signed')
    if (changeOrders?.length) {
      const separator: LineItem = {
        description: '— Additional Work —',
        price: 0,
        is_override: false,
        original_price: null,
      }
      for (const co of changeOrders) {
        mergedLineItems = [
          ...mergedLineItems,
          separator,
          ...((co.line_items ?? []) as LineItem[]),
        ]
        mergedTotal += co.total as number
      }
    }
  }

  const { data, error } = await admin.from('invoices').insert({
    customer_id: est.customer_id,
    estimate_id: estimateId,
    line_items: mergedLineItems,
    total: mergedTotal,
    status: 'Unpaid',
  }).select().single()
  if (error) throw new Error(error.message)

  const customerName = (est.customers as Record<string, unknown>)?.name ?? 'Unknown'
  void sendTelegram(`💰 Invoice created from estimate — ${customerName} — $${(mergedTotal as number)?.toLocaleString()}`)

  return data as Invoice
}
```

Note: Add `LineItem` to the imports at the top of `invoices.ts` if not already imported.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Smoke test**
  - Complete a job that has a signed estimate + at least one signed change order
  - Tap "Create Invoice" on the job detail
  - Invoice total should be original + change order amount
  - Invoice line items should show both sets of items with separator

- [ ] **Step 4: Commit**

```bash
git add lib/actions/invoices.ts
git commit -m "feat: merge signed change orders into invoice total"
```

---

## Final verification

- [ ] Run full type-check: `npx tsc --noEmit` — zero errors
- [ ] End-to-end smoke test:
  1. Open an estimate → tap Quick Add → Voice tab → speak "200 amp panel" → confirm item added
  2. Search tab → type "ev" → results appear → add item
  3. Recents tab → chips appear after previous adds
  4. Build a job → approve estimate → start job → discover extra work → "Add Change Order"
  5. Add items to change order → present to customer → customer signs
  6. Create invoice from estimate → total includes change order amount
- [ ] Final commit:

```bash
git add -A
git commit -m "feat: Quick-Add + Change Orders — complete implementation"
```
