-- Add new fields to home_inspections for health score revamp
-- Run in Supabase SQL Editor
ALTER TABLE home_inspections
  ADD COLUMN IF NOT EXISTS panel_brand      text,
  ADD COLUMN IF NOT EXISTS service_size     integer,
  ADD COLUMN IF NOT EXISTS has_smoke        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS smoke_count      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_co           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_outdoor_gfci boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS room_flags       jsonb   NOT NULL DEFAULT '{}';
