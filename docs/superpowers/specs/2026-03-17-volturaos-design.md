# VolturaOS — Design Spec
**Date:** 2026-03-17
**Owner:** Dev, Voltura Power Group
**Purpose:** Internal field service management tool replacing ServiceTitan for a solo electrical contracting business in Colorado Springs, CO.

---

## Overview

VolturaOS is a mobile-first PWA (Progressive Web App) built as a single Next.js 14 application. It covers customer CRM, job dispatch, flat-rate estimating, invoicing, AI assistance, and field operations. It runs entirely on free-tier infrastructure (Vercel + Supabase) with zero monthly cost.

---

## Decisions Made

| Question | Decision |
|---|---|
| Estimate "send via SMS" | Public read-only page at `/estimates/[id]/view` — no login, branded, marks estimate as Viewed on load |
| Daily Telegram digest | Manual "Send Daily Digest" button on dashboard — no cron job |
| Google Sheets sync | Fire-and-forget — app responds instantly, Sheets sync runs in background |
| PWA offline support | Full offline writes — IndexedDB queue + Background Sync API |
| Implementation approach | Next.js Server Actions (Approach A) — no separate API layer |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ with App Router |
| UI | React + Tailwind CSS |
| Database | Supabase (PostgreSQL) — free tier |
| Auth | Supabase Auth — magic link email login |
| Mutations | Next.js Server Actions (server-side only) |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) via server actions |
| Offline | Service Worker + Background Sync API + IndexedDB |
| Telegram | Bot API via `lib/telegram.ts` fire-and-forget helper |
| Google Sheets | Sheets API v4 + service account via `lib/sheets.ts` fire-and-forget helper |
| Hosting | Vercel (free tier) |
| PDF | `@react-pdf/renderer` for estimate and invoice PDFs |

---

## Brand

- **Dark background:** `#1A1F6E`
- **Mid blue:** `#2E4BA0`
- **Gold accent:** `#C9A227`
- **Font:** Inter
- **Wordmark:** "VOLTURA" in gold on dark blue header
- **Mode:** Dark by default

---

## Project Structure

```
volturaos/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (app)/                        # Protected — requires Supabase session
│   │   ├── layout.tsx                # Auth guard + bottom nav
│   │   ├── page.tsx                  # Dashboard / KPIs
│   │   ├── jobs/
│   │   │   ├── page.tsx              # Job board (week + day views)
│   │   │   └── [id]/page.tsx         # Job detail + checklist + photos + signature
│   │   ├── customers/
│   │   │   ├── page.tsx              # Customer list + search
│   │   │   └── [id]/page.tsx         # Customer detail + equipment + history
│   │   ├── estimates/
│   │   │   ├── page.tsx              # Estimates list + status
│   │   │   └── [id]/page.tsx         # Estimate builder
│   │   ├── invoices/
│   │   │   ├── page.tsx              # Invoice list + aging report
│   │   │   └── [id]/page.tsx         # Invoice detail + mark paid
│   │   └── settings/
│   │       └── pricebook/page.tsx    # Global pricebook editor
│   ├── estimates/[id]/view/page.tsx  # PUBLIC — no auth — customer-facing estimate view
│   └── api/
│       └── ai/route.ts               # Streaming Claude API route (server-side only)
├── components/
│   ├── estimate-builder/
│   │   ├── CustomerSelector.tsx
│   │   ├── JobTypeSelector.tsx
│   │   ├── TierCards.tsx
│   │   ├── TierCard.tsx
│   │   ├── AddOnsPanel.tsx
│   │   ├── CustomLineItems.tsx
│   │   ├── LiveTotal.tsx
│   │   └── EditablePrice.tsx
│   ├── ai-chat/
│   │   ├── AIChatWidget.tsx          # Floating button + drawer — calls POST /api/ai only
│   │   ├── ChatModeTab.tsx
│   │   └── StreamingResponse.tsx
│   ├── ui/                           # Shared primitives
│   └── nav/
│       └── BottomNav.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client (anon key only)
│   │   ├── server.ts                 # Server component client
│   │   └── admin.ts                  # Service key client — SERVER ONLY, never imported by components
│   ├── actions/                      # Server actions only — never imported by client components
│   │   ├── customers.ts
│   │   ├── jobs.ts
│   │   ├── estimates.ts
│   │   ├── invoices.ts
│   │   └── pricebook.ts
│   ├── telegram.ts                   # SERVER ONLY
│   ├── sheets.ts                     # SERVER ONLY
│   ├── checklist-templates.ts
│   └── ai/
│       └── prompts.ts                # SERVER ONLY — never imported by client components
├── hooks/
│   └── useOfflineQueue.ts
└── public/
    ├── manifest.json
    ├── sw.js
    ├── icon-192.png                  # Required for PWA install
    └── icon-512.png                  # Required for PWA install
```

