# VolturaOS Phase 3 — UX Features Design
**Date:** 2026-03-30
**Status:** Approved for implementation

---

## Overview

Six features across customer-facing and contractor workflow:

1. **Line item descriptions** — tap-to-expand in Present/public view only
2. **"What's included" badges** — permit, cleanup, warranty on estimate cards
3. **Progress tracker** — visual pipeline on public view + estimate detail
4. **One-click invoice** — convert approved estimate to invoice instantly
5. **Job notes & site photos** — attach notes and camera photos to jobs
6. **Estimate templates** — save/load reusable estimate starting points

---

## 1. Line Item Descriptions

### Goal
When showing an estimate to a customer, each line item can be tapped to reveal a plain-English explanation of what the work involves.

### Data
- `PricebookEntry` already has `description_good`, `description_better`, `description_best` in DB.
- `LineItem` (JSON stored in `estimates.line_items`) needs a `description?: string` field added.
- When a pricebook item is added to an estimate (in `CategorySheet.tsx`), copy the appropriate description into the line item at that point.
- For existing line items without a description, fall back gracefully (no expand affordance shown).

### UI — PresentMode (scope step)
- Each line item row shows a small `›` chevron on the right if a description exists.
- Tapping the row toggles an expanded panel below showing the description text in `text-gray-400 text-sm`.
- Only one item expanded at a time (collapse others on open).
- Addons do not have descriptions.

### UI — PublicCompareView + public solo view
- Same tap-to-expand behavior.
- Works on mobile (touch targets ≥ 44px).

### DB Migration
None required — `line_items` is already a JSON column. Description is stored inline.

### Files to change
- `types/index.ts` — add `description?: string` to `LineItem`
- `components/estimate-builder/CategorySheet.tsx` — copy description when adding item
- `components/estimates/PresentMode.tsx` — expandable rows in scope step
- `components/estimates/PublicCompareView.tsx` — expandable rows
- `app/estimates/[id]/view/page.tsx` — expandable rows in solo view

---

## 2. "What's Included" Badges

### Goal
Customers see at a glance what non-price items are part of the job: permit, site cleanup, 1-year warranty. Sets expectations and reduces "what does this include?" questions.

### Data
Add three boolean fields to the `estimates` table:
```sql
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS includes_permit boolean NOT NULL DEFAULT false;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS includes_cleanup boolean NOT NULL DEFAULT true;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS includes_warranty boolean NOT NULL DEFAULT true;
```

Auto-set `includes_permit = true` when any line item in the estimate comes from a pricebook entry where `includes_permit = true`.

### UI — EstimateBuilder
- Three toggle chips below the line items list: "Permit", "Site Cleanup", "1-Year Warranty"
- Active = gold background, inactive = navy/gray. Tappable to toggle.
- Permit chip auto-activates when a permit pricebook item is added; can be manually overridden.

### UI — PresentMode scope step + PublicCompareView + public solo view
- Row of badge chips above the total: e.g. `📋 Permit Included  🧹 Site Cleanup  🛡 1-Year Warranty`
- Only show active badges.

### Files to change
- DB migration (above)
- `lib/actions/estimates.ts` — include new fields in `saveEstimate`
- `types/index.ts` — add fields to `Estimate` type
- `app/(app)/estimates/[id]/page.tsx` — pass fields to EstimateBuilder
- `components/estimate-builder/EstimateBuilder.tsx` — badge toggles, auto-set permit
- `components/estimates/PresentMode.tsx` — badge display
- `components/estimates/PublicCompareView.tsx` — badge display
- `app/estimates/[id]/view/page.tsx` — badge display

---

## 3. Progress Tracker

### Goal
Show the customer (and contractor) where the job stands in the pipeline without any confusing status labels.

### Pipeline steps
```
Estimate Created → Sent to Customer → Customer Viewed → Approved → Job Scheduled → Job Complete
```

### Derivation from existing data
| Step | Condition |
|------|-----------|
| Estimate Created | always true |
| Sent to Customer | `estimate.sent_at != null` |
| Customer Viewed | `estimate.viewed_at != null` |
| Approved | `estimate.status === 'Approved'` |
| Job Scheduled | a Job record exists linked to this estimate's customer with status not 'Complete' |
| Job Complete | linked Job status === 'Complete' |

Note: Job-to-estimate linking is currently indirect (via `customer_id`). For Phase 3, use the most recent job for that customer as a proxy. A direct `estimate_id` FK on jobs can be a future improvement.

### UI — Public estimate view (`/estimates/[id]/view`)
- Horizontal stepper at the top of the page.
- Completed steps: gold filled circle + gold line. Current step: gold circle, white text. Future: gray.
- On mobile: abbreviate step labels or show only current step label beneath the dots.

### UI — Estimate detail page (`/app/(app)/estimates/[id]`)
- Same stepper, smaller, shown below the estimate name/status badge.

### Files to change
- `components/estimates/ProgressTracker.tsx` — new shared component
- `app/estimates/[id]/view/page.tsx` — render tracker at top
- `app/(app)/estimates/[id]/page.tsx` — pass data, render tracker

---

## 4. One-Click Invoice from Approved Estimate

### Goal
When an estimate is approved, the contractor shouldn't have to rebuild the invoice. One button creates a draft invoice pre-populated with all line items, addons, and the total.

