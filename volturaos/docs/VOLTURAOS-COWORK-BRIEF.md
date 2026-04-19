# VolturaOS — App Brief for Cowork

**Last updated:** 2026-04-14  
**Business brief:** `docs/VOLTURA-BUSINESS-BRIEF.md`  
**Lead-gen build prompt:** `docs/COWORK-LEADGEN-PROMPT.md`

---

## What It Is

Mobile-first field service app for electrical (and any trade) contractors. Devon Ward built it for his own business, Voltura Power Group. Goal: run the full job lifecycle from a phone — estimate, sign, invoice, collect.

**Stack:** Next.js 15 App Router · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Storage) · Vercel  
**Repo root:** `C:/Users/Devon/VolturaOS/volturaos/`  
**Auth:** Disabled — no middleware, no auth checks  
**Supabase:** Always via `createAdminClient()` from `lib/supabase/admin.ts`

---

## Live Features

### App Routes (`app/(app)/`)

| Route | What it does |
|-------|-------------|
| `/` | Dashboard — KPI cards: revenue MTD, outstanding balance, active jobs, overdue invoice count |
| `/estimates` | Proposal groups list. Each group = 1–3 tier estimates sharing a `proposal_id` |
| `/estimates/new` | Estimate builder — name, customer, line items, add-ons, AI suggestions |
| `/estimates/[id]` | Edit estimate, Present mode (customer-facing compare + sign flow) |
| `/invoices` | Invoice list with aging badges, overdue alert banner, filter by status |
| `/invoices/[id]` | Invoice detail — payment recording, status history |
| `/jobs` | Job list with status chips |
| `/jobs/[id]` | Job detail — status, crew SMS, notes, photos |
| `/customers` | Customer list |
| `/customers/[id]` | Customer detail — contact info, job/invoice history |
| `/search` | Cross-entity search (jobs, customers, estimates, invoices) |
| `/settings` | Business info + pricebook management |
| `/tools` | AI Tools — AI-powered estimate building from natural language |
| `/agreements` | Service agreements |
| `/terms` | Terms of service |

### Public Routes

| Route | What it does |
|-------|-------------|
| `/estimates/[id]/view` | Customer-facing proposal view — compare tiers, scope, sign. No auth required. |

---

## Long-Press Context Menus (all list cards)

500ms hold (mobile) or right-click (desktop) opens a slide-up action sheet:

| Card | Actions |
|------|---------|
| JobCard | Edit · Change Status (sub-sheet: Scheduled/In Progress/Completed/Invoiced/Cancelled) · Send Crew SMS · Delete |
| CustomerCard | Edit · Call (tel: link, only if phone exists) · Delete |
| InvoiceRow | Edit · Record Payment · Send Reminder · Delete |
| EstimateGroupCard | Edit · Duplicate · Delete |

Delete shows inline confirmation in the sheet: "Delete [name]? This cannot be undone."  
Change Status opens a second sheet with status options.

---

## Components & Hooks

### Key UI Components
```
components/ui/
├── ActionSheet.tsx          # Slide-up bottom sheet, inline delete confirmation, portal
├── ActionSheetProvider.tsx  # React context — openSheet(label, actions[])
├── PageHeader.tsx           # router.back() for all back buttons
├── StatusPill.tsx           # Colored status badge
├── EmptyState.tsx           # Zero-state with optional CTA
└── BottomNav.tsx            # Fixed bottom navigation

hooks/useLongPress.ts        # 500ms touch timer + contextmenu, onTouchCancel guard
```

### Feature Components
```
components/jobs/JobCard.tsx               # 'use client' — long-press, status
components/customers/CustomerCard.tsx     # 'use client' — long-press, call
components/invoices/InvoiceList.tsx       # 'use client' — filter tabs, aging, rows
components/estimates/EstimateGroupCard.tsx # 'use client' — grouped proposal card
components/estimate-builder/              # Full estimate builder (line items, add-ons, AI)
```

---

## Server Actions (`lib/actions/`)

| File | Key exports |
|------|-------------|
| `jobs.ts` | `listJobs`, `getJob`, `createJob`, `updateJob`, `updateJobStatus`, `deleteJob` |
| `invoices.ts` | `listInvoices`, `getInvoice`, `createInvoice`, `recordPayment`, `sendInvoiceReminder`, `deleteInvoice` |
| `estimates.ts` | `listEstimates`, `getEstimate`, `createEstimate`, `updateEstimate`, `duplicateEstimate`, `deleteEstimate`, `createInvoiceFromEstimate` |
| `customers.ts` | `listCustomers`, `getCustomer`, `createCustomer`, `updateCustomer`, `deleteCustomer` |
| `dashboard.ts` | `getDashboardKPIs` |
| `pricebook.ts` | `listPricebookItems`, `createPricebookItem`, `updatePricebookItem`, `deletePricebookItem` |
| `ai-tools.ts` | `generateEstimateFromDescription` |
| `job-photos.ts` | `uploadJobPhoto`, `listJobPhotos` |
| `search.ts` | `searchAll` |

