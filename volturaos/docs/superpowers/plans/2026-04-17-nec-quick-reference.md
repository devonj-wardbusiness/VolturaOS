# NEC Quick Reference Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/tools/nec` page with AI-powered NEC code search, 8 category tiles, structured answer cards with Colorado-specific notes, pricebook "Add to estimate" actions — plus deepen the AI system prompt with NEC 2023/2026 knowledge.

**Architecture:** Server page fetches Code Compliance pricebook items and passes them as props to a client component (`NecReference`). The client POSTs `{ query, pricebook }` to `/api/nec`, which streams a plain-text answer using the same `ReadableStream` + `client.messages.stream()` pattern as `/api/ai/route.ts`. After streaming completes, the client scans the answer text for 5 known NEC article triggers and surfaces the matching pricebook item as a gold "Add to estimate" card. "+ Add" navigates to `/estimates/new?item=<pricebook-id>`.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4, Anthropic SDK (`client.messages.stream()`), Supabase via `createAdminClient()` (server-side only)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| CREATE | `app/(app)/tools/nec/page.tsx` | Server page — fetches Code Compliance pricebook, renders `NecReference` |
| CREATE | `components/tools/NecReference.tsx` | Client — search input, category tiles, streaming answer, pricebook match card |
| CREATE | `app/api/nec/route.ts` | Streaming API route — NEC-specific system prompt, no tools, no Supabase |
| MODIFY | `lib/ai/prompts.ts` | Add 8 new NEC knowledge sections to `SYSTEM_PROMPT` |
| MODIFY | `app/(app)/estimates/new/page.tsx` | Read `?item=<id>` param, pre-seed pricebook item into `NewEstimateFlow` |
| CHECK | `app/(app)/tools/load-calc/page.tsx` | Reference pattern for tools page structure |

---

## Task 1: Deepen the AI system prompt

**Files:**
- Modify: `lib/ai/prompts.ts`

This benefits both the AI chat and the NEC page immediately. Do this first so the NEC route inherits the knowledge.

- [ ] **1.1 Open `lib/ai/prompts.ts` and find the end of the NEC knowledge block** (currently ends around the Code Compliance Behavior table and PPRBD section)

- [ ] **1.2 Add Article 220 — Load Calculations** after the existing PPRBD section:

```typescript
// Add inside SYSTEM_PROMPT string, after the Colorado Springs section:

`### Load Calculations (NEC Article 220)

**Standard Method vs. 220.83 Optional Method:**
- For existing dwellings: use 220.83 optional method — simpler, allowed for service upgrades
- 220.83 method: add up connected load, apply demand factors, size service to result
- PPRBD requires load calc submitted with panel upgrade permits — use 220.83

**Demand Factors (220.83 / Table 220.55):**
- First 10kVA of load @ 100%, remainder @ 40%
- Electric range (12kW or less): 8kW demand
- Electric dryer: 5kW demand  
- HVAC: largest of heating or cooling (not both)
- EV charger: count at 100% (continuous load)

**Worked Example — 200A Service for 2,000 sq ft home:**
- Lighting: 2,000 sq ft × 3VA = 6,000VA
- Small appliance circuits: 2 × 1,500VA = 3,000VA
- Laundry circuit: 1,500VA
- Subtotal: 10,500VA → first 10kVA @ 100% = 10,000VA, rest 500VA @ 40% = 200VA
- Range (12kW): 8,000VA demand
- Dryer (5kW): 5,000VA demand
- HVAC (5 ton AC = 7,200VA): 7,200VA
- Total: ~30,400VA ÷ 240V = 127A → 200A service adequate

### Box Fill Calculations (NEC Article 314)

**Conductor Fill (Table 314.16(B)):**
- #14 AWG: 2.00 cubic inches per conductor
- #12 AWG: 2.25 cubic inches per conductor  
- #10 AWG: 2.50 cubic inches per conductor

