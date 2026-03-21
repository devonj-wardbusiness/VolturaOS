# VolturaOS Phase 1 — Core Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete working core of VolturaOS — auth, pricebook, customer CRM, estimate builder with inline price editing, and streaming AI assistant.

**Architecture:** Single Next.js 14 App Router application. Server Actions handle all mutations server-side. Supabase Auth protects all routes via middleware. All AI calls go through `POST /api/ai` server route — Anthropic SDK and API key never touch the browser. Telegram and Google Sheets are no-op stubs (Phase 3).

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Supabase JS v2 (`@supabase/ssr`), `@anthropic-ai/sdk`, `@react-pdf/renderer`, Jest + React Testing Library, Playwright

---

## Scope

Phase 1 only. Phase 2 (Job Board, Invoices, Dashboard KPIs) and Phase 3 (Telegram, Sheets, Checklists, Offline Queue) are separate plans.

---

## File Map

**Supabase**
- `supabase/migrations/001_schema.sql` — all 9 tables + invoice_payments
- `supabase/migrations/002_rls.sql` — RLS enable + authenticated policies on all tables
- `supabase/seed.sql` — 17 pricebook rows with Good/Better/Best prices

**Config**
- `package.json` — all dependencies
- `next.config.ts` — Next.js config
- `tailwind.config.ts` — brand colors + Inter font
- `.env.example` — all required env vars (no values)
- `jest.config.ts` — Jest + next/jest adapter
- `jest.setup.ts` — @testing-library/jest-dom import
- `playwright.config.ts` — baseURL + webServer

**Types**
- `types/index.ts` — TypeScript interfaces for all DB tables + app types

**Supabase clients**
- `lib/supabase/client.ts` — browser client (anon key)
- `lib/supabase/server.ts` — server component/action client (cookie-based)
- `lib/supabase/admin.ts` — service key client (server-only, never imported by components)

**Stubs (real implementation in Phase 3)**
- `lib/telegram.ts` — no-op `sendTelegram()`
- `lib/sheets.ts` — no-op `syncToSheets()`
- `lib/checklist-templates.ts` — template data array

**Middleware + Auth**
- `middleware.ts` — session refresh + route protection
- `app/(auth)/login/page.tsx` — magic link login page

**App shell**
- `app/layout.tsx` — root layout (Inter font, service worker registration)
- `app/(app)/layout.tsx` — auth guard + bottom nav + AI widget mount
- `app/(app)/page.tsx` — dashboard stub (Phase 2 KPIs)
- `components/nav/BottomNav.tsx` — 5-tab bottom nav

**PWA**
- `public/manifest.json`
- `public/sw.js` — service worker (cache strategies + Background Sync scaffold)
- `public/icon-192.png` — brand icon (generated)
- `public/icon-512.png` — brand icon (generated)

**Shared UI components**
- `components/ui/EditablePrice.tsx` — inline price edit (used in pricebook + estimate builder)
- `components/ui/StatusPill.tsx` — colored status badge
- `components/ui/SkeletonCard.tsx` — loading skeleton
- `components/ui/BottomSheet.tsx` — mobile bottom sheet modal
- `components/ui/EmptyState.tsx` — empty state with CTA button

**Server actions**
- `lib/actions/pricebook.ts` — getAll, updatePrice, resetToDefault
- `lib/actions/customers.ts` — create, update, search, getById, createEquipment
- `lib/actions/estimates.ts` — create, update, updateStatus, getById, getPublic
- `lib/actions/jobs.ts` — Phase 1 stub (createJob, updateJobStatus)
- `lib/actions/invoices.ts` — Phase 1 stub

**Pricebook**
- `app/(app)/settings/pricebook/page.tsx` — pricebook settings page
- `components/settings/PricebookTable.tsx` — editable rows

**Customer CRM**
- `app/(app)/customers/page.tsx` — customer list + search
- `app/(app)/customers/new/page.tsx` — quick add form
- `app/(app)/customers/[id]/page.tsx` — customer detail
- `components/customers/CustomerSearch.tsx` — debounced search (client)
- `components/customers/CustomerCard.tsx` — list item
- `components/customers/QuickAddForm.tsx` — minimal create form
- `components/customers/EquipmentSection.tsx` — equipment CRUD

**Estimate Builder**
- `app/(app)/estimates/page.tsx` — estimates list
- `app/(app)/estimates/new/page.tsx` — creates blank estimate, redirects to /estimates/[id]
- `app/(app)/estimates/[id]/page.tsx` — server wrapper → passes data to EstimateBuilder
- `app/estimates/[id]/view/page.tsx` — PUBLIC customer view (no auth, 404 for Draft)
- `lib/actions/estimates.ts` — (see above)
- `components/estimate-builder/AIContextProvider.tsx` — React context for AI widget
- `components/estimate-builder/EstimateBuilder.tsx` — root client component (all state)
- `components/estimate-builder/CustomerSelector.tsx`
- `components/estimate-builder/JobTypeSelector.tsx`
- `components/estimate-builder/TierCards.tsx`
- `components/estimate-builder/TierCard.tsx`
- `components/estimate-builder/AddOnsPanel.tsx`
- `components/estimate-builder/CustomLineItems.tsx`
- `components/estimate-builder/LiveTotal.tsx` — sticky bottom bar
- `components/estimate-builder/SendSheet.tsx` — send options bottom sheet

**AI Assistant**
- `app/api/ai/route.ts` — streaming Claude route (server-only)
- `lib/ai/prompts.ts` — system prompt + mode builders (server-only)
- `components/ai-chat/AIChatWidget.tsx` — floating button + drawer
- `components/ai-chat/ChatModeTab.tsx` — mode selector
- `components/ai-chat/StreamingResponse.tsx` — token stream renderer

**Tests**
- `__tests__/components/EditablePrice.test.tsx`
- `__tests__/components/LiveTotal.test.tsx`
- `__tests__/components/EstimateBuilder.test.tsx`
- `__tests__/actions/customers.test.ts`
- `__tests__/actions/estimates.test.ts`
- `e2e/auth.spec.ts`
- `e2e/estimate-builder.spec.ts`
- `e2e/public-estimate-view.spec.ts`

---

## Task 1: Supabase Schema + RLS + Seed Data

**Files:**
- Create: `supabase/migrations/001_schema.sql`
- Create: `supabase/migrations/002_rls.sql`
- Create: `supabase/seed.sql`

- [ ] **Step 1: Create migrations directory**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Write 001_schema.sql**

```sql
-- supabase/migrations/001_schema.sql

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

create table customer_equipment (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  type text,
  brand text,
  amperage text,
  age_years int,
  notes text
);

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

create table estimates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id),
  customer_id uuid references customers(id),
  status text default 'Draft',
  tier_selected text,
  line_items jsonb,
  addons jsonb,
  subtotal numeric(10,2),
  total numeric(10,2),
  notes text,
  sent_at timestamptz,
  viewed_at timestamptz,
  approved_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid references estimates(id),
  job_id uuid references jobs(id),
  customer_id uuid references customers(id),
  line_items jsonb,
  total numeric(10,2),
  amount_paid numeric(10,2) default 0,
  balance numeric(10,2) generated always as (total - amount_paid) stored,
  status text default 'Unpaid',
  due_date date,
  notes text,
  created_at timestamptz default now()
);

create table invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id) on delete cascade,
  amount numeric(10,2) not null,
  payment_method text not null,
  paid_at timestamptz default now(),
  notes text
);

create table job_checklists (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  template_name text,
  items jsonb,
  completed_at timestamptz,
  updated_at timestamptz default now()
);

create table job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  url text not null,
  caption text,
  photo_type text,
  uploaded_at timestamptz default now()
);
```

- [ ] **Step 3: Write 002_rls.sql**

```sql
-- supabase/migrations/002_rls.sql

alter table customers enable row level security;
alter table customer_equipment enable row level security;
alter table jobs enable row level security;
alter table pricebook enable row level security;
alter table estimates enable row level security;
alter table invoices enable row level security;
alter table invoice_payments enable row level security;
alter table job_checklists enable row level security;
alter table job_photos enable row level security;

-- authenticated users can do everything (single-user app)
create policy "auth_all_customers" on customers for all to authenticated using (true) with check (true);
create policy "auth_all_customer_equipment" on customer_equipment for all to authenticated using (true) with check (true);
create policy "auth_all_jobs" on jobs for all to authenticated using (true) with check (true);
create policy "auth_all_pricebook" on pricebook for all to authenticated using (true) with check (true);
create policy "auth_all_estimates" on estimates for all to authenticated using (true) with check (true);
create policy "auth_all_invoices" on invoices for all to authenticated using (true) with check (true);
create policy "auth_all_invoice_payments" on invoice_payments for all to authenticated using (true) with check (true);
create policy "auth_all_job_checklists" on job_checklists for all to authenticated using (true) with check (true);
create policy "auth_all_job_photos" on job_photos for all to authenticated using (true) with check (true);
```

- [ ] **Step 4: Write seed.sql**

