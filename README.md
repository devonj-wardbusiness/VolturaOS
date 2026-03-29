## Summary
- Flat named estimates replace Good/Better/Best tiers — name field + Duplicate button (up to 3 per proposal)
- PresentMode: solo shows scope review → sign; proposals show swipeable comparison columns
- AI Suggested Items panel with upsell recommendations
- Public proposal view with side-by-side compare + approve buttons
- Category grid/Primary Job selector derive categories dynamically from pricebook
- Delete buttons for estimates and customers
- Service Calls category for diagnostic/dispatch fees

## DB Migration Required (run in Supabase before deploying)
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'Estimate';
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS proposal_id uuid REFERENCES estimates(id) ON DELETE SET NULL;