---

## Auth

- Supabase magic link (email only — no password)
- `(app)` layout server component checks session → redirects to `/login` if none
- Single user for v1; adding a second user requires no code changes
- Session stored in Supabase cookie (handled by `@supabase/ssr`)

---

## Security Constraints

### API Key Isolation
- `ANTHROPIC_API_KEY` is accessed only in `app/api/ai/route.ts`
- `lib/ai/prompts.ts` is server-only — never imported by any file under `components/`
- `AIChatWidget.tsx` calls `POST /api/ai` via `fetch` only — it never imports the Anthropic SDK
- `SUPABASE_SERVICE_KEY` is accessed only in `lib/supabase/admin.ts` — never in `client.ts`
- `GOOGLE_SERVICE_ACCOUNT_JSON` and `TELEGRAM_BOT_TOKEN` accessed only in `lib/sheets.ts` and `lib/telegram.ts` respectively — both server-only

### Row Level Security (RLS)
- RLS is **enabled** on all tables in Supabase
- Policy on every table: `authenticated` role can SELECT/INSERT/UPDATE/DELETE their own data
- The browser Supabase client (anon key) is subject to RLS — only authenticated sessions can read/write
- Server actions use the service key (bypasses RLS) — this is intentional and safe because server actions run server-side only
- The public estimate view route (`/estimates/[id]/view`) uses the service key server-side to fetch estimate data — it never exposes the key to the browser

### Public Estimate View Access Control
- `/estimates/[id]/view` only renders if estimate status is `Sent`, `Viewed`, `Approved`, or `Declined`
- If status is `Draft` or the ID does not exist → return `notFound()` (renders a 404 page)
- This prevents internal draft estimates (which may contain pricing notes) from being publicly accessible

---

## Database Schema