**Fill Rules:**
- Each conductor entering the box counts as 1 (loops/splices count as 1 if wire doesn't leave box)
- All equipment grounding conductors together = 1 conductor (largest EGC size)
- Each device (switch/outlet): 2 conductors (yoke fill = largest wire in box × 2)
- Cable clamps: 1 conductor (if internal clamps present)
- Formula: Total cubic inches needed ≤ box volume rating

**Common box sizes:**
- 2×4 single-gang plastic: 18 cu in → max 9 #12 conductors (rough calc)
- 4×4 square box: 21 cu in → bigger splices, panels
- When in doubt: go bigger — inspectors fail undersized boxes

### EV Charger Circuits (NEC Article 625)

**Circuit Sizing (625.40 — continuous load rule):**
- EVSE is a continuous load (runs >3 hours) → breaker must be rated at 125% of EVSE amperage
- Level 2 EVSE at 32A: needs 40A breaker (32 × 1.25 = 40)
- Level 2 EVSE at 40A: needs 50A breaker (40 × 1.25 = 50) ← most common residential
- Level 2 EVSE at 48A: needs 60A breaker

**Wire Sizing for 50A EVSE Circuit:**
- 50A breaker → #6 AWG copper THHN in conduit, or #4 AWG aluminum
- Run 240V, 2-pole breaker
- NEMA 14-50 outlet OR hardwired — both acceptable

**GFCI Requirements (210.8 — 2023):**
- Outdoor EVSE: GFCI required
- Garage EVSE: GFCI required (garage location)
- Use GFCI breaker (not outlet) for 240V EVSE circuits

**Load Management (625.42 — 2023 new):**
- If multiple EVSEs share a panel, load management system may be required
- Allows smaller service by dynamically distributing power between chargers
- Residential: typically not required for 1-2 EVSEs on a 200A service

### Voltage Drop

**NEC Guidance (Informational Annex B):**
- Branch circuits: ≤3% voltage drop recommended (not mandatory)
- Feeder + branch combined: ≤5% total recommended
- NEC 210.19(A) Informational Note: recommends conductors sized for ≤3% VD

**Formula:**
VD (%) = (2 × K × I × L) / (CM × V) × 100
- K = 12.9 for copper, 21.2 for aluminum
- I = load current (amps)
- L = one-way length (feet)
- CM = conductor circular mils (from wire table)
- V = voltage (120 or 240)

**Practical Rule of Thumb:**
- Runs over 100ft: consider upsizing one gauge (#12 → #10, #10 → #8)
- Runs over 200ft: upsizing is almost always required for 20A circuits
- Long runs to subpanels: check feeder voltage drop first

### Conduit Fill (NEC Chapter 9, Annex C)

**40% Fill Rule:** Maximum 40% conduit cross-section for 3+ conductors (53% for 2 conductors, 31% for 1 conductor)

**Common Scenarios:**
- ½" EMT: #12 THHN — max 9 conductors | #10 THHN — max 6 conductors
- ¾" EMT: #12 THHN — max 16 conductors | #10 THHN — max 10 conductors
- 1" EMT: #12 THHN — max 26 conductors | #10 THHN — max 16 conductors
- 1" PVC Sch 40: slightly less than EMT (smaller ID)

**Quick check:** If you're over 9-10 #12 wires in ½" conduit, upsize to ¾".

### Generators & Transfer Switches (NEC Article 702)

**Optional Standby Systems (Article 702):**
- Residential generators: Article 702 (optional standby, not life-safety)
- Transfer switch required to prevent backfeed to utility
- Manual transfer switch (interlock kit) OR automatic transfer switch (ATS)

**Interlock Kit:**
- Mechanical interlock on panel — prevents main breaker and generator breaker from being ON simultaneously
- Must be listed for specific panel make/model
- PPRBD requires permit for generator installation
- Inspection: verify interlock, wiring, bonding

**Sizing:**
- Calculate essential load (HVAC, fridge, lights, outlets) — typically 5,000–10,000W for whole-home coverage
- Generator output (running watts) must exceed calculated load
- Start-up surge: motor loads (AC, well pump) need 2–3× running watts at startup

**Permit required** in Colorado Springs for: new generator install, transfer switch, any service work.

### Solar & Battery Storage (NEC Articles 690 / 706)

**Solar PV (Article 690):**
- Rapid shutdown required (690.12): all conductors outside inverter must de-energize within 30 seconds of shutdown signal
- System disconnect required within sight of inverter
- Backfeed breaker: labeled "PV System" — must be at opposite end of bus from main
- 120% rule: (busbar rating × 1.2) ≥ main breaker + backfeed breaker
  Example: 200A panel with 175A busbar: 175 × 1.2 = 210A → main (200A) + backfeed ≤ 210A → max 10A backfeed → usually put on 200A main with backfeed on opposite end
- Two permits typically required: electrical + building (for roof penetrations)

**Battery Storage (Article 706):**
- Energy storage system (ESS) disconnect required
- Rated for DC voltage of battery bank
- CO: PPRBD treats battery + solar as combined system — one permit if installed together
- Fire setback: check local amendments for indoor battery clearances

### NEC 2026 — What's Coming (Not Yet Adopted in Colorado)

**⚠️ Colorado is on NEC 2023. NEC 2026 is not yet adopted at PPRBD. Flag any NEC 2026 answer clearly.**

**Key NEC 2026 changes to watch:**
- **EV-Ready Parking (Article 625 expansion):** New construction parking facilities may require EV-ready conduit/panel capacity even without chargers installed
- **Receptacle tamper-resistance (406.12 expansion):** Broader application to commercial and multi-family
- **Arc-flash labeling (110.16):** Expanded to include more equipment types
- **Selective coordination:** Enhanced requirements for series-rated systems
- **Battery storage updates:** Revised Article 706 with clearer installation requirements

When a customer or inspector asks about NEC 2026 requirements: "Colorado Springs/PPRBD is currently on NEC 2023. NEC 2026 hasn't been formally adopted here yet. Here's what the 2023 code requires..."`
```

- [ ] **1.3 Verify the prompt still compiles** — no TypeScript errors introduced:
```bash
cd C:/Users/Devon/VolturaOS/volturaos
npx tsc --noEmit
```
Expected: no output (clean)

- [ ] **1.4 Commit**
```bash
git add lib/ai/prompts.ts
git commit -m "feat: deepen NEC knowledge in AI prompt — Art 220/314/625/702/690/706, voltage drop, NEC 2026 preview"
```

---

## Task 2: Create the `/api/nec` streaming route

**Files:**
- Create: `app/api/nec/route.ts`

Pattern: simplified version of `/api/ai/route.ts`. No tools, no loop, no Supabase — just stream one answer.

- [ ] **2.1 Create `app/api/nec/route.ts`:**

```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { PricebookEntry } from '@/types'

const client = new Anthropic()

const NEC_SYSTEM_PROMPT = `You are a licensed electrician's NEC code reference assistant. You specialize in NEC 2023 as adopted in Colorado Springs, CO (PPRBD jurisdiction).

When answering, ALWAYS follow this exact format:

**NEC [Article.Section] ([Year])**
[2-4 sentence explanation of the rule. Be specific — include wire sizes, depths, amperage thresholds, locations. Speak to a licensed journeyman electrician.]

📍 **Colorado Springs / PPRBD**
[Local adoption status. Any PPRBD-specific enforcement notes. Permit/inspection requirements if applicable.]

Keep answers focused and field-practical. Use exact NEC article numbers. If a question involves NEC 2026 (not yet adopted in Colorado), clearly note that at the start.

Do NOT include any pricebook item suggestions in your text — those are handled separately. Do NOT use markdown headers with # — use **bold** only.`

export async function POST(request: Request) {
  const { query } = (await request.json()) as { query: string }

  if (!query?.trim()) {
    return new Response('Query required', { status: 400 })
  }

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: NEC_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: query }],
        })

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }

        controller.close()
      } catch (error) {
        const msg = error instanceof Anthropic.APIError
          ? `AI error (${error.status}): ${error.message}`
          : 'NEC lookup unavailable'
        controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`))
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
```

- [ ] **2.2 Verify TypeScript:**
```bash
npx tsc --noEmit
```
Expected: clean

- [ ] **2.3 Commit:**
```bash
git add app/api/nec/route.ts
git commit -m "feat: add /api/nec streaming route — NEC-specific system prompt, no tools"
```

---

## Task 3: Create the `NecReference` client component

**Files:**
- Create: `components/tools/NecReference.tsx`

This is the main UI: search input, 8 category tiles, streaming answer display, pricebook match card.

- [ ] **3.1 Create `components/tools/NecReference.tsx`:**

```typescript
'use client'

import { useState, useRef } from 'react'
import type { PricebookEntry } from '@/types'

interface NecReferenceProps {
  pricebook: Pick<PricebookEntry, 'id' | 'job_type' | 'price_better' | 'category'>[]
}

// Maps NEC article numbers to pricebook job_type keywords
const ARTICLE_TRIGGERS: { articles: string[]; keyword: string }[] = [
  { articles: ['230.67'], keyword: 'Surge' },
  { articles: ['210.8'], keyword: 'GFCI' },
  { articles: ['210.12'], keyword: 'AFCI' },
  { articles: ['406.12'], keyword: 'Tamper' },
  { articles: ['250.53', '250.50'], keyword: 'Ground Rod' },
]

const CATEGORIES = [
  { label: 'Wire Sizing', icon: '🔌', query: 'What wire size do I use for a 200A service entrance?' },
  { label: 'GFCI Rules', icon: '💧', query: 'Where is GFCI protection required in a dwelling unit per NEC 210.8?' },
  { label: 'AFCI Rules', icon: '⚡', query: 'Where is AFCI protection required per NEC 210.12 (2023)?' },
  { label: 'Panel Upgrades', icon: '🏠', query: 'What are the NEC requirements for a panel upgrade or service upgrade?' },
  { label: 'Underground', icon: '🕳️', query: 'What are the NEC burial depth requirements for underground wiring and conduit?' },
  { label: 'EV Chargers', icon: '🚗', query: 'How do I size a circuit for a Level 2 EV charger per NEC Article 625?' },
  { label: 'Load Calc', icon: '📐', query: 'How do I calculate the load for a 200A service upgrade using NEC 220.83?' },
  { label: 'Grounding', icon: '⚡', query: 'What are the NEC Article 250 requirements for grounding a 200A service?' },
]

function findPricebookMatch(
  answer: string,
  pricebook: NecReferenceProps['pricebook']
): NecReferenceProps['pricebook'][0] | null {
  for (const trigger of ARTICLE_TRIGGERS) {
    const articleFound = trigger.articles.some(a => answer.includes(a))
    if (articleFound) {
      const match = pricebook.find(p =>
        p.job_type.toLowerCase().includes(trigger.keyword.toLowerCase())
      )
      if (match) return match
    }
  }
  return null
}

export function NecReference({ pricebook }: NecReferenceProps) {
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [pricebookMatch, setPricebookMatch] = useState<NecReferenceProps['pricebook'][0] | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  async function handleSubmit(q: string) {
    const trimmed = q.trim()
    if (!trimmed || loading) return

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setQuery(trimmed)
    setAnswer('')
    setPricebookMatch(null)
    setLoading(true)

    try {
      const res = await fetch('/api/nec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed, pricebook }),
        signal: abortRef.current.signal,
      })

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        full += chunk
        setAnswer(full)
      }

      // After stream completes, check for pricebook matches
      setPricebookMatch(findPricebookMatch(full, pricebook))
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setAnswer('[Error: Could not reach NEC reference. Check your connection.]')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleCategoryClick(categoryQuery: string) {
    setQuery(categoryQuery)
    void handleSubmit(categoryQuery)
  }

  return (
    <div className="px-4 pb-8 space-y-4">
      {/* Search bar */}
      <form
        onSubmit={e => { e.preventDefault(); handleSubmit(query) }}
        className="flex items-center gap-2 bg-white/7 rounded-xl px-3 py-3"
      >
        <span className="text-green-400 text-lg">⚖️</span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Wire size, GFCI rules, burial depth…"
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-500"
        />
        {loading && <span className="text-gray-500 text-xs animate-pulse">…</span>}
      </form>

      {/* Category tiles */}
      {!answer && !loading && (
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat.label}
              onClick={() => handleCategoryClick(cat.query)}
              className="bg-volturaNavy rounded-xl p-4 text-center active:scale-95 transition-transform"
            >
              <div className="text-2xl mb-1">{cat.icon}</div>
              <div className="text-white text-xs font-semibold">{cat.label}</div>
            </button>
          ))}
        </div>
      )}

      {/* Answer card */}
      {(answer || loading) && (
        <div className="space-y-3">
          {/* Back to categories */}
          <button
            onClick={() => { setAnswer(''); setPricebookMatch(null); setQuery('') }}
            className="text-gray-500 text-xs"
          >
            ← Back to categories
          </button>

          <div className="bg-volturaNavy rounded-xl p-4 border-l-4 border-green-500">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-green-400 text-sm">⚖️</span>
              <span className="text-green-400 text-xs font-bold uppercase tracking-wide">NEC 2023 · Colorado Springs</span>
            </div>
            <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
              {answer || <span className="text-gray-500 animate-pulse">Looking up code…</span>}
            </div>
          </div>

          {/* Pricebook match — only shown after stream completes */}
          {pricebookMatch && !loading && (
            <div className="bg-volturaGold/10 border border-volturaGold/30 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-volturaGold text-sm font-bold">{pricebookMatch.job_type}</p>
                  <p className="text-volturaGold/60 text-xs mt-0.5">
                    From pricebook · ${Math.round(pricebookMatch.price_better ?? 0).toLocaleString()}
                  </p>
                </div>
                <a
                  href={`/estimates/new?item=${pricebookMatch.id}`}
                  className="bg-volturaGold text-volturaBlue text-xs font-bold px-3 py-2 rounded-lg"
                >
                  + Add to Estimate
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **3.2 Check TypeScript:**
```bash
npx tsc --noEmit
```
Expected: clean

- [ ] **3.3 Commit:**
```bash
git add components/tools/NecReference.tsx
git commit -m "feat: add NecReference client component — search, category tiles, streaming answer, pricebook match"
```

---

## Task 4: Create the `/tools/nec` page

**Files:**
- Create: `app/(app)/tools/nec/page.tsx`

Server component — fetches Code Compliance pricebook items, passes to client.

- [ ] **4.1 Create `app/(app)/tools/nec/page.tsx`:**

```typescript
export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { NecReference } from '@/components/tools/NecReference'
import { PageHeader } from '@/components/ui/PageHeader'
import type { PricebookEntry } from '@/types'

async function getCodeCompliancePricebook() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('pricebook')
    .select('id, job_type, price_better, category')
    .eq('active', true)
    .eq('category', 'Code Compliance')
    .order('job_type')
  return (data ?? []) as Pick<PricebookEntry, 'id' | 'job_type' | 'price_better' | 'category'>[]
}

