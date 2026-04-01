@AGENTS.md

# VolturaOS — Project Context

## What this is
Field service app for an electrical contractor (Voltura Power Group). Mobile-first. Used on the job to build estimates, show them to customers, collect signatures, and track jobs.

## Stack
- Next.js 15 App Router, TypeScript, Tailwind CSS
- Supabase (Postgres + Storage) via admin client (`lib/supabase/admin.ts`)
- Auth is **disabled** — no middleware, no auth checks
- Deployed to Vercel; root directory = `volturaos`
- All server actions use `'use server'` + `createAdminClient()`
- `export const dynamic = 'force-dynamic'` on all list pages (prevents Vercel build-time DB calls)

## Key patterns
- Types: `types/index.ts` — single source of truth
- Server actions: `lib/actions/*.ts`
- Route groups: `app/(app)/` = internal app, `app/estimates/[id]/view/` = public customer-facing
- No middleware/proxy — deleted entirely
- AI route streams; extract JSON with `text.match(/\[[\s\S]*\]/)`

## Current phase
**Phase 3** — see plan at `docs/superpowers/plans/2026-03-31-volturaos-phase3-ux-features.md`
Features: line item descriptions, what's included badges, progress tracker, one-click invoice, site photos, estimate templates.

Phase 3 DB migrations must be run in Supabase before starting (see plan Pre-flight section).

## Phase 2 summary (done)
- Flat named estimates with `proposal_id` grouping (up to 3 per proposal)
- EstimateBuilder: name field, Duplicate button, Delete button, Present mode
- PresentMode: compare (swipeable) → scope (line items + addons) → sign (canvas)
- PublicCompareView: web-based proposal comparison
- SuggestedItems: AI upsell suggestions in builder
- Service Calls pricebook category (Out of Area Dispatch $85, Level 1–3 diagnostic)
- Delete on customers and estimates

## DB schema notes
- `estimates`: `name`, `proposal_id`, `line_items` (JSON), `addons` (JSON), `tier_selected` (null always now)
- `invoices`: `estimate_id` FK exists; `createInvoiceFromEstimate()` already implemented
- `job_photos` table: needs to be created (Phase 3 migration)
- No `job_notes` table — job notes are a single `notes` text field on the `jobs` table

## Telegram notifications
Sent on estimate send, view, approval, invoice creation, payment. Bot token in env.
