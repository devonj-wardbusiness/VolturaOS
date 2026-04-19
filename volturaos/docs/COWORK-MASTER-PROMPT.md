# VolturaOS + Voltura Power Group — Master Cowork Prompt

Paste the block below into any new Cowork session to load full context for both the app and the business.

---

```
Read these three files in order, then confirm you're ready:

1. C:/Users/Devon/VolturaOS/volturaos/docs/VOLTURA-BUSINESS-BRIEF.md
2. C:/Users/Devon/VolturaOS/volturaos/docs/VOLTURAOS-COWORK-BRIEF.md
3. C:/Users/Devon/VolturaOS/volturaos/docs/COWORK-LEADGEN-PROMPT.md

Context summary (so you can start faster):

Devon Ward is an apprentice electrician and business owner building VolturaOS — a 
mobile-first field service app for his electrical contracting business, Voltura Power 
Group (license #3001608, volturapower.energy). The app is built with Next.js 15 App 
Router, TypeScript, Tailwind CSS v4, Supabase, and deployed to Vercel.

Repo: C:/Users/Devon/VolturaOS/volturaos/

What's already built (as of 2026-04-14):
- Full job lifecycle: estimates (multi-tier, signatures, public view) → invoices → payments
- Long-press / right-click context menus on every list card
- Dashboard KPIs, customer management, job tracking, AI estimate tools
- Telegram notifications on all key events
- n8n automations: daily schedule brief (7am) + weekly business summary (Monday 8am)
- PermitBot via Telegram, Facebook Lead Qualifier, Lead Intake Engine

Current priority: Build lead generation features into the app, then productize as SaaS.

After reading the files, pick up where we left off:
- If this is a fresh session: suggest the highest-priority unbuilt item from the lead-gen roadmap
- If Devon says what he wants: do it, following the architecture rules in VOLTURAOS-COWORK-BRIEF.md
- Never add 'use client' to page files — extract to child components
- Always use export const dynamic = 'force-dynamic' on list pages
- All DB calls via createAdminClient() — no client-side Supabase
```

---

## Quick-Start Variants

### Just build the app
```
Read C:/Users/Devon/VolturaOS/volturaos/docs/VOLTURAOS-COWORK-BRIEF.md and continue building VolturaOS. Priority: lead generation features first (referral widget on public estimate view, post-job SMS, invoice-paid review prompt), then SaaS readiness (multi-tenant, Stripe, onboarding).
```

### Just automations / n8n
```
Read C:/Users/Devon/VolturaOS/volturaos/docs/VOLTURA-BUSINESS-BRIEF.md — I need help with Voltura Power Group's n8n automations at wards-electrical.app.n8n.cloud. Telegram bot: @TimeLogWardsElecbot (7691231869). Claude model: claude-sonnet-4-20250514. Give exact node types and field values.
```

### Just trade / field questions
```
I'm Devon Ward, apprentice electrician at R Buck Heating, Electrical and Plumbing (Devon.Ward@callbuck.com) and owner of Voltura Power Group (license #3001608). Help me with electrical/HVAC/plumbing field questions, NEC codes, and permit prep. I also have a R Buck Field Assist plugin installed — use /field-assist for code lookups.
```

### Monetization planning
```
Read C:/Users/Devon/VolturaOS/volturaos/docs/VOLTURA-BUSINESS-BRIEF.md and C:/Users/Devon/VolturaOS/volturaos/docs/VOLTURAOS-COWORK-BRIEF.md — I want to plan how to turn VolturaOS into a revenue-generating product. Walk me through the fastest path to $500 MRR.
```