export default async function NecPage() {
  const pricebook = await getCodeCompliancePricebook()

  return (
    <>
      <PageHeader title="NEC Quick Reference" />
      <div className="min-h-dvh pt-14">
        <div className="px-4 py-4">
          <p className="text-gray-500 text-xs mb-4">NEC 2023 · Colorado Springs / PPRBD</p>
        </div>
        <NecReference pricebook={pricebook} />
      </div>
    </>
  )
}
```

- [ ] **4.2 Verify the page is reachable** — run dev server and navigate to `/tools/nec`:
```bash
npm run dev
```
Open: `http://localhost:3000/tools/nec`
Expected: Page loads with search bar and 8 category tiles

- [ ] **4.3 Test a category tap** — tap "GFCI Rules"
Expected: Answer streams in within 5 seconds, includes "NEC 210.8", includes "Colorado Springs" note

- [ ] **4.4 Test a pricebook match** — type "surge protector panel upgrade" and submit
Expected: Answer includes "230.67", gold "Add to Estimate" card appears after streaming

- [ ] **4.5 Test "+ Add to Estimate"** — click the gold button
Expected: Navigates to `/estimates/new?item=<uuid>` (UUID of the matching pricebook item)

- [ ] **4.6 Commit:**
```bash
git add app/\(app\)/tools/nec/page.tsx
git commit -m "feat: add /tools/nec page — NEC Quick Reference with AI search and pricebook actions"
```