```sql
-- customers
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text default 'Colorado Springs',
  state text default 'CO',
  zip text,
  phone text,
  email text,
  property_type text default 'residential',
  notes text,
  created_at timestamptz default now()
);

-- customer_equipment
create table customer_equipment (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  type text,
  brand text,
  amperage text,
  age_years int,
  notes text
);

-- jobs
create table jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  job_type text not null,
  status text default 'Lead',
  scheduled_date date,
  scheduled_time time,
  notes text,
  tech_name text default 'Dev',
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- pricebook
create table pricebook (
  id uuid primary key default gen_random_uuid(),
  job_type text not null unique,
  description_good text,
  description_better text,
  description_best text,
  price_good numeric(10,2),
  price_better numeric(10,2),
  price_best numeric(10,2),
  includes_permit boolean default false,
  notes text,
  active boolean default true
);

-- estimates
create table estimates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id),
  customer_id uuid references customers(id),
  status text default 'Draft',
  tier_selected text,
  line_items jsonb,  -- [{description, price, is_override, original_price}]
  addons jsonb,      -- [{name, price, selected}]
  subtotal numeric(10,2),
  total numeric(10,2),
  notes text,
  sent_at timestamptz,
  viewed_at timestamptz,
  approved_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz default now()
);

-- invoices
create table invoices (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid references estimates(id),
  job_id uuid references jobs(id),
  customer_id uuid references customers(id),
  line_items jsonb,
  total numeric(10,2),
  amount_paid numeric(10,2) default 0,  -- running total of all payments received
  balance numeric(10,2) generated always as (total - amount_paid) stored,
  status text default 'Unpaid',  -- Unpaid | Partial | Paid
  due_date date,
  notes text,
  created_at timestamptz default now()
);

-- invoice_payments (supports multiple partial payments)
create table invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id) on delete cascade,
  amount numeric(10,2) not null,
  payment_method text not null,  -- Check | Zelle | Cash | Credit Card
  paid_at timestamptz default now(),
  notes text
);
-- When a payment is recorded: INSERT into invoice_payments, then UPDATE invoices.amount_paid
-- invoice.status = 'Paid' when amount_paid >= total; 'Partial' when 0 < amount_paid < total

-- job_checklists
create table job_checklists (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  template_name text,
  items jsonb,  -- [{label, checked, required}]
  completed_at timestamptz,
  updated_at timestamptz default now()
);

-- job_photos
create table job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  url text not null,
  caption text,
  photo_type text,  -- 'before' | 'after' | 'permit' | 'signature' | 'other'
  uploaded_at timestamptz default now()
);
```

---

## Pricebook Seed Data

| Job Type | Good | Better | Best |
|---|---|---|---|
| Panel upgrade 100A→200A | $3,200 | $4,200 | $5,800 |
| Panel upgrade 200A→400A | $5,500 | $7,500 | $9,500 |
| EV Charger L2 (circuit only) | $850 | $1,200 | $1,650 |
| EV Charger L2 (full install) | $1,200 | $1,600 | $2,100 |
| New circuit 20A | $350 | $500 | $750 |
| New circuit 240V dedicated | $550 | $750 | $1,100 |
| Breaker replacement (standard) | $175 | $250 | $375 |
| AFCI breaker replacement | $225 | $325 | $450 |
| GFCI outlet install | $175 | $250 | $325 |
| Standard outlet install | $150 | $200 | $275 |
| Ceiling fan (existing box) | $175 | $250 | $325 |
| Ceiling fan (new wiring) | $375 | $500 | $675 |
| Service call / diagnostic | $175 flat | — | — |
| Smoke/CO detector | $125 | $175 | $225 |
| Whole-home surge protector | $350 | $500 | $650 |
| Electrical inspection | $175 | $250 | $325 |
| Subpanel install | $1,800 | $2,500 | $3,800 |

---

## Module Designs

### 1. Customer CRM
- Fields: name, address, city (default CO Springs), state, zip, phone, email, property type, notes
- Equipment sub-table: type, brand, amperage, age, notes (multiple per customer)
- Quick Add flow: name + phone required, all else optional, 2-tap entry
- Search: debounced full-text across name, address, phone
- Customer detail shows all linked jobs, estimates, invoices

### 2. Job Board
- Two views: Week (7-day grid) and Day (timeline)
- Job card shows: customer name, job type, address, status pill, dollar value
- Status flow: Lead → Scheduled → In Progress → Completed → Invoiced → Paid → Cancelled
- One-tap status update via bottom sheet
- `tech_name` field on every job — ready for multi-tech filtering

### 3. Pricebook Settings
- Table at `/settings/pricebook`
- Every price cell is `<EditablePrice>` — tap to edit, saves on blur via server action
- "Reset to Default" per row
- Changes are global — all new estimates use updated prices

### 4. Estimate Builder (Priority #1)

**Component tree:**
```
EstimateBuilder
├── CustomerSelector         # Search or Quick Add
├── JobTypeSelector          # Pulls from pricebook
├── TierCards                # Horizontal scroll on mobile
│   └── TierCard x3         # Description + price both editable, select button
├── AddOnsPanel              # 5 defaults + inline editable prices
├── CustomLineItems          # Freeform rows, unlimited
├── LiveTotal                # Sticky bottom, updates on every keystroke
└── ActionBar                # AI Assist | Preview Quote | Save Draft | Send
```