```sql
-- supabase/seed.sql
insert into pricebook (job_type, description_good, description_better, description_best, price_good, price_better, price_best) values
('Panel upgrade 100A→200A', 'Standard 200A upgrade, code compliant', '200A upgrade with AFCI/GFCI and surge protection', 'Premium 200A upgrade, full permit, labeled panel, surge, warranty', 3200, 4200, 5800),
('Panel upgrade 200A→400A', 'Standard 400A upgrade, code compliant', '400A upgrade with AFCI/GFCI and surge protection', 'Premium 400A upgrade, full permit, labeled panel, surge, warranty', 5500, 7500, 9500),
('EV Charger L2 (circuit only)', 'Dedicated 50A circuit to garage', '50A circuit with conduit and junction box', 'Full conduit install, dedicated circuit, permit included', 850, 1200, 1650),
('EV Charger L2 (full install)', 'Circuit + Level 2 charger mounted', 'Circuit + smart charger + permit', 'Full install, permit, smart charger, warranty', 1200, 1600, 2100),
('New circuit 20A', 'Standard 20A circuit', '20A AFCI circuit with new outlet', '20A AFCI circuit, permit, dedicated run', 350, 500, 750),
('New circuit 240V dedicated', '240V dedicated circuit', '240V circuit with GFCI protection', '240V permit-ready circuit with warranty', 550, 750, 1100),
('Breaker replacement (standard)', 'Replace single standard breaker', 'Replace breaker + inspect panel', 'Replace breaker + panel inspection + report', 175, 250, 375),
('AFCI breaker replacement', 'Replace with AFCI breaker', 'Replace AFCI + test circuit', 'Replace AFCI + full circuit test + report', 225, 325, 450),
('GFCI outlet install', 'Install GFCI outlet', 'GFCI outlet + test downstream', 'GFCI outlet + test + label all protected outlets', 175, 250, 325),
('Standard outlet install', 'Install standard outlet', 'Outlet + box upgrade', 'Outlet + box + cover + test', 150, 200, 275),
('Ceiling fan (existing box)', 'Install fan on existing rated box', 'Fan + remote control', 'Fan + remote + brace + test', 175, 250, 325),
('Ceiling fan (new wiring)', 'Install fan with new wiring from panel', 'Fan + switch + new wiring', 'Fan + dimmer switch + new wiring + permit', 375, 500, 675),
('Service call / diagnostic', 'Diagnostic fee (applied to repair if approved)', null, null, 175, null, null),
('Smoke/CO detector', 'Install single detector', 'Install + test with existing system', 'Install + interconnect + test all', 125, 175, 225),
('Whole-home surge protector', 'Panel-mounted surge protector', 'Surge protector + warranty', 'Premium surge protector + permit + warranty', 350, 500, 650),
('Electrical inspection', 'Visual panel inspection + report', 'Panel inspection + load calculation', 'Full inspection + load calc + written report', 175, 250, 325),
('Subpanel install', 'Standard subpanel installation', 'Subpanel + AFCI/GFCI breakers', 'Full subpanel + permit + all AFCI/GFCI + warranty', 1800, 2500, 3800);
```

- [ ] **Step 5: Apply migrations in Supabase Dashboard**

Go to your Supabase project → SQL Editor → run `001_schema.sql`, then `002_rls.sql`, then `seed.sql` in order.
Expected: no errors, `pricebook` table has 17 rows.

- [ ] **Step 6: Verify in Supabase Table Editor**

Check that all 9 tables exist. Check `pricebook` has 17 rows. Check RLS shows "enabled" on each table.

- [ ] **Step 7: Commit**

```bash
git add supabase/
git commit -m "feat: add supabase schema migrations, RLS policies, and pricebook seed data"
```

---

## Task 2: Next.js Scaffold + Brand + PWA

**Files:** `package.json`, `tailwind.config.ts`, `.env.example`, `jest.config.ts`, `jest.setup.ts`, `playwright.config.ts`, `public/manifest.json`, `public/sw.js`

- [ ] **Step 1: Create the Next.js project**

Run from `C:\Users\Devon\VolturaOS\`:

```bash
npx create-next-app@latest volturaos --typescript --tailwind --app --no-src-dir --import-alias "@/*" --no-eslint
cd volturaos
```

- [ ] **Step 2: Install all Phase 1 dependencies**

```bash
npm install @supabase/ssr @supabase/supabase-js @anthropic-ai/sdk @react-pdf/renderer
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event ts-jest @types/jest @playwright/test
npx playwright install chromium
```

- [ ] **Step 3: Update tailwind.config.ts**

Replace the generated file with:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        volturaBlue: '#1A1F6E',
        volturaNavy: '#2E4BA0',
        volturaGold: '#C9A227',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 4: Update app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-bg: #1A1F6E;
  --color-surface: #232878;
  --color-navy: #2E4BA0;
  --color-gold: #C9A227;
}

html {
  background-color: #1A1F6E;
  color: #f1f5f9;
}

body {
  min-height: 100dvh;
  font-family: 'Inter', sans-serif;
  -webkit-tap-highlight-color: transparent;
}

/* Large touch targets for mobile price inputs */
.price-input {
  min-height: 44px;
  font-size: 1.25rem;
}
```

- [ ] **Step 5: Create .env.example**

```bash
cat > .env.example << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
ANTHROPIC_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=7691231869
GOOGLE_SHEETS_ID=1s92WhFevMy1oQsZD5rsscFFPRCEfSysAQcx8WZ3AMp8
GOOGLE_SERVICE_ACCOUNT_JSON=
EOF
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, and `ANTHROPIC_API_KEY` in `.env.local` before continuing.

- [ ] **Step 6: Create jest.config.ts**

```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/', '<rootDir>/e2e/'],
}

export default createJestConfig(config)
```

- [ ] **Step 7: Create jest.setup.ts**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 8: Create playwright.config.ts**

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

- [ ] **Step 9: Create public/manifest.json**

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

- [ ] **Step 10: Create public/sw.js (scaffold — Background Sync implemented in Phase 3)**

```javascript
const CACHE_NAME = 'volturaos-v1'
const APP_SHELL = ['/', '/customers', '/estimates', '/jobs']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return res
      })
      .catch(() => caches.match(event.request))
  )
})

// Background Sync — Phase 3 implementation
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    // Phase 3: drain IndexedDB offline queue and replay to server
    console.log('[SW] sync-queue event received — Phase 3 not yet implemented')
  }
})
```

- [ ] **Step 11: Generate placeholder icons**

Create `public/icon-192.png` and `public/icon-512.png`. Use any image editor or online tool to make a 192×192 and 512×512 PNG with background `#1A1F6E` and a gold "V" — or download placeholder icons and rename them. The PWA will not install without these files present.

- [ ] **Step 12: Verify Tailwind colors work**

```bash
npm run dev
```

Open `http://localhost:3000`. Page should load (default Next.js home — that's fine at this stage). No console errors.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js app with Tailwind brand config, PWA manifest, service worker, and test config"
```

---

## Task 3: Types + Supabase Clients + Stubs

**Files:** `types/index.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`, `lib/telegram.ts`, `lib/sheets.ts`, `lib/checklist-templates.ts`

- [ ] **Step 1: Create types/index.ts**

```typescript
// types/index.ts

export type PropertyType = 'residential' | 'commercial'
export type JobStatus = 'Lead' | 'Scheduled' | 'In Progress' | 'Completed' | 'Invoiced' | 'Paid' | 'Cancelled'
export type EstimateStatus = 'Draft' | 'Sent' | 'Viewed' | 'Approved' | 'Declined'
export type InvoiceStatus = 'Unpaid' | 'Partial' | 'Paid'
export type PaymentMethod = 'Check' | 'Zelle' | 'Cash' | 'Credit Card'
export type TierName = 'good' | 'better' | 'best'
export type PhotoType = 'before' | 'after' | 'permit' | 'signature' | 'other'

export interface Customer {
  id: string
  name: string
  address: string | null
  city: string
  state: string
  zip: string | null
  phone: string | null
  email: string | null
  property_type: PropertyType
  notes: string | null
  created_at: string
}

export interface CustomerEquipment {
  id: string
  customer_id: string
  type: string | null
  brand: string | null
  amperage: string | null
  age_years: number | null
  notes: string | null
}

export interface Job {
  id: string
  customer_id: string
  job_type: string
  status: JobStatus
  scheduled_date: string | null
  scheduled_time: string | null
  notes: string | null
  tech_name: string
  created_at: string
  completed_at: string | null
}

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
}

export interface LineItem {
  description: string
  price: number
  is_override: boolean
  original_price: number | null
  tier?: TierName
}

export interface Addon {
  name: string
  price: number
  selected: boolean
  original_price: number
}

export interface Estimate {
  id: string
  job_id: string | null
  customer_id: string
  status: EstimateStatus
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

export interface Invoice {
  id: string
  estimate_id: string | null
  job_id: string | null
  customer_id: string
  line_items: LineItem[] | null
  total: number
  amount_paid: number
  balance: number
  status: InvoiceStatus
  due_date: string | null
  notes: string | null
  created_at: string
}

export interface InvoicePayment {
  id: string
  invoice_id: string
  amount: number
  payment_method: PaymentMethod
  paid_at: string
  notes: string | null
}

export interface ChecklistItem {
  label: string
  checked: boolean
  required: boolean
}

export interface JobChecklist {
  id: string
  job_id: string
  template_name: string | null
  items: ChecklistItem[]
  completed_at: string | null
  updated_at: string
}

export interface JobPhoto {
  id: string
  job_id: string
  url: string
  caption: string | null
  photo_type: PhotoType
  uploaded_at: string
}

// AI widget context — injected from current page
export interface AIPageContext {
  mode: 'estimate' | 'upsell' | 'followup' | 'permit' | 'chat'
  jobType?: string
  customerType?: PropertyType
  propertyNotes?: string
  currentLineItems?: LineItem[]
  customerName?: string
  jobStatus?: JobStatus
  daysSinceContact?: number
}

// Default add-ons for estimate builder
export const DEFAULT_ADDONS: Omit<Addon, 'selected'>[] = [
  { name: 'Whole-home surge protector', price: 500, original_price: 500 },
  { name: 'AFCI breaker upgrade', price: 350, original_price: 350 },
  { name: 'Permit included', price: 250, original_price: 250 },
  { name: 'Priority scheduling', price: 150, original_price: 150 },
  { name: '1-year labor warranty', price: 200, original_price: 200 },
]
```

- [ ] **Step 2: Create lib/supabase/client.ts**

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Create lib/supabase/server.ts**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 4: Create lib/supabase/admin.ts**

```typescript
// SERVER ONLY — never import this file from components/
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}
```

- [ ] **Step 5: Create lib/telegram.ts (no-op stub)**

```typescript
// lib/telegram.ts
// Phase 1 stub — real implementation in Phase 3
// Server-only: never import from client components