### Behavior
- Button: "Create Invoice" appears on the estimate detail page when `status === 'Approved'` and no invoice already exists for this estimate.
- Clicking calls a server action `createInvoiceFromEstimate(estimateId)`.
- Action creates an invoice record with:
  - `customer_id` from estimate
  - `job_id` from estimate (if set)
  - `line_items` copied from estimate
  - `subtotal`, `total` copied from estimate
  - `status: 'Draft'`
  - `source_estimate_id: estimateId` (new FK column)
- Redirects to `/invoices/[newId]` for review and sending.
- If invoice already exists (`source_estimate_id` matches), button becomes "View Invoice" linking to it.

### DB Migration
```sql
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS source_estimate_id uuid REFERENCES estimates(id) ON DELETE SET NULL;
```

### Files to change
- DB migration (above)
- `lib/actions/invoices.ts` — add `createInvoiceFromEstimate(estimateId)`
- `types/index.ts` — add `source_estimate_id` to Invoice type
- `app/(app)/estimates/[id]/page.tsx` — query for existing linked invoice, pass to builder
- `components/estimate-builder/EstimateBuilder.tsx` — "Create Invoice" / "View Invoice" button

---

## 5. Job Notes & Site Photos

### Goal
On-site, the contractor can add typed notes and take/upload photos directly from their phone, attached to a job record.

### Data
New table:
```sql
CREATE TABLE IF NOT EXISTS job_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Photos stored in a Supabase Storage bucket named `job-photos`. Storage path format: `{job_id}/{uuid}.jpg`.

### UI — Job detail page
**Notes section:**
- Textarea + "Add Note" button. Notes appear as a reverse-chronological list with timestamp.
- Each note has a delete button (trash icon, no confirmation needed — notes are low-stakes).

**Photos section:**
- Grid of photo thumbnails (3 per row on mobile).
- "Add Photo" button opens file picker with `accept="image/*" capture="environment"` so phone camera opens directly.
- Tap thumbnail to view full-size (simple lightbox: fixed overlay, close on tap).
- Delete photo: long-press or trash icon on thumbnail.

### Server actions
- `addJobNote(jobId, body)` — insert note
- `deleteJobNote(noteId)` — delete note
- `uploadJobPhoto(jobId, file)` — upload to Supabase Storage, insert record
- `deleteJobPhoto(photoId, storagePath)` — delete from storage + DB
- `getJobNotes(jobId)` — fetch notes
- `getJobPhotos(jobId)` — fetch photos with signed URLs

### Files to change
- DB migration (above)
- Supabase Storage bucket: `job-photos` (public or signed URLs — use signed for privacy)
- `lib/actions/job-notes.ts` — new file with all note/photo actions
- `app/(app)/jobs/[id]/page.tsx` — fetch and pass notes/photos
- `components/jobs/JobNotes.tsx` — new component
- `components/jobs/JobPhotos.tsx` — new component
- `components/jobs/JobDetail.tsx` — add both sections

---

## 6. Estimate Templates

### Goal
Save a complete estimate (name + line items + addons + badges) as a reusable template. When creating a new estimate, optionally start from a template instead of building from scratch.

### Data
Add a `is_template` boolean to the estimates table:
```sql
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false;
```

Templates are just estimates with `is_template = true`, no `customer_id`, no `job_id`, status always `'Draft'`. This avoids a separate table.

### UI — EstimateBuilder
- "Save as Template" button in the builder header (icon: bookmark).
- Prompts for a template name via a small inline input or modal.
- Calls `saveAsTemplate(estimateId, templateName)` — creates a new estimate row with `is_template = true` copying name + line_items + addons + badge fields. Does NOT copy customer/job/status.

### UI — New Estimate flow
- When navigating to `/estimates/new`, show a "Start from template" section above the empty builder.
- Loads existing templates as selectable cards (name + item count + total).
- Selecting a template pre-populates the builder with its line items/addons/badges.
- If no templates exist, section is hidden.

### Server actions
- `saveAsTemplate(estimateId, name)` — create template copy
- `getTemplates()` — fetch all `is_template = true` estimates
- `deleteTemplate(id)` — delete template
- `createEstimateFromTemplate(templateId, customerId?, jobId?)` — create draft estimate copying template data

### UI — Settings
- Add a "Templates" section under Settings (or under pricebook).
- Lists templates with name, item count, last-used date.
- Delete button per template.

### Files to change
- DB migration (above)
- `lib/actions/estimates.ts` — add template actions
- `app/(app)/estimates/new/page.tsx` — template picker section
- `components/estimate-builder/EstimateBuilder.tsx` — "Save as Template" button
- `app/(app)/settings/templates/page.tsx` — new settings page
- `app/(app)/settings/layout.tsx` or nav — add Templates link

---

## DB Migrations Summary

Run these in Supabase SQL Editor in order:

```sql
-- Phase 2 (if not already run)
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'Estimate';
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS proposal_id uuid REFERENCES estimates(id) ON DELETE SET NULL;

-- Phase 3
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS includes_permit boolean NOT NULL DEFAULT false;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS includes_cleanup boolean NOT NULL DEFAULT true;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS includes_warranty boolean NOT NULL DEFAULT true;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS source_estimate_id uuid REFERENCES estimates(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS job_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Also create a Supabase Storage bucket named `job-photos`.

---

## Build Order

Recommended implementation order (least to most DB-dependent):

1. Line item descriptions (no migration needed)
2. What's included badges (3 columns + UI)
3. Progress tracker (read-only, no new DB)
4. One-click invoice (1 column + action)
5. Job notes & photos (2 new tables + storage)
6. Estimate templates (1 column + actions + new page)