---

## Task 5: Wire up `?item=` param in New Estimate flow

**Files:**
- Modify: `app/(app)/estimates/new/page.tsx`
- Modify: `components/estimates/NewEstimateFlow.tsx`

**Architecture:** The key insight is that `createEstimate` creates an empty estimate in the DB, then redirects to `/estimates/[id]`. The preloaded item must be written to the DB via `saveEstimate` BEFORE the redirect — not as a React prop. This ensures the item persists regardless of which path the user takes.

- [ ] **5.1 In `app/(app)/estimates/new/page.tsx`**, add `item` to the searchParams type and handle the server-side path (when `customerId` is already in URL):

```typescript
// Change the searchParams type:
export default async function NewEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; item?: string }>
}) {
  const { customerId, item } = await searchParams

  // Helper to resolve pricebook item to LineItem
  async function resolveItem(itemId: string): Promise<LineItem | null> {
    const admin = createAdminClient()
    const { data } = await admin
      .from('pricebook')
      .select('job_type, price_better, price_good, category')
      .eq('id', itemId)
      .single()
    if (!data) return null
    const price = Math.round(data.price_better ?? data.price_good ?? 0)
    return {
      description: data.job_type,
      price,
      is_override: false,
      original_price: price,
      tier: 'better' as const,
      category: data.category,
    }
  }

  if (!customerId) {
    // Pass itemId to client flow so it carries through customer selection
    return <NewEstimateFlow preloadItemId={item} />
  }

  const templates = await getTemplates()
  if (templates.length === 0) {
    const estimate = await createEstimate({ customerId })
    // Save preloaded item before redirecting
    if (item) {
      const lineItem = await resolveItem(item)
      if (lineItem) {
        await saveEstimate(estimate.id, { lineItems: [lineItem] })
      }
    }
    redirect(`/estimates/${estimate.id}`)
  }

  return <TemplatePicker templates={templates} customerId={customerId} preloadItemId={item} />
}
```