**EditablePrice behavior:**
- Displays as styled text with gold underline + pencil icon
- Tap → large `<input type="number">` with $ prefix
- Blur → formats to `$1,200`
- Override shows original pricebook value as strikethrough ghost
- Per-estimate only — pricebook unchanged

**Tier cards:**
- Mobile: horizontal scroll, peek on sides
- "Better" has gold `RECOMMENDED` badge (removable)
- Switching tiers swaps base line items; add-ons and custom items stay

**Add-ons (defaults):**
- Whole-home surge protector (+$500)
- AFCI breaker upgrade (+$350)
- Permit included (+$250)
- Priority scheduling (+$150)
- 1-year labor warranty (+$200)

**Estimate statuses:** Draft → Sent → Viewed → Approved → Declined

**Send flow (Draft → Sent):**
1. User taps "Send" in the ActionBar
2. A bottom sheet appears with three options:
   - **Copy SMS link** — copies `https://[vercel-domain]/estimates/[id]/view` to clipboard; user pastes into their own SMS app
   - **Send email** — opens `mailto:` link pre-filled with customer email, subject, and a short message containing the link
   - **Download PDF** — generates and downloads a PDF version of the estimate
3. On any send action, the server action sets `status = 'Sent'` and `sent_at = now()`
4. Telegram fires: `📋 Estimate sent to [Name] — [Job Type] — $[Total]`

**Public view:** `/estimates/[id]/view`
- No auth required
- Only renders for status `Sent`, `Viewed`, `Approved`, or `Declined` — returns 404 for `Draft`
- On load: server action updates `status = 'Viewed'` and `viewed_at = now()` (idempotent — only sets once)
- Shows: Voltura logo, customer name, job type, selected tier, line items, add-ons, total, payment methods (text only), contact footer "Questions? Call Dev: 719-XXX-XXXX"

**AI context injection mechanism:**
- The `(app)` layout renders `<AIChatWidget>` and passes it a `pageContext` prop
- Each page (estimate builder, job detail) passes its current record data up via a React context (`AIContextProvider`)
- `AIChatWidget` reads from `AIContextProvider` — when context is set, it pre-selects the matching mode tab and populates the context fields
- When context is empty (dashboard, customer list, etc.) → defaults to Free Chat mode

### 5. Invoice + Payment
- One-tap convert from approved estimate
- Payment methods displayed as text: Check, Zelle, Cash, Credit Card (no processing)
- Mark Paid bottom sheet: amount, date, method → creates row in `invoice_payments` table + updates `invoices.amount_paid`
- Multiple partial payments supported — each payment is a separate `invoice_payments` row
- `invoices.balance` is a computed column (`total - amount_paid`) — never manually set
- `invoices.status` is set by the server action: `Paid` when `amount_paid >= total`; `Partial` when `0 < amount_paid < total`; `Unpaid` otherwise
- Payment history tab on invoice detail shows all `invoice_payments` rows
- PDF via `@react-pdf/renderer` with Voltura branding
- CSV export — QuickBooks-compatible columns:
  `Customer, Invoice Date, Due Date, Item Description, Qty, Rate, Amount, Payment Method, Status`
- Aging buckets on dashboard: 0–30, 31–60, 60+ days

### 6. Field Checklists + Photos + Signature
- Job detail: three tabs — Notes | Checklist | Photos/Sig
- Checklist auto-populated from job type on creation
- Templates in `lib/checklist-templates.ts`:
  - **Panel upgrade:** utility coordination called, permit pulled, old panel photos, main breaker off, circuits labeled, torque specs verified, AFCI/GFCI installed, inspection scheduled, final photos
  - **EV charger:** load calc done, dedicated circuit run, correct amperage verified, permit pulled, charger mounted, tested with vehicle, photos taken
  - **Standard service:** before photo, diagnosis confirmed, parts logged, work completed, after photo, customer signed off
  - **All other job types:** empty checklist with a prompt to add items — no error, no template required
