# NEC Quick Reference — Design Spec
Date: 2026-04-17
Status: Approved by user

---

## Overview

Add a dedicated NEC Quick Reference tool to VolturaOS with two components:
1. A standalone `/tools/nec` page — search-first with category tiles, AI-powered answers, structured citations, and pricebook "Add to estimate" actions for billable code items
2. Deeper NEC 2023–2026 knowledge added to the AI system prompt — benefits both the NEC page and the existing AI chat

This is the feature no competitor has. Every major field service app treats electricians as generic "home services" users. VolturaOS has NEC knowledge built into its core.

---

## Part 1 — Standalone `/tools/nec` Page

### User Flow
1. User navigates to `/tools/nec` (reachable from `/tools` hub or nav)
2. Sees a search bar and 8 category tiles
3. Taps a category or types a question → answer streams in below
4. Answer card shows: article citation, rule summary, Colorado-specific note, and optionally a pricebook "Add" button
5. "+ Add" pulls the matching pricebook item and navigates to estimate selection (or adds directly to an in-progress estimate if context is available)

### Category Tiles (8)
| Tile | Covers |
|------|--------|
| 🔌 Wire Sizing | NEC 310.12, Table 310.12 — service entrance sizing by amperage |
| 💧 GFCI Rules | NEC 210.8 — all locations requiring GFCI, 240V GFCI (2023) |
| ⚡ AFCI Rules | NEC 210.12 — whole-house AFCI expansion (2023) |
| 🏠 Panel Upgrades | 230.67 SPD, 408.4 labeling, 250.66 grounding, working clearance |
| 🕳️ Underground | Table 300.5 burial depths, URD sizing, conduit types, Colorado frost line |
| 🚗 EV Chargers | Article 625, EVSE GFCI requirements, dedicated circuit sizing |
| 📐 Load Calc | Article 220, 220.83 optional method, demand factors |
| ⚡ Grounding | Article 250 — ground rods, GEC sizing, bonding, subpanel rules |

### Answer Card Format
Each AI response must be structured as:

```
⚖️ [Article Number] ([Year])          — citation badge (Required / Informational)
[Rule summary — 2-4 sentences max]
📍 COLORADO SPRINGS                    — always present
[Local adoption status + PPRBD notes]
[Pricebook action — only if billable item applies]
  [Item name] · $[price]   [+ Add button]
```

### Pricebook Linkage
The AI knows the pricebook categories. When a code answer involves a billable item, the API route looks up matching pricebook entries and returns them with the answer. Billable triggers:
- NEC 230.67 → Whole-Home Surge Protector
- NEC 210.8 → GFCI Outlet or Dual-Function AFCI/GFCI Breaker
- NEC 210.12 → AFCI Breaker
- NEC 406.12 → Tamper-Resistant Receptacle
- NEC 250.53 → Ground Rod (additional)

### "Add to Estimate" Flow
- If user came from an estimate (referrer = `/estimates/[id]`): add directly, return to estimate
- Otherwise: show a bottom sheet with recent estimates to pick from, or "New Estimate"

---

## Part 2 — Deeper AI Knowledge (System Prompt Enhancement)

### Already in the prompt (keep, verify accuracy)
- Wire types (URD, THWN, XHHW-2, NM-B, MC, SER/SEU)
- Conduit types (EMT, RMC, PVC, LFMC, FMC)
- Service entrance sizing 100A–400A
- Underground burial depths (Table 300.5)
- GFCI (210.8), AFCI (210.12), Panel rules
- NEC 2023 new articles: 230.67, 406.12, 210.8(B), 408.4, 110.16
- Colorado Springs / PPRBD specifics
- Code compliance behavior table

### New sections to add

**Article 220 — Load Calculations**
- Standard method vs. 220.83 optional method (existing dwelling)
- Demand factors for electric ranges, dryers, HVAC
- Worked example: 200A service load calc for a 2,000 sq ft home
- When load calc is required by PPRBD for permit submission