Also add `saveEstimate` to the imports at top of this file:
```typescript
import { getTemplates, createEstimate, saveEstimate } from '@/lib/actions/estimates'
import { createAdminClient } from '@/lib/supabase/admin'
import type { LineItem } from '@/types'
```

- [ ] **5.2 In `components/estimates/NewEstimateFlow.tsx`**, accept `preloadItemId` and carry it through `createEstimate` → `saveEstimate`:

```typescript
// Add prop:
interface NewEstimateFlowProps {
  preloadItemId?: string
}

export function NewEstimateFlow({ preloadItemId }: NewEstimateFlowProps = {}) {
  // ...existing state...

  async function handleCustomerSelect(id: string, name: string) {
    setCustomerId(id)
    setCustomerName(name)
    setLoading(true)
    try {
      const tmpl = await getTemplates()
      if (tmpl.length === 0) {
        const est = await createEstimate({ customerId: id })
        // Save preloaded item before navigating
        if (preloadItemId) {
          await savePreloadedItem(est.id, preloadItemId)
        }
        router.push(`/estimates/${est.id}`)
      } else {
        setTemplates(tmpl)
        setLoading(false)
      }
    } catch {
      alert('Failed to start estimate.')
      setLoading(false)
    }
  }
  // ...rest unchanged
}

// Add this helper (client-side server action call):
async function savePreloadedItem(estimateId: string, pricebookId: string) {
  // Import at top of file:
  // import { getPricebookItem } from '@/lib/actions/pricebook'  -- add this action
  // import { saveEstimate } from '@/lib/actions/estimates'
  try {
    const entry = await getPricebookItem(pricebookId)
    if (!entry) return
    const price = Math.round(entry.price_better ?? entry.price_good ?? 0)
    await saveEstimate(estimateId, {
      lineItems: [{
        description: entry.job_type,
        price,
        is_override: false,
        original_price: price,
        tier: 'better' as const,
        category: entry.category,
      }],
    })
  } catch { /* non-critical, estimate still opens */ }
}
```

