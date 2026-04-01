-- Phase 3: estimate badge fields, templates, and job photos
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS includes_permit boolean NOT NULL DEFAULT false;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS includes_cleanup boolean NOT NULL DEFAULT true;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS includes_warranty boolean NOT NULL DEFAULT true;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS source_estimate_id uuid REFERENCES estimates(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS job_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