---

## Supabase DB Schema (key tables)

```sql
customers       id, name, phone, email, address, created_at
jobs            id, customer_id, title, description, status, notes, created_at
                status: 'Lead' | 'Scheduled' | 'In Progress' | 'Completed' | 'Invoiced' | 'Paid' | 'Cancelled'
estimates       id, customer_id, proposal_id, name, status, line_items (JSON), addons (JSON),
                total, signature_data, created_at
                status: 'Draft' | 'Sent' | 'Viewed' | 'Approved'
invoices        id, customer_id, estimate_id, status, total, balance, due_date, created_at
                status: 'Unpaid' | 'Partial' | 'Paid'
invoice_payments id, invoice_id, amount, method, note, created_at
pricebook_items id, name, description, unit_price, category, created_at
job_photos      id, job_id, url, caption, created_at
```

---

## Architecture Rules — NEVER BREAK THESE

1. **`layout.tsx` stays `async` server component** — never add `'use client'` to it
   - `ActionSheetProvider` wraps `{children}` as the client boundary
2. **`export const dynamic = 'force-dynamic'`** on ALL list pages — prevents Vercel build-time DB calls
3. **Extract hooks to child components** — never add `'use client'` to a page file itself
   - Pattern: `estimates/page.tsx` (server) renders `<EstimateGroupCard>` (client)
4. **All DB access via `createAdminClient()`** — no client-side Supabase calls
5. **Tailwind CSS v4** — syntax differs from v3; check `node_modules/next/dist/docs/` before writing any CSS classes
6. **Types in `types/index.ts`** — single source of truth; extend there first
7. **Server actions must have `'use server'`** at top — always
8. **`router.back()`** for all back buttons — no hardcoded hrefs in PageHeader

---

## Notifications

Telegram bot: **@TimeLogWardsElecbot**, chat ID **7691231869**

Fires on:
- Estimate sent to customer
- Customer views estimate
- Customer approves / signs estimate
- Invoice created
- Payment recorded

Utility: `lib/telegram.ts` → `sendTelegramMessage(chatId, text)`  
SMS utility: `lib/twilio.ts` → `sendSMS(phone, body, isFromCustomer)`

---

## n8n Automation Workflows

Files at `docs/n8n-workflows/`:
- `daily-schedule-agent.json` — imports to n8n, runs 7am MT daily
- `weekly-business-summary.json` — imports to n8n, runs Monday 8am MT
- `SETUP.md` — import instructions, required env vars

Required n8n env vars: `SUPABASE_URL`, `SUPABASE_KEY`  
Required n8n credentials: Anthropic API, Telegram Bot

---

## Monetization Roadmap

### Phase 1 — Lead Gen for Voltura Power Group (NOW, 0–60 days)
Build into the existing app:
- **Referral widget** on public estimate view (`/estimates/[id]/view`) — "Know someone who needs electrical work?"
  - New `referrals` table: `id, estimate_id, name, phone, project_notes, created_at`
  - Telegram alert on submit
- **Post-job SMS** — 24h after job → "Completed" status: review request + referral ask
  - Gate with `review_requested_at` column on jobs to prevent duplicates
- **Invoice paid → review SMS** — one-time per invoice
  - Gate with `review_requested_at` column on invoices

### Phase 2 — SaaS for Contractors ($49–$99/month, 2–6 months)
- Add `tenant_id` to all tables + Supabase RLS
- `tenants` table: id, business_name, owner_email, plan, stripe_customer_id
- Stripe billing + webhook handler at `app/api/stripe/webhook/route.ts`
- Onboarding flow at `app/onboarding/`
- PWA manifest — installable from phone
- Marketing page at volturapower.energy

### Phase 3 — Lead Marketplace (6–12 months)
- Homeowners request quotes via volturapower.energy
- Contractor network bids or gets dispatched
- Revenue split per booked job

---

## Pending Features (Phase 3 UX Plan)

| Feature | Status | Notes |
|---------|--------|-------|
| Line item descriptions | Not built | Each estimate line needs a description paragraph |
| "What's included" badges | Not built | Tier comparison callouts |
| Progress tracker | Not built | Customer-facing job status URL |
| Estimate templates | Not built | Save/reuse pricebook bundles |
| Site photos | DB migration needed | `job_photos` table — Supabase migration not run yet |
| Recurring jobs | Not built | Annual maintenance, quarterly inspections |
| QuickBooks sync | Not built | High demand from accountants |
| Tech/crew assignment | Not built | Dispatch per person |
| GPS job map | Not built | Route planning for multi-job days |
| Email PDF delivery | Not built | SMS only right now |
| Reporting page | Not built | Revenue by month, close rate, avg job value |

---

## SaaS Naming Candidates

Journeyman · Crewly · Ampflow · Tradeflow · Werkflow  
(Broader trade names preferred — works for electrical + HVAC + plumbing)