- Photos upload to Supabase Storage bucket `job-photos`
- Signature: `<canvas>` pad → PNG blob → uploaded to `job-photos/[job_id]/signature.png`

### 7. AI Assistant (Priority #2)

**Security:** `ANTHROPIC_API_KEY` is accessed only in `app/api/ai/route.ts`. `lib/ai/prompts.ts` is server-only. `AIChatWidget.tsx` calls `POST /api/ai` via fetch — it never imports the Anthropic SDK or accesses any API key.

**Route:** `POST /api/ai` — streaming response, server-side only

**Floating widget:** Gold button bottom-right above nav → expands to drawer with 5 mode tabs. Context injected via `AIContextProvider` (see Section 4).

**Five modes:**

| Mode | Input | Output |
|---|---|---|
| Estimate Assist | Job type, property notes, customer type, tier prices | Tier reasoning, upsell recommendations, red flags, talking points |
| Upsell Coach | Job type + current line items | 3 upsell opportunities with one-liner field scripts |
| Follow-Up Writer | Customer name, job status, days since contact | Ready-to-send SMS draft + email draft (copyable blocks) |
| Permit Checklist | Job type | PPRBD requirements for Colorado Springs — forms, docs, fees, inspections |
| Free Chat | Business context only | General assistant |

**System prompt (all modes):**
> "You are an AI assistant for Dev, owner of Voltura Power Group, a licensed electrical contractor in Colorado Springs, CO (license #3001608). Dev is a solo operator doing residential service work — panel upgrades, EV chargers, breaker work, and general electrical service. He uses flat-rate pricing with a Good/Better/Best model. He is focused on same-day closes, premium pricing, and high-value upsells. Be direct, specific, and actionable. No fluff. Colorado Springs market, 719 area code."

### 8. Dashboard KPIs
- Today's jobs (list)
- Revenue: this week / this month
- Open estimates: count + total value
- Outstanding invoices: count + total
- Avg ticket size — rolling 30 days
- Close rate — rolling 30 days
- Top 3 job types by revenue this month
- Quick action bar: `[+ Customer]` `[+ Job]` `[+ Estimate]`
- "Send Daily Digest" button → fires full Telegram digest

### 9. Telegram Integration
- Helper: `lib/telegram.ts` → `sendTelegram(message)` → fire-and-forget (server-only)
- **6 automatic event triggers** (fired from server actions):
  1. New customer: `👤 New customer: [Name] — [City]`
  2. Estimate sent: `📋 Estimate sent to [Name] — [Job Type] — $[Total]`
  3. Estimate approved: `✅ ESTIMATE APPROVED: [Name] — [Job Type] — $[Total] — CLOSE IT!`
  4. Estimate declined: `❌ Estimate declined: [Name] — [Job Type] — $[Total]`
  5. Invoice paid: `💰 PAID: [Name] — $[Amount] via [Method]`
  6. Job completed: `🔧 Job done: [Name] — [Job Type] — Consider requesting a review!`
- **1 manual digest** (fired from dashboard button — not an automatic event):
  ```
  ☀️ Good morning Dev!
  📅 Jobs today: [count] — [list names + job types]
  💵 Revenue this week: $[amount]
  📋 Open estimates: [count] worth $[total]
  💸 Unpaid invoices: [count] — $[total outstanding]
  ```
- Env vars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (7691231869)
- **Phase 1/2 stub:** `sendTelegram()` is implemented as a no-op stub in Phase 1/2. The real implementation is wired in Phase 3. Server actions call `void sendTelegram(...)` from the start so no refactoring is needed in Phase 3.