**Article 314 — Box Fill**
- Conductor count rules
- Box fill table (conductor = 2.0 cu in for #14, 2.25 for #12, 2.5 for #10)
- Device fill, clamp fill, equipment grounding conductor fill
- When to upsize a box

**Article 625 — EV Charging**
- EVSE circuit sizing (Level 1 vs Level 2)
- 80% continuous load rule: 50A breaker → 40A EVSE
- GFCI requirements for outdoor EVSE
- Load management system requirements (NEC 625.42)
- NEMA 14-50 vs hardwired EVSE

**Voltage Drop**
- NEC recommends ≤3% for branch circuits, ≤5% total (informational annex)
- Formula: VD = (2 × K × I × L) / CM
- Practical guidance: when to upsize wire on long runs (>100ft)
- Common fixes: upsizing one gauge, running parallel conductors

**Conduit Fill (Annex C)**
- 40% fill rule for 3+ conductors
- Common scenarios: #12 THHN in ½" EMT (max 9 conductors)
- When to upsize conduit

**NEC 2026 Preview (what's coming)**
- Article 230: potential changes to service entrance rules
- Receptacle tamper-resistance expanded scope
- EV ready parking provisions (Article 625 expansion)
- Arc-flash labeling requirements broadened
- Note: NEC 2026 not yet adopted in Colorado. Colorado is on NEC 2023. Flag answers accordingly.

**Article 702 — Generators / Transfer Switches**
- Standby system requirements
- Transfer switch sizing
- Permit requirements in Colorado Springs
- Interlock kit vs. ATS

**Articles 690 / 706 — Solar & Battery Storage**
- Rapid shutdown requirements (690.12)
- Battery system disconnect
- Backfeed breaker labeling
- When to pull separate permit vs. combined

---

## Architecture

### New Files
| File | Purpose |
|------|---------|
| `app/(app)/tools/nec/page.tsx` | Server component page — `export const dynamic = 'force-dynamic'`, fetches Code Compliance pricebook entries, passes to client |
| `components/tools/NecReference.tsx` | Client component — search input, category tiles, streaming answer display |
| `app/api/nec/route.ts` | Streaming API route — NEC-specific system prompt, pricebook lookup |

### Modified Files
| File | Change |
|------|--------|
| `lib/ai/prompts.ts` | Add new NEC knowledge sections (Article 220, 314, 625, voltage drop, conduit fill, NEC 2026, 702, 690/706) |
| `app/(app)/tools/page.tsx` | Add NEC tile to tools hub |

### API Route Design (`/api/nec`)
Pattern: follow `/api/ai/route.ts` (existing streaming route). Uses `client.messages.stream()` with `ReadableStream`.

- Accepts POST: `{ query: string, category?: string, pricebook: PricebookEntry[] }`
- Pricebook is fetched server-side in the page component (Code Compliance category only), passed as a prop to `NecReference.tsx`, then POSTed to this route in the request body. Do NOT call Supabase inside the streaming route.
- Uses Claude (claude-sonnet-4-20250514) with NEC-specific system prompt
- Streams plain text response
- `NecReference.tsx` matches pricebook items client-side by checking which NEC article trigger appears in the streamed answer (5 known triggers mapped to pricebook item IDs)

### Pricebook Matching (client-side)
The 5 billable triggers are matched client-side after the stream completes:
```
NEC 230.67 → look up "Whole-Home Surge Protector" in passed pricebook
NEC 210.8  → look up "GFCI Outlet" or "Dual-Function AFCI/GFCI Breaker"
NEC 210.12 → look up "AFCI Breaker"
NEC 406.12 → look up "Tamper-Resistant Receptacle"
NEC 250.53 → look up "Ground Rod"
```
After stream completes, scan answer text for article numbers → surface matching pricebook entry if found.

### "Add to Estimate" Flow (simplified)
Navigate to `/estimates/new?item=<pricebook-id>`. The EstimateBuilder reads this param on mount and pre-populates the line item. No referrer detection, no picker sheet needed.

### NEC System Prompt (route-specific)
Separate from the main `SYSTEM_PROMPT` in `prompts.ts`. Focused entirely on:
- NEC 2023 code knowledge
- Colorado Springs / PPRBD specifics
- Structured answer format (article → rule → Colorado note)
- No estimate-building, customer, or business logic

---

## UI Details

### `/tools/nec` Page
- Dark page header: "⚖️ NEC Quick Reference" + "NEC 2023 · Colorado Springs"
- Search bar: green accent (distinct from gold used elsewhere) to signal "code mode"
- Category grid: 2-column, 4 rows, icon + label
- Answer area: slides in below search after submit; green left border on answer card
- Colorado note: always shown in a muted inset block
- Pricebook action: gold card at bottom of answer, only rendered when `pricebookMatch` present in response

### Category tap behavior
- Pre-fills the search input with a canonical query for that category
- Auto-submits immediately (no extra tap needed)

### Answer streaming
- Same streaming pattern as existing `/api/chat` and `/api/tools` routes
- Show typing indicator while streaming
- Clear previous answer when new query submitted

---

## Out of Scope (this release)
- Saving answers / bookmarking
- Code history (previous lookups)
- Sharing answers (copy to clipboard is fine natively)
- Load calculator interactive tool (separate feature)
- Conduit fill calculator (separate feature)

---

## Success Criteria
- User can ask any NEC question and get an answer with article citation in <5 seconds
- All 8 category tiles return relevant structured answers
- Answers always include Colorado Springs / PPRBD note
- Pricebook "Add" button appears for the 5 billable code triggers
- Enhanced AI chat answers NEC questions with the same structured format
- NEC 2026 questions get a clear "not yet adopted in CO" caveat