- [ ] **5.3 Add `getPricebookItem` server action to `lib/actions/pricebook.ts`:**

```typescript
export async function getPricebookItem(id: string): Promise<PricebookEntry | null> {
  const admin = createAdminClient()
  const { data } = await admin.from('pricebook').select('*').eq('id', id).single()
  return data as PricebookEntry | null
}
```

- [ ] **5.4 Run TypeScript check:**
```bash
npx tsc --noEmit
```
Expected: clean

- [ ] **5.5 Test end-to-end:**
  - Open `/tools/nec` → tap "Panel Upgrades" → answer streams with "230.67" → gold card appears
  - Click "+ Add to Estimate" → navigates to `/estimates/new?item=<uuid>`
  - Select a customer (or if customerId already in URL, skips to next step)
  - Estimate opens in builder with Whole-Home Surge Protector already in line items

- [ ] **5.6 Commit:**
```bash
git add app/\(app\)/estimates/new/page.tsx components/estimates/NewEstimateFlow.tsx lib/actions/pricebook.ts
git commit -m "feat: pre-populate estimate line item from ?item= param — writes to DB before redirect"
```

---

## Task 6: Add NEC tile to the tools navigation

**Files:**
- Check: how users currently reach `/tools/nec` — add entry point

- [ ] **6.1 Locate the tools entry point** — there is no `/tools` hub page. Tools (Load Calc, Quick Quote) are linked from `/settings`. Check `app/(app)/settings/page.tsx` for where these links appear.

