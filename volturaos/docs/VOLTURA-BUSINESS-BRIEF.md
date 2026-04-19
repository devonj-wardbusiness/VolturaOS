# Voltura Power Group — Business Brief for Cowork

**Last updated:** 2026-04-14

---

## Who Devon Is

**Devon Ward** — apprentice electrician (journeyman in progress) and business owner.
- Day job: apprentice electrician at R Buck Heating, Electrical and Plumbing (Devon.Ward@callbuck.com)
- Side business: **Voltura Power Group** — residential and commercial electrical contracting
- Building VolturaOS as both an internal tool and a future SaaS product
- Limited coding background — learns fast, prefers step-by-step guidance with exact values

---

## The Business

| Field | Value |
|-------|-------|
| Business name | Voltura Power Group |
| Website | volturapower.energy |
| License | #3001608 |
| Brand | Dark navy + gold (#f5c842) — "Voltura Gold" |
| Facebook page | Wards Elevated Electrical (transitioning to Voltura Power Group) |
| Primary market | Residential + light commercial electrical, Colorado |

### Services Offered
- Panel upgrades (100A → 200A, 200A → 400A)
- EV charger installation (Level 2, EVSE circuit)
- New circuits (kitchen, bath, garage, shop)
- Service calls + troubleshooting
- Permit prep and inspection coordination
- Electrical inspections / pre-purchase walkthrough

---

## Automation Stack

**n8n instance:** wards-electrical.app.n8n.cloud  
**Telegram bot:** @TimeLogWardsElecbot (chat ID: 7691231869) — Devon's primary notification channel  
**AI:** Claude API (claude-sonnet-4-20250514) — always use this model  
**Storage:** Google Sheets (until volume demands a database)

### Active n8n Workflows

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| Facebook — Lead Qualifier | FB Messenger webhook | Scores lead 1–10 via Claude, auto-replies, alerts Devon on Telegram, logs to Sheets |
| PermitBot | Telegram message | Claude AI Agent builds full permit package (panel upgrades, EV chargers, new circuits) |
| Lead Intake Engine | Book Now form webhook | Logs to Sheets + Telegram alert + follow-up sequence |
| Post-Job Follow-Up | Manual / scheduled | Pulls completed jobs → sends review request |
| Daily Schedule Brief | 7am MT daily | Queries Supabase for today's jobs → Claude summary → Telegram |
| Weekly Business Summary | Monday 8am MT | Revenue, jobs, customers, invoices → Claude → Telegram |

### Google Sheets
- **Lead log ID:** `1GjPdkhYkuD0GAPu_HDAh7YUSOAXUnkaKJzYplIX9nUw` — tab: "Facebook Leads"
- **Job log ID:** `1s92WhFevMy1oQsZD5rsscFFPRCEfSysAQcx8WZ3AMp8`
- **PermitBot tabs:** `PermitBotState`, `PermitLog`

### n8n Node Naming Conventions
- Workflow names: `[Platform] - [Function]` (e.g. `Facebook - Lead Qualifier`)
- Node labels: Action-first (e.g. `Score Lead with Claude`, `Alert Dev on Telegram`)
- Sheet columns: PascalCase (e.g. `LeadName`, `JobType`, `Score`, `Timestamp`)
- Webhook paths: kebab-case (e.g. `voltura-lead-intake`)

### Tech Preferences
- Alerts: **Telegram** always (over Twilio/email)
- Storage: **Google Sheets** always (until volume demands DB)
- AI: **Claude API** always (Anthropic)
- n8n JS: minimal — prefer native nodes

---

## VolturaOS App

Devon's custom-built field service app. Full brief at:
`docs/VOLTURAOS-COWORK-BRIEF.md`

Short version:
- Estimates with multi-tier proposals + customer signatures
- Jobs, customers, invoices, payments
- Long-press context menus on every card
- Public estimate link sent to customers (they view, compare, sign on their phone)
- Telegram notifications on all key events
- AI-powered estimate building

---

## Business Goals

### 60-Day Goal
Turn VolturaOS into a lead generation machine for Voltura Power Group:
- Referral capture on public estimate view
- Post-job SMS → Google/Yelp review prompt
- Follow-up sequence after completed jobs
- Target: 2+ new inbound leads/month from referrals

### 6-Month Goal
Launch VolturaOS as a SaaS for other contractors:
- Multi-tenant (company_id on all tables, Supabase RLS)
- Stripe billing: Free → Pro ($49/mo) → Team ($99/mo)
- Onboarding flow
- Target: 10 paying contractors = $490+ MRR

### 12-Month Goal
Lead marketplace:
- Homeowners request quotes through volturapower.energy
- Contractors on platform bid or get assigned
- VolturaOS takes a cut per booked job

---

## Naming Candidates (for SaaS rebrand)

Journeyman · Crewly · Ampflow · Tradeflow · Werkflow

Preference: broader trade name that works for electrical + HVAC + plumbing contractors

---

## Pre-Launch SaaS Checklist

- [ ] Multi-tenancy + real auth (company_id on all tables, login/signup)
- [ ] Stripe subscriptions ($49–$99/mo)
- [ ] Onboarding flow (signup → company name → first customer → first estimate)
- [ ] PWA manifest (installable on iPhone/Android)
- [ ] QuickBooks sync
- [ ] Email invoices/estimates with PDF
- [ ] Configurable company logo on estimate PDF

---

## Context for AI Assistants

When helping Devon with Voltura Power Group work:
- He's on job sites — guidance needs to be fast, practical, and mobile-friendly
- He knows electrical work deeply but learns software through doing
- Step-by-step with exact values (node names, field names, button labels) beats conceptual explanation
- Telegram is his notification channel — always format for Telegram Markdown
- Never display full API keys or tokens in responses — reference credential names only
- When suggesting n8n changes: give exact node type, operation, and field values
- When suggesting code: include the full file change, not just a diff description
