# n8n Workflow Setup — Voltura Power Group

These two workflows automate daily scheduling briefs and weekly business summaries, delivered via Telegram.

## Workflows

| File | Name | Schedule |
|------|------|----------|
| `daily-schedule-agent.json` | Voltura - Daily Schedule Brief | Every day at 7:00 AM MT |
| `weekly-business-summary.json` | Voltura - Weekly Business Summary | Every Monday at 8:00 AM MT |

---

## Import Instructions

1. Log in to your n8n instance: **wards-electrical.app.n8n.cloud**
2. In the left sidebar, click **Workflows**
3. Click **+ Add Workflow** → **Import from file**
4. Select `daily-schedule-agent.json` — click **Import**
5. Repeat for `weekly-business-summary.json`

---

## Required Credentials

Set these up in n8n under **Settings → Credentials** before activating workflows.

### 1. Anthropic API

- Credential type: **Anthropic**
- Credential name (must match): `Anthropic account`
- API Key: your Anthropic API key (from `.env.local` → `ANTHROPIC_API_KEY`)

### 2. Telegram

- Credential type: **Telegram**
- Credential name (must match): `Telegram account`
- Bot Token: your Telegram bot token (from `.env.local` → `TELEGRAM_BOT_TOKEN`)
  - If blank, create a bot via [@BotFather](https://t.me/BotFather) on Telegram, then start a chat and send `/start` to get your chat ID confirmed
  - Chat ID is pre-set to `7691231869` in both workflows

---

## Required Environment Variables

Set these in n8n under **Settings → Variables** (or via your n8n instance environment):

| Variable | Value | Notes |
|----------|-------|-------|
| `SUPABASE_URL` | `https://hljjblwgpryrafvcukur.supabase.co` | Your Supabase project URL |
| `SUPABASE_KEY` | *(your service role key)* | From `.env.local` → `SUPABASE_SERVICE_KEY`. Use the service role key so the queries bypass RLS. |

To set variables in n8n Cloud:
1. Go to **Settings → Variables**
2. Click **+ Add Variable**
3. Name: `SUPABASE_URL`, Value: `https://hljjblwgpryrafvcukur.supabase.co`
4. Repeat for `SUPABASE_KEY`

---

## Activating Workflows

After credentials and variables are set:

1. Open each workflow
2. Click the **Active** toggle in the top-right corner
3. n8n will now run them on schedule automatically

You can also trigger either workflow manually at any time using the **Test workflow** button (the play icon).

---

## Troubleshooting

**Telegram message not sending**
- Confirm the bot token is correct and the bot has been started in the chat
- The bot must be added to the chat and have sent at least one message first

**Supabase returning 401**
- Make sure `SUPABASE_KEY` is the **service role key**, not the anon key
- The `Authorization` header must be `Bearer <key>` — check the HTTP Request node headers

**Claude node not running**
- Confirm the `Anthropic account` credential name matches exactly (case-sensitive)
- The model `claude-sonnet-4-20250514` must be available on your Anthropic plan

**No jobs returned for daily brief**
- Verify `scheduled_date` column exists on the `jobs` table in Supabase
- The query filters `status=not.in.(Cancelled,Completed,Paid)` — check your status values match

---

## Workflow Architecture Notes

### Daily Schedule Brief
```
Schedule Trigger (7 AM MT daily)
  → Get Today's Jobs (Supabase HTTP)
  → Format Brief with Claude (AI Agent + claude-sonnet-4-20250514)
  → Send to Telegram
```

### Weekly Business Summary
```
Schedule Trigger (8 AM MT Mondays)
  → [parallel] Get This Month Revenue
  → [parallel] Get Outstanding Invoices
  → [parallel] Get Active Jobs
  → [parallel] Get Pending Estimates
  → Merge All Data
  → Build Summary with Claude (AI Agent + claude-sonnet-4-20250514)
  → Send to Telegram
```

The weekly workflow fans out to 4 parallel Supabase queries, merges the results, then passes all data to Claude in a single prompt for a cohesive summary.