- [ ] **6.2 Add NEC tile** alongside Load Calc and Quick Quote in Settings. Match existing link/tile style exactly. Link to `/tools/nec`.

- [ ] **6.3 Commit:**
```bash
git add -A
git commit -m "feat: add NEC Quick Reference tile to tools navigation"
```

---

## Task 7: Deploy and smoke test on Vercel

- [ ] **7.1 Push to main:**
```bash
git push
```

- [ ] **7.2 Wait for Vercel deploy** (1-2 minutes), then open the live URL

- [ ] **7.3 Smoke test on mobile** (this is a field tool — test on phone):
  - Navigate to NEC page
  - Tap "Panel Upgrades" → answer loads with article citation
  - Tap "GFCI Rules" → answer loads
  - Type custom query → answer loads
  - Gold pricebook card appears on code-required items
  - "+ Add to Estimate" opens new estimate with item pre-filled

- [ ] **7.4 Smoke test AI chat** — open the AI assistant and ask "what wire for a 200ft underground run?" — verify the answer now includes URD, PVC conduit, 36" Colorado frost line depth (knowledge was already in the prompt but now deeper)

---

## Done When

- `/tools/nec` loads with 8 category tiles
- Any category or typed question returns a structured answer with NEC article number and Colorado Springs note in under 5 seconds
- Answers involving surge protection, GFCI, AFCI, tamper-resistant receptacles, or ground rods show a gold "Add to Estimate" card
- "+ Add to Estimate" pre-populates the item on the new estimate page
- AI chat answers NEC 2026 questions with "not yet adopted in Colorado" caveat
- Zero TypeScript errors, zero regressions on existing features
