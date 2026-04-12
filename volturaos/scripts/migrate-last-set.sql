-- Run this in Supabase SQL Editor before deploying the last feature set

-- 1. Permit tracking on jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS permit_number TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS permit_status TEXT DEFAULT 'Not Applied';

-- 2. Job time tracking (clock in / clock out)
CREATE TABLE IF NOT EXISTS job_time_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  clocked_in_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clocked_out_at  TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Electrical home inspections / health scores
CREATE TABLE IF NOT EXISTS home_inspections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id            UUID REFERENCES jobs(id) ON DELETE SET NULL,
  score             INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  panel_age         INTEGER,
  panel_condition   TEXT,      -- Good / Fair / Poor / Replace
  has_afci          BOOLEAN DEFAULT false,
  afci_rooms        INTEGER DEFAULT 0,
  has_gfci          BOOLEAN DEFAULT false,
  gfci_locations    INTEGER DEFAULT 0,
  has_surge         BOOLEAN DEFAULT false,
  grounding_ok      BOOLEAN DEFAULT false,
  wiring_type       TEXT,      -- Copper / Aluminum / Knob-and-Tube / Mixed
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Maintenance plans (recurring annual inspections)
CREATE TABLE IF NOT EXISTS maintenance_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  plan_name     TEXT NOT NULL DEFAULT 'Annual Electrical Inspection',
  price         NUMERIC(10,2) NOT NULL DEFAULT 149.00,
  start_date    DATE NOT NULL,
  next_due      DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'Active',  -- Active / Paused / Cancelled
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