### 10. Google Sheets Sync
- Helper: `lib/sheets.ts` → `syncToSheets(tab, data)` → fire-and-forget (server-only)
- Sheet ID: `1s92WhFevMy1oQsZD5rsscFFPRCEfSysAQcx8WZ3AMp8`
- Upsert logic: match on ID column (column A on every tab), update row if exists, append if not
- Credentials: `GOOGLE_SERVICE_ACCOUNT_JSON` env var
- **Phase 1/2 stub:** `syncToSheets()` is a no-op stub until Phase 3

**Tab: Jobs**
`Timestamp | JobID | CustomerName | CustomerPhone | Address | JobType | Status | ScheduledDate | AssignedTech | Notes | EstimateValue | InvoiceTotal`

**Tab: Estimates**
`Timestamp | EstimateID | CustomerName | JobType | TierSelected | BasePrice | AddOns | Total | Status | SentDate | ApprovedDate`

**Tab: Invoices**
`Timestamp | InvoiceID | CustomerName | JobType | Total | AmountPaid | Balance | Status | PaymentMethod | PaidDate`

**Tab: Customers**
`Timestamp | CustomerID | Name | Phone | Email | Address | PropertyType | TotalJobCount | TotalRevenue`

---

## Offline Strategy

| Layer | Mechanism |
|---|---|
| App shell + static assets | Service worker Cache First |
| API/data reads | Network First with cache fallback |
| Mutations (offline) | IndexedDB queue + Background Sync API |
| Optimistic updates | `useOptimistic` — UI updates before server confirms |
| Sync indicator | Header badge shows count of pending queue items |

**What works offline:** view cached data, edit job status, add notes/checklist items, save estimate drafts, capture signature.
**What requires network:** AI assistant, Telegram/Sheets sync, photo upload (photo saved locally, upload queued).

---

## PWA Manifest

```json
{
  "name": "VolturaOS",
  "short_name": "Voltura",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1A1F6E",
  "theme_color": "#C9A227",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Icon assets:** `public/icon-192.png` and `public/icon-512.png` must be created during the scaffold step (Step 2). Use brand dark blue background with gold "V" wordmark.

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
ANTHROPIC_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=7691231869
GOOGLE_SHEETS_ID=1s92WhFevMy1oQsZD5rsscFFPRCEfSysAQcx8WZ3AMp8
GOOGLE_SERVICE_ACCOUNT_JSON=
```

---

## Build Order (Strict)

### Phase 1 — Core
1. Supabase project setup + full schema migration + pricebook seed data + RLS policies
2. Next.js scaffold: Tailwind, brand colors, bottom nav, PWA manifest, icon assets
3. Auth: magic link login, protected `(app)` layout
4. Pricebook settings screen — view and edit all prices
5. Customer CRM — create, view, search, edit, equipment
6. Estimate Builder — full Good/Better/Best, inline price editing, add-ons, custom items, live total, AI Assist button, preview, send flow, public view page
7. AI Assistant — all 5 modes, streaming, floating widget, context injection

### Phase 2 — Operations
8. Job board — calendar views, status cards, quick status updates
9. Invoice generation from approved estimate, payment tracking (multi-payment), PDF, CSV
10. Dashboard KPIs + Send Daily Digest button

### Phase 3 — Integrations
11. Telegram notifications — replace no-op stub with real implementation (all 6 auto events + manual digest)
12. Google Sheets real-time sync — replace no-op stub with real implementation (all 4 tabs)
13. Field checklists + photo upload + signature capture + offline queue

**Note on stubs:** `sendTelegram()` and `syncToSheets()` are written as no-op stubs from Step 1 so server actions can call them throughout Phase 1/2 without errors. Wiring in Phase 3 requires only changing the implementation of those two functions — no refactoring of callers needed.

---

## Business Context

- **Business:** Voltura Power Group — Colorado Springs, CO
- **License:** #3001608
- **Service area:** Colorado Springs, Pueblo, Falcon/Peyton, El Paso County
- **Operator:** Dev (solo) — single user v1
- **Run cost target:** $0/month (Vercel + Supabase free tiers)