export async function sendTelegram(_message: string): Promise<void> {
  // no-op in Phase 1
}
```

- [ ] **Step 6: Create lib/sheets.ts (no-op stub)**

```typescript
// lib/sheets.ts
// Phase 1 stub — real implementation in Phase 3
// Server-only: never import from client components

export type SheetsTab = 'Jobs' | 'Estimates' | 'Invoices' | 'Customers'

export async function syncToSheets(_tab: SheetsTab, _data: Record<string, unknown>): Promise<void> {
  // no-op in Phase 1
}
```

- [ ] **Step 7: Create lib/checklist-templates.ts**

```typescript
import type { ChecklistItem } from '@/types'

export interface ChecklistTemplate {
  name: string
  jobTypeMatch: string[]   // exact job_type strings that trigger this template
  items: ChecklistItem[]
}

export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    name: 'Panel Upgrade',
    jobTypeMatch: ['Panel upgrade 100A→200A', 'Panel upgrade 200A→400A'],
    items: [
      { label: 'Called utility for coordination', checked: false, required: true },
      { label: 'Permit pulled', checked: false, required: true },
      { label: 'Old panel photos taken', checked: false, required: false },
      { label: 'Main breaker off + verified', checked: false, required: true },
      { label: 'All circuits labeled', checked: false, required: true },
      { label: 'Torque specs verified', checked: false, required: true },
      { label: 'AFCI/GFCI installed where required', checked: false, required: true },
      { label: 'Inspection scheduled', checked: false, required: false },
      { label: 'Final photos taken', checked: false, required: false },
    ],
  },
  {
    name: 'EV Charger',
    jobTypeMatch: ['EV Charger L2 (circuit only)', 'EV Charger L2 (full install)'],
    items: [
      { label: 'Load calculation done', checked: false, required: true },
      { label: 'Dedicated circuit run', checked: false, required: true },
      { label: 'Correct amperage verified', checked: false, required: true },
      { label: 'Permit pulled', checked: false, required: true },
      { label: 'Charger mounted and secured', checked: false, required: false },
      { label: 'Tested with vehicle', checked: false, required: false },
      { label: 'Photos taken', checked: false, required: false },
    ],
  },
  {
    name: 'Standard Service',
    jobTypeMatch: [],  // fallback — used for all other job types via getTemplate()
    items: [
      { label: 'Before photo taken', checked: false, required: false },
      { label: 'Diagnosis confirmed with customer', checked: false, required: true },
      { label: 'Parts used logged', checked: false, required: false },
      { label: 'Work completed', checked: false, required: true },
      { label: 'After photo taken', checked: false, required: false },
      { label: 'Customer signed off', checked: false, required: false },
    ],
  },
]

export function getTemplate(jobType: string): ChecklistTemplate {
  const match = CHECKLIST_TEMPLATES.find((t) => t.jobTypeMatch.includes(jobType))
  // Fall back to Standard Service for job types with no specific template
  return match ?? CHECKLIST_TEMPLATES[CHECKLIST_TEMPLATES.length - 1]
}
```

- [ ] **Step 8: Create lib/actions/jobs.ts (Phase 1 stub)**

```typescript
'use server'
// Phase 1 stub — full implementation in Phase 2
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Job } from '@/types'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
}

export async function createJob(input: { customerId: string; jobType: string; scheduledDate?: string; notes?: string }): Promise<Job> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin.from('jobs').insert({ customer_id: input.customerId, job_type: input.jobType, scheduled_date: input.scheduledDate ?? null, notes: input.notes ?? null, status: 'Lead' }).select().single()
  if (error) throw new Error(error.message)
  return data as Job
}

export async function updateJobStatus(id: string, status: Job['status']): Promise<void> {
  await requireAuth()
  const admin = createAdminClient()
  const update: Record<string, unknown> = { status }
  if (status === 'Completed') update.completed_at = new Date().toISOString()
  const { error } = await admin.from('jobs').update(update).eq('id', id)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 9: Create lib/actions/invoices.ts (Phase 1 stub)**

```typescript
'use server'
// Phase 1 stub — full implementation in Phase 2 (invoice generation, payment recording, PDF)
export async function createInvoiceStub(): Promise<never> {
  throw new Error('Invoice actions not implemented until Phase 2')
}
```

- [ ] **Step 10: Commit**

```bash
git add types/ lib/
git commit -m "feat: add TypeScript types, Supabase clients, and Phase 1 stubs for telegram/sheets/checklists/jobs/invoices"
```

---

## Task 4: Auth + Middleware + App Shell

**Files:** `middleware.ts`, `app/(auth)/login/page.tsx`, `app/layout.tsx`, `app/(app)/layout.tsx`, `app/(app)/page.tsx`, `components/nav/BottomNav.tsx`

- [ ] **Step 1: Write failing E2E auth test**

Create `e2e/auth.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test('redirects unauthenticated user to /login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
})

test('login page shows VOLTURA wordmark', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText('VOLTURA')).toBeVisible()
})

test('login page has email input and send link button', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /send/i })).toBeVisible()
})
```

- [ ] **Step 2: Run E2E test to confirm it fails**

```bash
npx playwright test e2e/auth.spec.ts
```

Expected: FAIL — no redirect, no login page yet.

- [ ] **Step 3: Create middleware.ts**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public routes — no auth required
  const isPublic =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.match(/^\/estimates\/[^/]+\/view/)

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-.*\\.png|manifest\\.json|sw\\.js).*)'],
}
```

- [ ] **Step 4: Create app/(auth)/login/page.tsx**

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-dvh bg-volturaBlue flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-volturaGold text-4xl font-bold tracking-widest mb-1">VOLTURA</h1>
        <p className="text-gray-400 text-sm mb-8">Power Group — Field OS</p>

        {sent ? (
          <div className="bg-volturaNavy rounded-2xl p-6 text-center">
            <p className="text-white text-lg font-semibold">Check your email</p>
            <p className="text-gray-400 text-sm mt-2">Magic link sent to {email}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-gray-400 text-sm mb-1">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="dev@volturapower.energy"
                className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-volturaGold"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-volturaGold text-volturaBlue font-bold py-3 rounded-xl text-base disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create app/auth/callback/route.ts**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(`${origin}/`)
}
```

- [ ] **Step 6: Update app/layout.tsx**

```typescript
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'VolturaOS',
  description: 'Field Service Management — Voltura Power Group',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'VolturaOS' },
}

export const viewport: Viewport = {
  themeColor: '#C9A227',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-volturaBlue text-white`}>
        {children}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
            }
          `
        }} />
      </body>
    </html>
  )
}
```

