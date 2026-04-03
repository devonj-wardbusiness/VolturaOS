# Session Handoff — 2026-04-02

## Done Today (2026-04-02 / 2026-04-03)
- **Fixed "+ New" estimate flow** — no longer redirects to customers page; now shows inline customer picker (`NewEstimateFlow.tsx`)
- **Added Discounts section** to EstimateBuilder — Military/Senior 5%, Cash 6%, custom % or $ amount (`DiscountsSection.tsx`)
  - Discounts are stored as negative-price custom line items, so they subtract from the total automatically
- **UI Redesign spec** reviewed and approved (from last session) — ready to execute
- **Phase 4 COMPLETE** — all 8 tasks shipped + 10 code review issues fixed (see below)

### Phase 4 — What was built
1. `lib/sms.ts` — Twilio SMS helper (no-ops gracefully without credentials)
2. `app/api/sms/webhook/route.ts` — STOP/UNSTOP opt-out webhook with HMAC-SHA1 Twilio signature validation
3. Dispatch SMS when job → "In Progress" (`lib/actions/jobs.ts`)
4. Estimate follow-up: days input per estimate, 🔔 badge on list, dismiss banner (`EstimateBuilder`, `estimates/page.tsx`)
5. Daily follow-up cron: `app/api/cron/follow-ups/route.ts` — sends Telegram + SMS per overdue sent estimate
6. `lib/actions/agreements.ts` — createAgreement, cancelAgreement, getActiveAgreement, listAgreements
7. Maintenance agreement UI on customer detail — Add Plan button, active plan with benefits + cancel
8. `/agreements` page with All/Active/Expiring/Expired/Cancelled filter tabs
9. Dashboard quick link → 🛡 Agreements
10. Daily renewal cron: sends 30-day reminder, auto-expires overdue agreements
11. `vercel.json` — both crons scheduled `0 14 * * *` (2 PM UTC)

### Phase 4 — Still needs before SMS works
- Add Twilio credentials to `.env.local` and Vercel env vars (see below)
- Run the DB migrations SQL in Supabase if not already done


## Where We Left Off

Two tracks are ready to execute. UI Redesign is fully spec'd and reviewed. Phase 4 is plan-ready but needs Twilio env vars first.

---

## Track A: UI Professional Redesign ← START HERE

**Status:** Spec written, spec reviewer APPROVED, committed. Next step: write implementation plan then execute.

**Spec file:** `docs/superpowers/specs/2026-04-01-volturaos-ui-redesign-design.md`

**What gets built:**
- `globals.css` color update: volturaBlue → `#0D0F1A`, volturaNavy → `#161B2E`, volturaGold → `#D4AF37`
- Install `lucide-react`
- New `components/ui/PageHeader.tsx` (fixed sticky header with optional back button + action slot)
- Redesign `BottomNav.tsx` — Lucide SVG icons (Zap/Wrench/Users/FileText/DollarSign), gold pill active indicator
- New `lib/statusColor.ts` — shared status → Tailwind color helper
- Update all list + detail pages with new header, card borders, rounded-2xl, status pills

**To start next session, say:**
> "Execute the UI redesign plan" — invoke writing-plans skill on the UI redesign spec, then run subagents

---

## Track B: Phase 4 — ServiceTitan Features (Blocked on Twilio)

**Status:** Spec + plan written and reviewed. Blocked until you add Twilio credentials.

**Plan file:** `docs/superpowers/plans/2026-04-01-phase4-servicetitan-features.md`

**What gets built:**
1. Twilio SMS helper + opt-out webhook
2. Dispatch SMS when job → "In Progress"
3. Estimate follow-up automation (cron + badge + dismiss)
4. Maintenance agreements (DB table, actions, UI)
5. Agreements list page + dashboard nav link
6. Renewal cron

**Before executing Track B you must:**

1. **Run this SQL in Supabase** (Dashboard → SQL Editor):
```sql
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_opt_out boolean NOT NULL DEFAULT false;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS follow_up_days integer NOT NULL DEFAULT 3;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS follow_up_sent_at timestamptz DEFAULT NULL;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS follow_up_dismissed boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS maintenance_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  price numeric NOT NULL DEFAULT 199,
  status text NOT NULL DEFAULT 'Active',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  renewal_date date NOT NULL,
  renewal_reminder_sent boolean NOT NULL DEFAULT false,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

2. **Add to `.env.local`** (file is at `volturaos/.env.local`):
```
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_NUMBER=+1xxxxxxxxxx
VOLTURA_PHONE=+1xxxxxxxxxx
```

3. **Add same vars to Vercel** (project settings → Environment Variables)

**To start Track B, say:**
> "Execute Phase 4"

---

## Codebase Quick Facts

- Stack: Next.js 15 App Router, TypeScript, Tailwind CSS v4, Supabase
- Deployed to Vercel; root directory = `volturaos`
- All pages: `export const dynamic = 'force-dynamic'`
- Colors in `volturaos/app/globals.css` `@theme inline` block (NOT tailwind.config.ts — v4)
- Server actions in `lib/actions/*.ts`, types in `types/index.ts`
- Subagent workflow: one fresh subagent per task, spec-review + code-quality-review after each

## Git Status
- Branch: `master`
- All work committed and clean