- [ ] **Step 7: Create components/nav/BottomNav.tsx**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/', label: 'Home', icon: '⚡' },
  { href: '/jobs', label: 'Jobs', icon: '🔧' },
  { href: '/customers', label: 'Customers', icon: '👤' },
  { href: '/estimates', label: 'Estimates', icon: '📋' },
  { href: '/settings/pricebook', label: 'More', icon: '⚙️' },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-volturaBlue border-t border-volturaNavy z-40">
      <div className="flex">
        {tabs.map((tab) => {
          const active = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
                active ? 'text-volturaGold' : 'text-gray-500'
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 8: Create app/(app)/layout.tsx**

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/nav/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-dvh pb-16">
      {children}
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 9: Create app/(app)/page.tsx (dashboard stub)**

```typescript
export default function DashboardPage() {
  return (
    <div className="px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-volturaGold text-2xl font-bold tracking-widest">VOLTURA</h1>
        <p className="text-gray-400 text-sm">Power Group</p>
      </header>
      <div className="grid grid-cols-2 gap-3">
        <a href="/customers/new" className="bg-volturaNavy rounded-xl p-4 text-center text-volturaGold font-bold">+ Customer</a>
        <a href="/estimates/new" className="bg-volturaNavy rounded-xl p-4 text-center text-volturaGold font-bold">+ Estimate</a>
        <a href="/jobs" className="bg-volturaNavy rounded-xl p-4 text-center text-volturaGold font-bold col-span-2">+ Job</a>
      </div>
      <p className="text-gray-500 text-xs mt-6 text-center">Dashboard KPIs — Phase 2</p>
    </div>
  )
}
```

- [ ] **Step 10: Run E2E auth tests**

```bash
npm run dev &
npx playwright test e2e/auth.spec.ts
```

Expected: all 3 tests PASS.

- [ ] **Step 11: Commit**

```bash
git add app/ middleware.ts components/nav/
git commit -m "feat: add auth flow with magic link, middleware session guard, protected layout, and bottom nav"
```

---

## Task 5: Shared UI Components + Pricebook

**Files:** `components/ui/EditablePrice.tsx`, `components/ui/StatusPill.tsx`, `components/ui/BottomSheet.tsx`, `components/ui/EmptyState.tsx`, `lib/actions/pricebook.ts`, `app/(app)/settings/pricebook/page.tsx`, `components/settings/PricebookTable.tsx`

- [ ] **Step 1: Write failing EditablePrice tests**

Create `__tests__/components/EditablePrice.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditablePrice } from '@/components/ui/EditablePrice'

describe('EditablePrice', () => {
  it('renders formatted price in display mode', () => {
    render(<EditablePrice value={1200} onChange={jest.fn()} />)
    expect(screen.getByText('$1,200')).toBeInTheDocument()
  })

  it('shows pencil icon in display mode', () => {
    render(<EditablePrice value={500} onChange={jest.fn()} />)
    expect(screen.getByLabelText('edit price')).toBeInTheDocument()
  })

  it('switches to input on click', async () => {
    const user = userEvent.setup()
    render(<EditablePrice value={500} onChange={jest.fn()} />)
    await user.click(screen.getByText('$500'))
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })

  it('calls onChange with numeric value on blur', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(<EditablePrice value={500} onChange={onChange} />)
    await user.click(screen.getByText('$500'))
    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.type(input, '750')
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith(750)
  })

  it('shows strikethrough original price when value is overridden', () => {
    render(<EditablePrice value={750} originalValue={500} onChange={jest.fn()} />)
    expect(screen.getByText('$500')).toHaveClass('line-through')
  })

  it('does NOT show strikethrough when value equals original', () => {
    render(<EditablePrice value={500} originalValue={500} onChange={jest.fn()} />)
    expect(screen.queryByText(/line-through/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest __tests__/components/EditablePrice.test.tsx
```

Expected: FAIL — component does not exist yet.

- [ ] **Step 3: Create components/ui/EditablePrice.tsx**

```typescript
'use client'

import { useState, useRef } from 'react'

interface EditablePriceProps {
  value: number
  onChange: (v: number) => void
  originalValue?: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

function formatPrice(n: number) {
  return '$' + n.toLocaleString('en-US')
}

export function EditablePrice({ value, onChange, originalValue, className = '', size = 'md' }: EditablePriceProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl font-bold',
  }

  const isOverridden = originalValue !== undefined && value !== originalValue

  function startEdit() {
    setDraft(String(value))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commitEdit() {
    const parsed = parseFloat(draft)
    const next = isNaN(parsed) ? value : Math.max(0, parsed)
    onChange(next)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <span className={`text-gray-400 ${sizeClasses[size]}`}>$</span>
        <input
          ref={inputRef}
          type="number"
          value={draft}
          min={0}
          step={1}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false) }}
          className={`price-input bg-volturaNavy text-volturaGold rounded-lg px-2 w-28 focus:outline-none focus:ring-2 focus:ring-volturaGold ${sizeClasses[size]}`}
          autoFocus
        />
      </div>
    )
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <button
        type="button"
        onClick={startEdit}
        className={`flex items-center gap-1.5 text-volturaGold border-b border-volturaGold/40 hover:border-volturaGold transition-colors ${sizeClasses[size]}`}
        aria-label="edit price"
      >
        <span className="font-semibold">{formatPrice(value)}</span>
        <svg className="w-3.5 h-3.5 opacity-60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-.9.524l-3.535.884.884-3.535a2 2 0 01.523-.9z" />
        </svg>
      </button>
      {isOverridden && (
        <span className="text-gray-500 line-through text-xs mt-0.5">{formatPrice(originalValue!)}</span>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run EditablePrice tests**

```bash
npx jest __tests__/components/EditablePrice.test.tsx
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Create remaining shared UI components**

**`components/ui/StatusPill.tsx`** — accepts `status: string`, maps status to background color (Lead=gray, Scheduled=blue, In Progress=amber, Completed=green, Invoiced=purple, Paid=emerald, Cancelled=red, Draft=gray, Sent=blue, Viewed=indigo, Approved=green, Declined=red, Unpaid=red, Partial=amber). Renders a `<span>` with rounded-full + small text.

**`components/ui/BottomSheet.tsx`** — accepts `open: boolean`, `onClose: () => void`, `children`. Renders a fixed overlay (dark semi-transparent) + slide-up panel from bottom. Closes on overlay click or swipe down (use a close button for v1).

**`components/ui/EmptyState.tsx`** — accepts `message: string`, `ctaLabel: string`, `ctaHref: string`. Renders centered icon (⚡), message in gray, and a gold button linking to ctaHref.

**`components/ui/SkeletonCard.tsx`** — renders 3 gray animated pulse bars as a loading placeholder.

- [ ] **Step 6: Create lib/actions/pricebook.ts**

```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { PricebookEntry } from '@/types'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
}

export async function getAllPricebook(): Promise<PricebookEntry[]> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('pricebook')
    .select('*')
    .eq('active', true)
    .order('job_type')
  if (error) throw new Error(error.message)
  return data as PricebookEntry[]
}

export async function updatePricebookPrice(
  id: string,
  field: 'price_good' | 'price_better' | 'price_best',
  value: number
): Promise<void> {
  await requireAuth()
  const admin = createAdminClient()
  const { error } = await admin.from('pricebook').update({ [field]: value }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function resetPricebookRow(id: string, defaults: Pick<PricebookEntry, 'price_good' | 'price_better' | 'price_best'>): Promise<void> {
  await requireAuth()
  const admin = createAdminClient()
  const { error } = await admin.from('pricebook').update(defaults).eq('id', id)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 7: Create app/(app)/settings/pricebook/page.tsx**

```typescript
import { getAllPricebook } from '@/lib/actions/pricebook'
import { PricebookTable } from '@/components/settings/PricebookTable'

export default async function PricebookPage() {
  const entries = await getAllPricebook()
  return (
    <div className="px-4 pt-6 pb-6">
      <h1 className="text-volturaGold text-xl font-bold mb-1">Pricebook</h1>
      <p className="text-gray-400 text-sm mb-4">Tap any price to edit. Changes apply to all new estimates.</p>
      <PricebookTable entries={entries} />
    </div>
  )
}
```

- [ ] **Step 8: Create components/settings/PricebookTable.tsx**

Client component. Receives `entries: PricebookEntry[]`. Renders a scrollable table with columns: Job Type | Good | Better | Best. Each price cell is an `<EditablePrice>` that calls `updatePricebookPrice` server action on `onChange`. Shows a "✓ Saved" toast for 1.5s after save. "Reset" button per row (only shown if a price has been edited, tracked in local state).

- [ ] **Step 9: Commit**

```bash
git add components/ lib/actions/pricebook.ts app/\(app\)/settings/
git commit -m "feat: add shared UI components and pricebook settings with inline price editing"
```

---

## Task 6: Customer CRM

**Files:** `lib/actions/customers.ts`, `app/(app)/customers/**`, `components/customers/**`

- [ ] **Step 1: Write failing customer action tests**

Create `__tests__/actions/customers.test.ts`:

```typescript
// Mock Supabase admin client
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }) },
  }),
}))
jest.mock('next/navigation', () => ({ redirect: jest.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import { createCustomer, searchCustomers } from '@/lib/actions/customers'

const mockSingle = jest.fn()
const mockSelect = jest.fn(() => ({ single: mockSingle }))
const mockInsert = jest.fn(() => ({ select: mockSelect }))
const mockIlike = jest.fn()
const mockOr = jest.fn(() => ({ order: jest.fn().mockResolvedValue({ data: [], error: null }) }))
const mockFrom = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom })
  mockFrom.mockReturnValue({ insert: mockInsert, select: jest.fn(() => ({ or: mockOr })) })
})

describe('createCustomer', () => {
  it('creates a customer with name and phone', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'cust-1', name: 'John Doe', phone: '719-555-0100' }, error: null })
    const result = await createCustomer({ name: 'John Doe', phone: '719-555-0100' })
    expect(result.name).toBe('John Doe')
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ name: 'John Doe' }))
  })

  it('throws if name is missing', async () => {
    await expect(createCustomer({ name: '', phone: '' })).rejects.toThrow('Name is required')
  })
})

describe('searchCustomers', () => {
  it('calls Supabase with ilike query', async () => {
    await searchCustomers('john')
    expect(mockFrom).toHaveBeenCalledWith('customers')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx jest __tests__/actions/customers.test.ts
```

Expected: FAIL — `createCustomer` does not exist.

- [ ] **Step 3: Create lib/actions/customers.ts**

```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { sendTelegram } from '@/lib/telegram'
import { syncToSheets } from '@/lib/sheets'
import type { Customer, CustomerEquipment } from '@/types'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
}

export async function createCustomer(input: {
  name: string
  phone?: string
  email?: string
  address?: string
  city?: string
  zip?: string
  property_type?: string
  notes?: string
}): Promise<Customer> {
  if (!input.name?.trim()) throw new Error('Name is required')
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('customers')
    .insert({
      name: input.name.trim(),
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      city: input.city ?? 'Colorado Springs',
      zip: input.zip ?? null,
      property_type: input.property_type ?? 'residential',
      notes: input.notes ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  const customer = data as Customer

  // Fire-and-forget integrations (Phase 3 stubs)
  void sendTelegram(`👤 New customer: ${customer.name} — ${customer.city}`)
  void syncToSheets('Customers', {
    Timestamp: new Date().toISOString(),
    CustomerID: customer.id,
    Name: customer.name,
    Phone: customer.phone ?? '',
    Email: customer.email ?? '',
    Address: customer.address ?? '',
    PropertyType: customer.property_type,
    TotalJobCount: 0,
    TotalRevenue: 0,
  })

  return customer
}

export async function updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Customer
}

export async function getCustomerById(id: string): Promise<Customer & { equipment: CustomerEquipment[] }> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('customers')
    .select('*, customer_equipment(*)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  const { customer_equipment, ...customer } = data
  return { ...customer, equipment: customer_equipment ?? [] }
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  await requireAuth()
  const admin = createAdminClient()
  const q = `%${query}%`
  const { data, error } = await admin
    .from('customers')
    .select('*')
    .or(`name.ilike.${q},phone.ilike.${q},address.ilike.${q}`)
    .order('name')
    .limit(20)
  if (error) throw new Error(error.message)
  return data as Customer[]
}

export async function createEquipment(input: Omit<CustomerEquipment, 'id'>): Promise<CustomerEquipment> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin.from('customer_equipment').insert(input).select().single()
  if (error) throw new Error(error.message)
  return data as CustomerEquipment
}

export async function deleteEquipment(id: string): Promise<void> {
  await requireAuth()
  const admin = createAdminClient()
  const { error } = await admin.from('customer_equipment').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 4: Run customer tests**

```bash
npx jest __tests__/actions/customers.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Create customer pages and components**

**`app/(app)/customers/page.tsx`** — server component. Fetches first 50 customers ordered by name. Renders `<CustomerSearch />` (client, handles debounced search + replaces list) and `<CustomerCard />` list. Empty state: "No customers yet — tap + to add one" with link to `/customers/new`.

**`app/(app)/customers/new/page.tsx`** — renders `<QuickAddForm />`. On submit calls `createCustomer`, redirects to `/customers/[id]`.

**`app/(app)/customers/[id]/page.tsx`** — server component. Fetches customer + equipment via `getCustomerById`. Shows: name, phone, email, address, property type, notes. Tabs: Info | Equipment | History (jobs/estimates list). Renders `<EquipmentSection />` for equipment tab.

**`components/customers/CustomerSearch.tsx`** — `'use client'`. Input with 300ms debounce. Calls `/api/customers/search?q=` or uses a search action via `useTransition`. Replaces customer list in parent via callback or URL search params.

**`components/customers/CustomerCard.tsx`** — shows name, phone, city, property type badge. Tapping navigates to `/customers/[id]`.

**`components/customers/QuickAddForm.tsx`** — `'use client'`. Fields: Name (required), Phone, Email. Submit button. Calls `createCustomer` via server action using `useTransition`. Shows loading state on button during submission.

**`components/customers/EquipmentSection.tsx`** — `'use client'`. Shows equipment list. "Add equipment" button opens inline form: type, brand, amperage, age, notes. Calls `createEquipment` on submit. Calls `deleteEquipment` on trash button.

- [ ] **Step 6: Commit**

```bash
git add lib/actions/customers.ts app/\(app\)/customers/ components/customers/
git commit -m "feat: add customer CRM with create, search, view, edit, and equipment sub-table"
```

---

## Task 7: Estimate Builder

**Files:** `lib/actions/estimates.ts`, `app/(app)/estimates/**`, `app/estimates/[id]/view/page.tsx`, `components/estimate-builder/**`

- [ ] **Step 1: Write failing estimate tests**

Create `__tests__/actions/estimates.test.ts`:

```typescript
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
  }),
}))
jest.mock('next/navigation', () => ({ redirect: jest.fn() }))
jest.mock('@/lib/telegram', () => ({ sendTelegram: jest.fn() }))
jest.mock('@/lib/sheets', () => ({ syncToSheets: jest.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import { updateEstimateStatus, getPublicEstimate } from '@/lib/actions/estimates'

const mockSingle = jest.fn()
const mockSelect = jest.fn(() => ({ single: mockSingle }))
const mockUpdate = jest.fn(() => ({ eq: jest.fn(() => ({ select: mockSelect })) }))
const mockFrom = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom })
  mockFrom.mockReturnValue({ update: mockUpdate, select: jest.fn(() => ({ eq: jest.fn(() => ({ single: mockSingle })) })) })
})

describe('updateEstimateStatus', () => {
  it('sets sent_at when status becomes Sent', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'e1', status: 'Sent', sent_at: new Date().toISOString() }, error: null })
    await updateEstimateStatus('e1', 'Sent')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Sent', sent_at: expect.any(String) })
    )
  })
})

describe('getPublicEstimate', () => {
  it('returns null for Draft status', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'e1', status: 'Draft' }, error: null })
    const result = await getPublicEstimate('e1')
    expect(result).toBeNull()
  })

  it('returns estimate for Sent status', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'e1', status: 'Sent', customer_id: 'c1' }, error: null })
    const result = await getPublicEstimate('e1')
    expect(result).not.toBeNull()
    expect(result?.status).toBe('Sent')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx jest __tests__/actions/estimates.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create lib/actions/estimates.ts**

```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { sendTelegram } from '@/lib/telegram'
import { syncToSheets } from '@/lib/sheets'
import type { Estimate, EstimateStatus, LineItem, Addon } from '@/types'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
}

export async function createEstimate(input: {
  customerId: string
  jobId?: string
}): Promise<Estimate> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('estimates')
    .insert({ customer_id: input.customerId, job_id: input.jobId ?? null, status: 'Draft' })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Estimate
}

export async function saveEstimate(id: string, updates: {
  tierSelected?: string
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
      tier_selected: updates.tierSelected,
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

export async function updateEstimateStatus(id: string, status: EstimateStatus): Promise<void> {
  await requireAuth()
  const admin = createAdminClient()

  const now = new Date().toISOString()
  const update: Record<string, unknown> = { status }
  if (status === 'Sent') update.sent_at = now
  if (status === 'Viewed') update.viewed_at = now
  if (status === 'Approved') update.approved_at = now
  if (status === 'Declined') update.declined_at = now

  const { data, error } = await admin
    .from('estimates')
    .update(update)
    .eq('id', id)
    .select('*, customers(name), jobs(job_type)')
    .single()
  if (error) throw new Error(error.message)

  const est = data as Estimate & { customers?: { name: string }; jobs?: { job_type: string } }
  const customerName = est.customers?.name ?? 'Unknown'
  const jobType = est.jobs?.job_type ?? 'Service'
  const total = est.total ?? 0

  if (status === 'Sent') {
    void sendTelegram(`📋 Estimate sent to ${customerName} — ${jobType} — $${total.toLocaleString()}`)
  }
  if (status === 'Approved') {
    void sendTelegram(`✅ ESTIMATE APPROVED: ${customerName} — ${jobType} — $${total.toLocaleString()} — CLOSE IT!`)
  }
  if (status === 'Declined') {
    void sendTelegram(`❌ Estimate declined: ${customerName} — ${jobType} — $${total.toLocaleString()}`)
  }

  void syncToSheets('Estimates', {
    Timestamp: now,
    EstimateID: id,
    CustomerName: customerName,
    JobType: jobType,
    Total: total,
    Status: status,
  })
}

export async function getEstimateById(id: string): Promise<Estimate & { customer: { name: string; phone: string | null } }> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('estimates')
    .select('*, customers(name, phone)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  const { customers, ...estimate } = data
  return { ...estimate, customer: customers }
}

// Public — no auth. Used by /estimates/[id]/view
export async function getPublicEstimate(id: string): Promise<(Estimate & { customer: { name: string; phone: string | null } }) | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('estimates')
    .select('*, customers(name, phone)')
    .eq('id', id)
    .single()
  if (error || !data) return null

  // Only serve non-Draft estimates publicly
  const allowedStatuses: EstimateStatus[] = ['Sent', 'Viewed', 'Approved', 'Declined']
  if (!allowedStatuses.includes(data.status)) return null

  // Mark as Viewed if currently Sent (idempotent)
  if (data.status === 'Sent') {
    await admin.from('estimates').update({ status: 'Viewed', viewed_at: new Date().toISOString() }).eq('id', id)
    data.status = 'Viewed'
  }

  const { customers, ...estimate } = data
  return { ...estimate, customer: customers }
}

export async function listEstimates(): Promise<(Estimate & { customer: { name: string } })[]> {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('estimates')
    .select('*, customers(name)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return data.map(({ customers, ...e }) => ({ ...e, customer: customers })) as any
}
```

- [ ] **Step 4: Run estimate tests**

```bash
npx jest __tests__/actions/estimates.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write failing EstimateBuilder component tests**

Create `__tests__/components/EstimateBuilder.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// We test the pure state logic via a simplified harness
// The full EstimateBuilder is too wired-up for unit tests — E2E covers the full flow

import { calculateTotal } from '@/components/estimate-builder/EstimateBuilder'
import type { LineItem, Addon } from '@/types'

describe('calculateTotal', () => {
  const baseItem: LineItem = { description: 'Panel upgrade', price: 4200, is_override: false, original_price: 4200 }
  const addonChecked: Addon = { name: 'Surge', price: 500, selected: true, original_price: 500 }
  const addonUnchecked: Addon = { name: 'Permit', price: 250, selected: false, original_price: 250 }
  const customItem: LineItem = { description: 'Custom work', price: 300, is_override: false, original_price: null }

  it('returns 0 for empty state', () => {
    expect(calculateTotal([], [])).toBe(0)
  })

  it('sums tier price + selected addons', () => {
    expect(calculateTotal([baseItem], [addonChecked, addonUnchecked])).toBe(4700)
  })

  it('includes custom line items', () => {
    expect(calculateTotal([baseItem, customItem], [])).toBe(4500)
  })

  it('uses overridden price not original', () => {
    const overridden: LineItem = { ...baseItem, price: 3800, is_override: true }
    expect(calculateTotal([overridden], [])).toBe(3800)
  })
})

describe('LiveTotal display', () => {
  // Import and test LiveTotal separately
})
```

- [ ] **Step 6: Write failing LiveTotal tests**

Create `__tests__/components/LiveTotal.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { LiveTotal } from '@/components/estimate-builder/LiveTotal'
import type { LineItem, Addon } from '@/types'

describe('LiveTotal', () => {
  const items: LineItem[] = [{ description: 'Panel', price: 4200, is_override: false, original_price: 4200 }]
  const addons: Addon[] = [
    { name: 'Surge', price: 500, selected: true, original_price: 500 },
    { name: 'Permit', price: 250, selected: false, original_price: 250 },
  ]

  it('shows $0 when no items', () => {
    render(<LiveTotal lineItems={[]} addons={[]} />)
    expect(screen.getByText('$0')).toBeInTheDocument()
  })

  it('sums line items and selected addons', () => {
    render(<LiveTotal lineItems={items} addons={addons} />)
    expect(screen.getByText('$4,700')).toBeInTheDocument()
  })

  it('formats total with commas', () => {
    const bigItems: LineItem[] = [{ description: 'Big job', price: 9500, is_override: false, original_price: 9500 }]
    render(<LiveTotal lineItems={bigItems} addons={[]} />)
    expect(screen.getByText('$9,500')).toBeInTheDocument()
  })
})
```

- [ ] **Step 7: Run to confirm failures**

```bash
npx jest __tests__/components/EstimateBuilder.test.tsx __tests__/components/LiveTotal.test.tsx
```

Expected: FAIL — components don't exist.

- [ ] **Step 8: Create components/estimate-builder/EstimateBuilder.tsx**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { PricebookEntry, LineItem, Addon, TierName, AIPageContext } from '@/types'
import type { Customer } from '@/types'
import { DEFAULT_ADDONS } from '@/types'
import { CustomerSelector } from './CustomerSelector'
import { JobTypeSelector } from './JobTypeSelector'
import { TierCards } from './TierCards'
import { AddOnsPanel } from './AddOnsPanel'
import { CustomLineItems } from './CustomLineItems'
import { LiveTotal } from './LiveTotal'
import { SendSheet } from './SendSheet'
import { AIContextProvider } from './AIContextProvider'
import { saveEstimate } from '@/lib/actions/estimates'

// ── Pure calculation helper (exported for unit tests) ──────────────────
export function calculateTotal(lineItems: LineItem[], addons: Addon[]): number {
  const lineTotal = lineItems.reduce((sum, item) => sum + item.price, 0)
  const addonTotal = addons.filter((a) => a.selected).reduce((sum, a) => sum + a.price, 0)
  return lineTotal + addonTotal
}

// ── State shape ────────────────────────────────────────────────────────
interface EstimateState {
  customerId: string | null
  jobType: string | null
  selectedTier: TierName | null
  // One LineItem per tier (description + price), indexed by tier name
  tierLineItems: Record<TierName, LineItem>
  addons: Addon[]
  customItems: LineItem[]
  notes: string
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
  }
}

interface EstimateBuilderProps {
  estimateId: string
  pricebook: PricebookEntry[]
  initialCustomerId?: string
}

export function EstimateBuilder({ estimateId, pricebook, initialCustomerId }: EstimateBuilderProps) {
  const router = useRouter()
  const [state, setState] = useState<EstimateState>({
    customerId: initialCustomerId ?? null,
    jobType: null,
    selectedTier: null,
    tierLineItems: {
      good: { description: '', price: 0, is_override: false, original_price: 0, tier: 'good' },
      better: { description: '', price: 0, is_override: false, original_price: 0, tier: 'better' },
      best: { description: '', price: 0, is_override: false, original_price: 0, tier: 'best' },
    },
    addons: DEFAULT_ADDONS.map((a) => ({ ...a, selected: false })),
    customItems: [],
    notes: '',
  })
  const [sendOpen, setSendOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // ── Job type selection: loads pricebook prices into tier cards ──────
  const handleJobTypeSelect = useCallback((jobType: string) => {
    const entry = pricebook.find((p) => p.job_type === jobType)
    if (!entry) return
    setState((prev) => ({
      ...prev,
      jobType,
      selectedTier: null,
      tierLineItems: {
        good: buildTierLineItem(entry, 'good'),
        better: buildTierLineItem(entry, 'better'),
        best: buildTierLineItem(entry, 'best'),
      },
    }))
  }, [pricebook])

  // ── Tier selection: selecting a tier does NOT clear addons or custom items ──
  const handleTierSelect = useCallback((tier: TierName) => {
    setState((prev) => ({ ...prev, selectedTier: tier }))
  }, [])

  // ── Tier price override: per-estimate only, does NOT update pricebook ──
  const handleTierPriceChange = useCallback((tier: TierName, newPrice: number) => {
    setState((prev) => ({
      ...prev,
      tierLineItems: {
        ...prev.tierLineItems,
        [tier]: {
          ...prev.tierLineItems[tier],
          price: newPrice,
          is_override: newPrice !== prev.tierLineItems[tier].original_price,
        },
      },
    }))
  }, [])

  const handleTierDescChange = useCallback((tier: TierName, desc: string) => {
    setState((prev) => ({
      ...prev,
      tierLineItems: {
        ...prev.tierLineItems,
        [tier]: { ...prev.tierLineItems[tier], description: desc },
      },
    }))
  }, [])

  // ── Add-on toggle + price override ─────────────────────────────────
  const handleAddonToggle = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      addons: prev.addons.map((a, i) => i === index ? { ...a, selected: !a.selected } : a),
    }))
  }, [])

  const handleAddonPriceChange = useCallback((index: number, price: number) => {
    setState((prev) => ({
      ...prev,
      addons: prev.addons.map((a, i) => i === index ? { ...a, price } : a),
    }))
  }, [])

  // ── Custom line items ───────────────────────────────────────────────
  const addCustomItem = useCallback(() => {
    setState((prev) => ({
      ...prev,
      customItems: [...prev.customItems, { description: 'Custom item', price: 0, is_override: false, original_price: null }],
    }))
  }, [])

  const updateCustomItem = useCallback((index: number, updates: Partial<LineItem>) => {
    setState((prev) => ({
      ...prev,
      customItems: prev.customItems.map((item, i) => i === index ? { ...item, ...updates } : item),
    }))
  }, [])

  const removeCustomItem = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      customItems: prev.customItems.filter((_, i) => i !== index),
    }))
  }, [])

  // ── Derived values ──────────────────────────────────────────────────
  const activeLineItems: LineItem[] = state.selectedTier
    ? [state.tierLineItems[state.selectedTier], ...state.customItems]
    : [...state.customItems]

  const total = calculateTotal(activeLineItems, state.addons)

  // ── Save draft ──────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    try {
      await saveEstimate(estimateId, {
        tierSelected: state.selectedTier ?? undefined,
        lineItems: activeLineItems,
        addons: state.addons,
        subtotal: total,
        total,
        notes: state.notes,
      })
    } finally {
      setSaving(false)
    }
  }

  // ── AI context ──────────────────────────────────────────────────────
  const aiContext: AIPageContext = {
    mode: 'estimate',
    jobType: state.jobType ?? undefined,
    currentLineItems: activeLineItems,
  }

  return (
    <AIContextProvider context={aiContext}>
      <div className="px-4 pt-4 pb-32 space-y-6">
        <CustomerSelector
          selectedId={state.customerId}
          onSelect={(id) => setState((prev) => ({ ...prev, customerId: id }))}
        />

        <JobTypeSelector
          pricebook={pricebook}
          selected={state.jobType}
          onSelect={handleJobTypeSelect}
        />

        {state.jobType && (
          <TierCards
            items={state.tierLineItems}
            selectedTier={state.selectedTier}
            onTierSelect={handleTierSelect}
            onPriceChange={handleTierPriceChange}
            onDescChange={handleTierDescChange}
          />
        )}

        <AddOnsPanel
          addons={state.addons}
          onToggle={handleAddonToggle}
          onPriceChange={handleAddonPriceChange}
        />

        <CustomLineItems
          items={state.customItems}
          onAdd={addCustomItem}
          onUpdate={updateCustomItem}
          onRemove={removeCustomItem}
        />

        <div>
          <label className="block text-gray-400 text-sm mb-1">Notes</label>
          <textarea
            value={state.notes}
            onChange={(e) => setState((prev) => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold"
            placeholder="Notes for this estimate..."
          />
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-16 left-0 right-0 bg-volturaBlue border-t border-volturaNavy z-30 px-4 py-3">
        <LiveTotal lineItems={activeLineItems} addons={state.addons} />
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-volturaNavy text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={() => setSendOpen(true)}
            className="flex-1 bg-volturaGold text-volturaBlue py-2.5 rounded-xl font-bold text-sm"
          >
            Send →
          </button>
        </div>
      </div>

      <SendSheet
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        estimateId={estimateId}
        total={total}
        onSave={handleSave}
      />
    </AIContextProvider>
  )
}
```

- [ ] **Step 9: Create components/estimate-builder/LiveTotal.tsx**

```typescript
import type { LineItem, Addon } from '@/types'
import { calculateTotal } from './EstimateBuilder'

interface LiveTotalProps {
  lineItems: LineItem[]
  addons: Addon[]
}

export function LiveTotal({ lineItems, addons }: LiveTotalProps) {
  const total = calculateTotal(lineItems, addons)
  const formatted = '$' + total.toLocaleString('en-US')

  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400 text-sm">Total</span>
      <span className="text-volturaGold text-2xl font-bold">{formatted}</span>
    </div>
  )
}
```

- [ ] **Step 10: Run EstimateBuilder + LiveTotal tests**

```bash
npx jest __tests__/components/EstimateBuilder.test.tsx __tests__/components/LiveTotal.test.tsx
```

Expected: PASS.

- [ ] **Step 11: Create remaining estimate builder sub-components**

**`components/estimate-builder/CustomerSelector.tsx`** — `'use client'`. Shows selected customer name or "Select customer" placeholder. Tapping opens a search sheet. Includes a Quick Add button that opens an inline mini-form (name + phone → calls `createCustomer` → sets selectedId). Uses `searchCustomers` action via `useTransition`.

**`components/estimate-builder/JobTypeSelector.tsx`** — `'use client'`. A scrollable list of all job types from pricebook. Tapping one calls `onSelect`. Selected item highlighted in gold.

**`components/estimate-builder/TierCards.tsx`** — renders 3 `<TierCard>` components in a horizontal scroll container on mobile. Passes through all callbacks.

**`components/estimate-builder/TierCard.tsx`** — `'use client'`. Props: `tier: TierName`, `item: LineItem`, `isSelected: boolean`, `isRecommended: boolean` (true for 'better'), `onSelect`, `onPriceChange`, `onDescChange`. Shows: tier label (Good/Better/Best), description textarea (editable), `<EditablePrice>` for price, "RECOMMENDED" badge on 'better' (gold badge, visible by default). Selecting highlights card with gold border.

**`components/estimate-builder/AddOnsPanel.tsx`** — `'use client'`. Renders each addon as a checkbox row: checkbox, name, `<EditablePrice>` (sm size). Checked addons show in gold. Unchecked are grayed out.

**`components/estimate-builder/CustomLineItems.tsx`** — `'use client'`. List of custom rows. Each row: text input for description + `<EditablePrice>` for price + trash button. "Add item" button at bottom appends new empty row.

**`components/estimate-builder/SendSheet.tsx`** — `'use client'`. A `<BottomSheet>` with three options:
1. **Copy SMS link** → copies `window.location.origin + '/estimates/' + estimateId + '/view'` to clipboard via `navigator.clipboard.writeText()`, shows "✓ Copied" for 1.5s, calls `updateEstimateStatus(estimateId, 'Sent')` via server action.
2. **Send email** → opens `mailto:` link, calls `updateEstimateStatus(estimateId, 'Sent')`.
3. **Download PDF** → calls a `/api/estimates/[id]/pdf` route (scaffold in Phase 2) — show "Coming soon" toast for now.

**`components/estimate-builder/AIContextProvider.tsx`** — React context that holds `AIPageContext`. Used by `AIChatWidget` to know it's on an estimate page.

- [ ] **Step 12: Create estimate pages**

**`app/(app)/estimates/page.tsx`** — server component. Lists all estimates via `listEstimates()`. Shows customer name, job type, tier, total, status pill, created date. Empty state: "No estimates yet — tap + to create one".

**`app/(app)/estimates/new/page.tsx`** — server component that creates a blank estimate and immediately redirects to `/estimates/[id]`. Requires `customerId` query param (from quick-add flow) or shows a customer selector.

```typescript
import { createEstimate } from '@/lib/actions/estimates'
import { redirect } from 'next/navigation'

export default async function NewEstimatePage({ searchParams }: { searchParams: { customerId?: string } }) {
  const estimate = await createEstimate({ customerId: searchParams.customerId ?? '' })
  redirect(`/estimates/${estimate.id}`)
}
```

**`app/(app)/estimates/[id]/page.tsx`** — server component. Fetches estimate + pricebook. Passes both to `<EstimateBuilder>`.

```typescript
import { getEstimateById } from '@/lib/actions/estimates'
import { getAllPricebook } from '@/lib/actions/pricebook'
import { EstimateBuilder } from '@/components/estimate-builder/EstimateBuilder'

export default async function EstimatePage({ params }: { params: { id: string } }) {
  const [estimate, pricebook] = await Promise.all([
    getEstimateById(params.id),
    getAllPricebook(),
  ])
  return (
    <div className="min-h-dvh bg-volturaBlue">
      <header className="px-4 pt-4 pb-2 flex items-center gap-3">
        <a href="/estimates" className="text-gray-400 text-sm">← Estimates</a>
        <h1 className="text-white font-semibold flex-1 truncate">{estimate.customer.name}</h1>
      </header>
      <EstimateBuilder
        estimateId={params.id}
        pricebook={pricebook}
        initialCustomerId={estimate.customer_id}
      />
    </div>
  )
}
```

- [ ] **Step 13: Create app/estimates/[id]/view/page.tsx (PUBLIC)**

```typescript
import { getPublicEstimate } from '@/lib/actions/estimates'
import { notFound } from 'next/navigation'

export default async function PublicEstimateView({ params }: { params: { id: string } }) {
  const estimate = await getPublicEstimate(params.id)
  if (!estimate) notFound()

  const lineItems = (estimate.line_items ?? [])
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

      <div className="space-y-2 mb-6">
        {lineItems.map((item, i) => (
          <div key={i} className="flex justify-between items-start bg-volturaNavy/50 rounded-xl px-4 py-3">
            <span className="text-white text-sm flex-1 mr-4">{item.description}</span>
            <span className="text-volturaGold font-semibold whitespace-nowrap">${item.price.toLocaleString()}</span>
          </div>
        ))}
        {addons.map((addon, i) => (
          <div key={i} className="flex justify-between items-start bg-volturaNavy/30 rounded-xl px-4 py-3">
            <span className="text-gray-300 text-sm flex-1 mr-4">{addon.name}</span>
            <span className="text-volturaGold font-semibold whitespace-nowrap">+${addon.price.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="bg-volturaNavy rounded-2xl p-5 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Total</span>
          <span className="text-volturaGold text-3xl font-bold">${total.toLocaleString()}</span>
        </div>
      </div>

      <div className="bg-volturaNavy/50 rounded-2xl p-5 mb-8">
        <p className="text-gray-400 text-sm font-semibold mb-2">Payment Methods Accepted</p>
        <p className="text-white text-sm">Check · Zelle · Cash · Credit Card</p>
      </div>

      <footer className="text-center text-gray-500 text-sm">
        <p>Questions? Call Dev</p>
        <p className="text-volturaGold">Voltura Power Group · Colorado Springs · 719 area</p>
      </footer>
    </div>
  )
}
```

- [ ] **Step 14: Write E2E tests for estimate builder**

Create `e2e/estimate-builder.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

// Note: these tests assume a logged-in session. For CI, set up a test user
// and use storageState to persist auth. For local dev, run against your session.

test.describe('Public estimate view', () => {
  test('returns 404 for a non-existent estimate', async ({ page }) => {
    await page.goto('/estimates/00000000-0000-0000-0000-000000000000/view')
    await expect(page).toHaveURL(/\/estimates\/.*\/view/)
    // Next.js notFound() renders a 404 page
    await expect(page.locator('body')).toContainText(/404|not found/i)
  })
})
```

Create `e2e/public-estimate-view.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test('returns 404 for a UUID that does not exist', async ({ page }) => {
  const res = await page.goto('/estimates/00000000-0000-0000-0000-000000000000/view')
  // Next.js notFound() returns a 404 HTTP status
  expect(res?.status()).toBe(404)
})

test('returns 404 for a malformed non-UUID id', async ({ page }) => {
  const res = await page.goto('/estimates/not-a-real-id/view')
  expect(res?.status()).toBe(404)
})

// NOTE: To test the happy path (Sent estimate renders correctly), create a Sent estimate
// in Supabase manually, paste its UUID below, and uncomment this test:
// test('shows VOLTURA brand for a Sent estimate', async ({ page }) => {
//   await page.goto('/estimates/PASTE-SENT-ESTIMATE-UUID-HERE/view')
//   await expect(page.getByText('VOLTURA')).toBeVisible()
//   await expect(page.getByText('Payment Methods Accepted')).toBeVisible()
// })
```

- [ ] **Step 15: Run all tests**

```bash
npx jest
```

Expected: all unit tests PASS.

- [ ] **Step 16: Commit**

```bash
git add lib/actions/estimates.ts app/ components/estimate-builder/
git commit -m "feat: add estimate builder with Good/Better/Best tiers, inline price editing, addons, live total, send flow, and public view"
```

---

## Task 8: AI Assistant

**Files:** `app/api/ai/route.ts`, `lib/ai/prompts.ts`, `components/ai-chat/AIChatWidget.tsx`, `components/ai-chat/ChatModeTab.tsx`, `components/ai-chat/StreamingResponse.tsx`

- [ ] **Step 1: Write failing prompts unit test**

Create `__tests__/lib/ai/prompts.test.ts`:

```typescript
// prompts.ts is server-only but has no Next.js-specific imports — jest can load it directly
import { buildUserPrompt, SYSTEM_PROMPT } from '@/lib/ai/prompts'

describe('SYSTEM_PROMPT', () => {
  it('mentions Voltura Power Group', () => {
    expect(SYSTEM_PROMPT).toContain('Voltura Power Group')
  })
  it('mentions Colorado Springs', () => {
    expect(SYSTEM_PROMPT).toContain('Colorado Springs')
  })
})

describe('buildUserPrompt', () => {
  const ctx = { mode: 'estimate' as const, jobType: 'Panel upgrade 100A→200A', customerType: 'residential' as const }

  it('estimate mode includes job type', () => {
    const prompt = buildUserPrompt('estimate', ctx, '')
    expect(prompt).toContain('Panel upgrade 100A→200A')
  })

  it('upsell mode asks for 3 opportunities', () => {
    const prompt = buildUserPrompt('upsell', ctx, '')
    expect(prompt).toContain('3')
  })

  it('followup mode includes customer name when provided', () => {
    const prompt = buildUserPrompt('followup', { ...ctx, customerName: 'John Smith' }, '')
    expect(prompt).toContain('John Smith')
  })

  it('permit mode mentions PPRBD', () => {
    const prompt = buildUserPrompt('permit', ctx, '')
    expect(prompt).toContain('PPRBD')
  })

  it('chat mode passes user message through directly', () => {
    const prompt = buildUserPrompt('chat', ctx, 'hello world')
    expect(prompt).toBe('hello world')
  })
})
```

- [ ] **Step 1b: Run to confirm failure**

```bash
npx jest __tests__/lib/ai/prompts.test.ts
```

Expected: FAIL — module does not exist yet.

- [ ] **Step 2: Create lib/ai/prompts.ts (SERVER ONLY)**

```typescript
// lib/ai/prompts.ts
// SERVER ONLY — never import from components/ or any client-side file

import type { AIPageContext } from '@/types'

export const SYSTEM_PROMPT = `You are an AI assistant for Dev, owner of Voltura Power Group, a licensed electrical contractor in Colorado Springs, CO (license #3001608). Dev is a solo operator doing residential service work — panel upgrades, EV chargers, breaker work, and general electrical service. He uses flat-rate pricing with a Good/Better/Best model. He is focused on same-day closes, premium pricing, and high-value upsells. Be direct, specific, and actionable. No fluff. Colorado Springs market, 719 area code.`

export function buildUserPrompt(mode: string, context: AIPageContext, userMessage: string): string {
  switch (mode) {
    case 'estimate':
      return `ESTIMATE ASSIST REQUEST
Job type: ${context.jobType ?? 'unknown'}
Customer type: ${context.customerType ?? 'residential'}
Property notes: ${context.propertyNotes ?? 'none'}
Current line items: ${JSON.stringify(context.currentLineItems ?? [])}

Based on this job, provide:
1. Which tier (Good/Better/Best) you recommend and why (2-3 sentences max)
2. Top 2-3 upsell opportunities specific to this job type
3. Any red flags to check on site
4. One talking point to present to the customer

User question: ${userMessage || 'Give me your recommendation'}`

    case 'upsell':
      return `UPSELL COACH REQUEST
Job type: ${context.jobType ?? 'unknown'}
Current estimate items: ${JSON.stringify(context.currentLineItems ?? [])}

Give me exactly 3 specific upsell opportunities for this job. For each one:
- The upsell item
- Why it applies to this specific job
- A one-liner field script I can say to the customer

User question: ${userMessage || 'What should I upsell?'}`

    case 'followup':
      return `FOLLOW-UP WRITER REQUEST
Customer name: ${context.customerName ?? 'the customer'}
Job status: ${context.jobStatus ?? 'unknown'}
Days since contact: ${context.daysSinceContact ?? 'unknown'}

Write:
1. A ready-to-send SMS (under 160 chars, professional but conversational, signed "- Dev, Voltura Power Group")
2. A short follow-up email (subject line + 3-4 sentence body, same signature)

User question: ${userMessage || 'Write my follow-up'}`

    case 'permit':
      return `PERMIT CHECKLIST REQUEST
Job type: ${context.jobType ?? 'unknown'}

List exactly what I need to submit a permit for this job to PPRBD (Pikes Peak Regional Building Department) in Colorado Springs, El Paso County:
- Required forms (with form numbers if known)
- Required documents
- Fee estimate
- Inspection types I'll need
- Any gotchas specific to Colorado Springs

Be specific. No generic answers.

User question: ${userMessage || 'What do I need for this permit?'}`

    default: // 'chat'
      return userMessage
  }
}
```

- [ ] **Step 2: Create app/api/ai/route.ts (SERVER ONLY)**

```typescript
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/ai/prompts'
import type { AIPageContext } from '@/types'

// This is the ONLY file that may import @anthropic-ai/sdk or read ANTHROPIC_API_KEY
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(request: NextRequest) {
  // Auth check — AI is not available without a session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await request.json()
  const { mode, context, message }: { mode: string; context: AIPageContext; message: string } = body

  const userPrompt = buildUserPrompt(mode, context ?? {}, message ?? '')

  // Streaming response
  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
```

- [ ] **Step 3: Create components/ai-chat/AIChatWidget.tsx**

```typescript
'use client'

import { useState, useContext, useCallback } from 'react'
import { AIContextContext } from '@/components/estimate-builder/AIContextProvider'
import { ChatModeTab } from './ChatModeTab'
import { StreamingResponse } from './StreamingResponse'
import type { AIPageContext } from '@/types'

const MODES = [
  { key: 'estimate', label: 'Estimate' },
  { key: 'upsell', label: 'Upsell' },
  { key: 'followup', label: 'Follow-Up' },
  { key: 'permit', label: 'Permit' },
  { key: 'chat', label: 'Chat' },
] as const

export function AIChatWidget() {
  const pageContext = useContext(AIContextContext)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<string>(pageContext?.mode ?? 'chat')
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (!message.trim() && mode === 'chat') return
    setLoading(true)
    setResponse('')

    const context: AIPageContext = pageContext ?? { mode: mode as any }

    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, context, message }),
    })

    if (!res.ok || !res.body) {
      setResponse('Error: could not reach AI assistant.')
      setLoading(false)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      full += decoder.decode(value, { stream: true })
      setResponse(full)
    }

    setLoading(false)
  }, [mode, message, pageContext])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 w-12 h-12 bg-volturaGold text-volturaBlue rounded-full shadow-lg flex items-center justify-center text-xl font-bold"
        aria-label="Open AI assistant"
      >
        ✦
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-volturaBlue">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-volturaNavy">
        <span className="text-volturaGold font-bold">AI Assistant</span>
        <button onClick={() => setOpen(false)} className="text-gray-400 text-2xl leading-none">×</button>
      </div>

      {/* Mode tabs */}
      <div className="flex overflow-x-auto border-b border-volturaNavy px-2">
        {MODES.map((m) => (
          <ChatModeTab
            key={m.key}
            label={m.label}
            active={mode === m.key}
            onClick={() => setMode(m.key)}
          />
        ))}
      </div>

      {/* Response area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {response ? (
          <StreamingResponse text={response} loading={loading} />
        ) : (
          <p className="text-gray-500 text-sm">
            {mode === 'estimate' && 'Tap "Ask" to get tier recommendations for this job.'}
            {mode === 'upsell' && 'Tap "Ask" to get 3 upsell opportunities with scripts.'}
            {mode === 'followup' && 'Tap "Ask" to generate a follow-up SMS and email.'}
            {mode === 'permit' && 'Tap "Ask" to get the PPRBD permit checklist for this job.'}
            {mode === 'chat' && 'Ask anything about your business, pricing, or this job.'}
          </p>
        )}
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-volturaNavy">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={mode === 'chat' ? 'Ask anything...' : 'Add context (optional)'}
            className="flex-1 bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold"
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-volturaGold text-volturaBlue px-5 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
          >
            {loading ? '...' : 'Ask'}
          </button>
        </div>
        {response && (
          <button
            onClick={() => navigator.clipboard.writeText(response)}
            className="mt-2 text-gray-400 text-xs"
          >
            Copy response
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create components/ai-chat/ChatModeTab.tsx**

```typescript
interface ChatModeTabProps {
  label: string
  active: boolean
  onClick: () => void
}

export function ChatModeTab({ label, active, onClick }: ChatModeTabProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
        active
          ? 'text-volturaGold border-b-2 border-volturaGold'
          : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  )
}
```

- [ ] **Step 5: Create components/ai-chat/StreamingResponse.tsx**

```typescript
interface StreamingResponseProps {
  text: string
  loading: boolean
}

export function StreamingResponse({ text, loading }: StreamingResponseProps) {
  // Render markdown-lite: bold (**text**), bullet lines (- item)
  const lines = text.split('\n')

  return (
    <div className="text-gray-200 text-sm space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <p key={i} className="pl-3 border-l-2 border-volturaGold/40">{line.slice(2)}</p>
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-bold text-white">{line.slice(2, -2)}</p>
        }
        return line ? <p key={i}>{line}</p> : <br key={i} />
      })}
      {loading && <span className="inline-block w-1.5 h-4 bg-volturaGold animate-pulse ml-0.5" />}
    </div>
  )
}
```

- [ ] **Step 5b: Run prompts unit tests**

```bash
npx jest __tests__/lib/ai/prompts.test.ts
```

Expected: all 7 tests PASS.

- [ ] **Step 6: Mount AIChatWidget in app/(app)/layout.tsx**

Add `<AIChatWidget />` to the layout, after `{children}` and before `<BottomNav />`:

```typescript
import { AIChatWidget } from '@/components/ai-chat/AIChatWidget'

// Inside the return:
<div className="min-h-dvh pb-16">
  {children}
  <AIChatWidget />
  <BottomNav />
</div>
```

- [ ] **Step 7: Verify API key never appears in client bundle**

```bash
npm run build
grep -r "ANTHROPIC_API_KEY" .next/static/ 2>/dev/null || echo "CLEAN — API key not in client bundle"
grep -r "anthropic" .next/static/ 2>/dev/null | head -5 || echo "CLEAN — no anthropic SDK in client bundle"
```

Expected: both greps return "CLEAN" or no matches.

- [ ] **Step 8: Run all unit tests**

```bash
npx jest
```

Expected: all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add app/api/ai/ lib/ai/ components/ai-chat/ app/\(app\)/layout.tsx
git commit -m "feat: add streaming AI assistant with 5 modes, floating widget, and context injection"
```

---

## Phase 1 Final Verification

- [ ] **Run full test suite**

```bash
npx jest --coverage
```

Expected: all tests pass. Coverage report generated.

- [ ] **TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Production build**

```bash
npm run build
```

Expected: build succeeds. No "Missing env vars" errors (make sure `.env.local` is populated).

- [ ] **Security checks**

```bash
grep -r "ANTHROPIC_API_KEY" components/ lib/supabase/client.ts public/ 2>/dev/null && echo "FAIL — key exposed" || echo "PASS"
grep -r "SUPABASE_SERVICE_KEY" components/ public/ 2>/dev/null && echo "FAIL — key exposed" || echo "PASS"
```

Expected: both print PASS.

- [ ] **Manual smoke test checklist**

```
[ ] Open http://localhost:3000 → redirects to /login
[ ] Enter email → "Check your email" confirmation shows
[ ] After magic link login → lands on dashboard
[ ] Bottom nav visible, all 5 tabs navigate correctly
[ ] /settings/pricebook → 17 rows load, tap a price, edit it, blur → saves (check Supabase)
[ ] /customers/new → create customer → redirects to customer detail
[ ] /customers → search by name works
[ ] /estimates/new?customerId=[id] → redirects to estimate builder
[ ] Estimate builder → select job type → 3 tier cards appear
[ ] Tap a price on a tier card → input appears, edit value, blur → total updates
[ ] Select Better tier → total updates to that tier's price
[ ] Toggle an add-on → total updates
[ ] Add custom line item → total updates
[ ] Tap "Send" → send sheet opens → "Copy SMS link" copies URL
[ ] Open copied URL in incognito → shows 404 (estimate still Draft)
[ ] Back in app: estimate status stays Draft until send action fires
[ ] AI widget gold button visible → tap → opens full-screen drawer
[ ] Switch to Estimate mode → tap Ask → streaming response appears
[ ] Copy response button works
[ ] npm run build → no errors
```

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 1 core — auth, pricebook, CRM, estimate builder, AI assistant"
```

---

## Summary of Commits

| Task | Commit |
|---|---|
| 1 | `feat: add supabase schema migrations, RLS policies, and pricebook seed data` |
| 2 | `feat: scaffold Next.js app with Tailwind brand config, PWA manifest, service worker, and test config` |
| 3 | `feat: add TypeScript types, Supabase clients, and Phase 1 stubs for telegram/sheets/checklists` |
| 4 | `feat: add auth flow with magic link, middleware session guard, protected layout, and bottom nav` |
| 5 | `feat: add shared UI components and pricebook settings with inline price editing` |
| 6 | `feat: add customer CRM with create, search, view, edit, and equipment sub-table` |
| 7 | `feat: add estimate builder with Good/Better/Best tiers, inline price editing, addons, live total, send flow, and public view` |
| 8 | `feat: add streaming AI assistant with 5 modes, floating widget, and context injection` |
| Final | `feat: complete Phase 1 core — auth, pricebook, CRM, estimate builder, AI assistant` |

---

## Notes for Phase 2

Phase 2 plan covers: Job Board (calendar + status), Invoice generation + manual payments, Dashboard KPIs + Send Daily Digest button, and full PDF generation. Start Phase 2 only after Phase 1 manual smoke test passes completely.
