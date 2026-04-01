# VolturaOS Phase 3 — UX Features Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add six UX features: line item descriptions, "what's included" badges, progress tracker, one-click invoice button, site photos, and estimate templates.

**Architecture:** Each feature is self-contained. Features 1–3 are pure UI (no new DB columns). Feature 4 (invoice) is UI-only — `createInvoiceFromEstimate` already exists in `lib/actions/invoices.ts`. Feature 5 (photos) needs a new DB table + Supabase Storage bucket. Feature 6 (templates) needs one new DB column.

**Tech Stack:** Next.js 15 App Router, Supabase (postgres + storage), TypeScript, Tailwind CSS, `'use client'` / `'use server'` split. All server actions in `lib/actions/`. Types centralized in `types/index.ts`.

---

## Pre-flight: DB migrations

Run in Supabase SQL Editor before starting:

```sql
-- Phase 2 (idempotent, run if not done)
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'Estimate';
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS proposal_id uuid REFERENCES estimates(id) ON DELETE SET NULL;

-- Phase 3
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS includes_permit boolean NOT NULL DEFAULT false;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS includes_cleanup boolean NOT NULL DEFAULT true;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS includes_warranty boolean NOT NULL DEFAULT true;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS job_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
```

Also in Supabase → Storage: create bucket named `job-photos`, set to **private**.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `types/index.ts` | Modify | Add `description?` to `LineItem`; add badge fields + `is_template` to `Estimate`; add `JobPhoto` storage variant |
| `components/estimate-builder/CategorySheet.tsx` | Modify | Copy `description_good` into line item on add |
| `components/estimates/PresentMode.tsx` | Modify | Expandable description rows + badge chips |
| `components/estimates/PublicCompareView.tsx` | Modify | Expandable description rows + badge chips |
| `app/estimates/[id]/view/page.tsx` | Modify | Expandable rows + badges + progress tracker |
| `components/estimates/ProgressTracker.tsx` | Create | Shared horizontal stepper component |
| `components/estimate-builder/EstimateBuilder.tsx` | Modify | Badge toggles + "Create Invoice" button + "Save as Template" button |
| `lib/actions/estimates.ts` | Modify | Include badge fields in save; add `saveAsTemplate`, `getTemplates`, `createEstimateFromTemplate`, `deleteTemplate` |
| `app/(app)/estimates/[id]/page.tsx` | Modify | Fetch + pass badge fields, linked invoice, templates list |
| `app/(app)/estimates/new/page.tsx` | Modify | Show template picker before creating blank estimate |
| `app/(app)/settings/templates/page.tsx` | Create | List + delete templates |
| `lib/actions/job-photos.ts` | Create | `uploadJobPhoto`, `deleteJobPhoto`, `getJobPhotos` |
| `components/jobs/JobPhotos.tsx` | Create | Photo grid + camera upload + lightbox |
| `components/jobs/JobDetail.tsx` | Modify | Add `<JobPhotos>` section |
| `app/(app)/jobs/[id]/page.tsx` | Modify | Fetch photos, pass to JobDetail |

---

## Task 1: Line Item Descriptions

**Files:**
- Modify: `volturaos/types/index.ts`
- Modify: `volturaos/components/estimate-builder/CategorySheet.tsx`
- Modify: `volturaos/components/estimates/PresentMode.tsx`
- Modify: `volturaos/components/estimates/PublicCompareView.tsx`
- Modify: `volturaos/app/estimates/[id]/view/page.tsx`

- [ ] **Step 1: Add `description` to `LineItem` type**

In `types/index.ts`, update `LineItem`:
```typescript
export interface LineItem {
  description: string
  price: number
  is_override: boolean
  original_price: number | null
  pricebook_description?: string  // plain-English explanation for customer
  tier?: TierName
  category?: string
  footage?: number | null
  is_primary?: boolean
}
```

- [ ] **Step 2: Copy description when adding from pricebook**

In `CategorySheet.tsx`, find the `onAddItem(entry)` call. Pass `pricebook_description` from the entry's `description_good` field (use `description_good` as the default since we no longer differentiate tiers):

```typescript
// In the onClick handler that calls onAddItem:
onAddItem({
  ...entry,
  // caller receives PricebookEntry; EstimateBuilder converts to LineItem
})
```

The actual LineItem construction is in `EstimateBuilder.tsx` in the `handleAddItem` function. Find where it builds the `LineItem` object and add:

```typescript
pricebook_description: entry.description_good ?? entry.description_better ?? entry.description_best ?? undefined,
```

- [ ] **Step 3: Create expandable row component (inline helper)**

In `PresentMode.tsx`, add a local `ExpandableLineItem` component above the main export:

```typescript
function ExpandableLineItem({ item }: { item: LineItem }) {
  const [open, setOpen] = useState(false)
  const hasDesc = !!item.pricebook_description
  return (
    <div>
      <button
        className="w-full flex items-center justify-between py-2 text-left"
        onClick={() => hasDesc && setOpen(o => !o)}
      >
        <span className="text-white/80 text-sm">
          {item.description}{item.footage ? ` (${item.footage}ft)` : ''}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="text-volturaGold text-sm">${item.price.toLocaleString()}</span>
          {hasDesc && (
            <span className={`text-gray-500 text-xs transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
          )}
        </span>
      </button>
      {open && item.pricebook_description && (
        <p className="text-gray-400 text-xs pb-2 pr-6 leading-relaxed">{item.pricebook_description}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Use `ExpandableLineItem` in PresentMode scope step**

Find the scope step's line items render (currently maps `allLineItems` into rows). Replace with `<ExpandableLineItem key={i} item={item} />`.

- [ ] **Step 5: Use `ExpandableLineItem` in PresentMode compare step**

In the compare step (proposal cards), same replacement for line item rows.

- [ ] **Step 6: Apply to PublicCompareView**

Copy the same `ExpandableLineItem` function into `PublicCompareView.tsx` (or extract to `components/estimates/ExpandableLineItem.tsx` and import in both). Use it for all line item rows.

- [ ] **Step 7: Apply to public solo view**

In `app/estimates/[id]/view/page.tsx`, the solo view maps `estimates[0].line_items`. Wrap in a client component or inline the expansion logic. Since the page is a server component, extract the line items list into a small `'use client'` component `components/estimates/LineItemsList.tsx` that accepts `items: LineItem[]` and renders expandable rows.

- [ ] **Step 8: Commit**
```bash
git add volturaos/types/index.ts volturaos/components/estimate-builder/EstimateBuilder.tsx volturaos/components/estimate-builder/CategorySheet.tsx volturaos/components/estimates/PresentMode.tsx volturaos/components/estimates/PublicCompareView.tsx volturaos/app/estimates/[id]/view/page.tsx
git commit -m "feat: add tap-to-expand descriptions on line items in present/public view"
```

---

## Task 2: "What's Included" Badges

**Files:**
- Modify: `volturaos/types/index.ts`
- Modify: `volturaos/lib/actions/estimates.ts`
- Modify: `volturaos/components/estimate-builder/EstimateBuilder.tsx`
- Modify: `volturaos/app/(app)/estimates/[id]/page.tsx`
- Modify: `volturaos/components/estimates/PresentMode.tsx`
- Modify: `volturaos/components/estimates/PublicCompareView.tsx`
- Modify: `volturaos/app/estimates/[id]/view/page.tsx`

- [ ] **Step 1: Add badge fields to `Estimate` type**

```typescript
export interface Estimate {
  // ... existing fields ...
  includes_permit: boolean
  includes_cleanup: boolean
  includes_warranty: boolean
}
```

- [ ] **Step 2: Update `saveEstimate` to write badge fields**

In `lib/actions/estimates.ts`, the `saveEstimate` function builds an update object. Add:
```typescript
includes_permit: input.includesPermit ?? false,
includes_cleanup: input.includesCleanup ?? true,
includes_warranty: input.includesWarranty ?? true,
```
Update the input type accordingly.

- [ ] **Step 3: Badge toggles in EstimateBuilder**

Add three state vars:
```typescript
const [includesPermit, setIncludesPermit] = useState(initialEstimate?.includes_permit ?? false)
const [includesCleanup, setIncludesCleanup] = useState(initialEstimate?.includes_cleanup ?? true)
const [includesWarranty, setIncludesWarranty] = useState(initialEstimate?.includes_warranty ?? true)
```

Auto-set permit when a line item with `category === 'Service Calls'` or any item description containing 'permit' is added (optional enhancement — for now, manual toggle is fine).

Add badge toggle UI below the line items list (before addons):
```tsx
<div className="flex gap-2 flex-wrap mt-3">
  {[
    { key: 'permit', label: '📋 Permit', value: includesPermit, set: setIncludesPermit },
    { key: 'cleanup', label: '🧹 Cleanup', value: includesCleanup, set: setIncludesCleanup },
    { key: 'warranty', label: '🛡 Warranty', value: includesWarranty, set: setIncludesWarranty },
  ].map(({ key, label, value, set }) => (
    <button
      key={key}
      onClick={() => set(v => !v)}
      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
        value
          ? 'bg-volturaGold text-volturaBlue border-volturaGold'
          : 'bg-transparent text-gray-500 border-gray-600'
      }`}
    >
      {label}
    </button>
  ))}
</div>
```

Pass these to `saveEstimate` in the save handler.

- [ ] **Step 4: Create `BadgeRow` shared component**

Create `volturaos/components/estimates/BadgeRow.tsx`:
```typescript
'use client'
interface BadgeRowProps {
  includesPermit: boolean
  includesCleanup: boolean
  includesWarranty: boolean
}
export function BadgeRow({ includesPermit, includesCleanup, includesWarranty }: BadgeRowProps) {
  const badges = [
    includesPermit && '📋 Permit Included',
    includesCleanup && '🧹 Site Cleanup',
    includesWarranty && '🛡 1-Year Warranty',
  ].filter(Boolean) as string[]
  if (!badges.length) return null
  return (
    <div className="flex gap-2 flex-wrap mb-3">
      {badges.map(b => (
        <span key={b} className="bg-volturaNavy/80 text-volturaGold text-xs px-2 py-1 rounded-full border border-volturaGold/30">
          {b}
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Add `<BadgeRow>` to PresentMode scope step, PublicCompareView cards, and public solo view**

Place it above the line items list in each view.

- [ ] **Step 6: Pass badge fields from page to components**

In `app/(app)/estimates/[id]/page.tsx`, the estimate fetched from DB now includes badge fields. Pass them down to `EstimateBuilder`.

- [ ] **Step 7: Commit**
```bash
git add volturaos/types/index.ts volturaos/lib/actions/estimates.ts volturaos/components/estimates/BadgeRow.tsx volturaos/components/estimate-builder/EstimateBuilder.tsx volturaos/app/(app)/estimates/[id]/page.tsx volturaos/components/estimates/PresentMode.tsx volturaos/components/estimates/PublicCompareView.tsx volturaos/app/estimates/[id]/view/page.tsx
git commit -m "feat: add what's included badge toggles on estimates"
```

---

## Task 3: Progress Tracker

**Files:**
- Create: `volturaos/components/estimates/ProgressTracker.tsx`
- Modify: `volturaos/app/estimates/[id]/view/page.tsx`
- Modify: `volturaos/app/(app)/estimates/[id]/page.tsx`

- [ ] **Step 1: Create `ProgressTracker` component**

Create `volturaos/components/estimates/ProgressTracker.tsx`:

```typescript
interface ProgressTrackerProps {
  sentAt: string | null
  viewedAt: string | null
  status: string  // EstimateStatus
  hasLinkedJob: boolean
  jobCompleted: boolean
}

const STEPS = [
  'Created',
  'Sent',
  'Viewed',
  'Approved',
  'Scheduled',
  'Complete',
]

export function ProgressTracker({ sentAt, viewedAt, status, hasLinkedJob, jobCompleted }: ProgressTrackerProps) {
  const completedCount =
    status === 'Approved' || status === 'Declined' ? (
      sentAt && viewedAt ? 4 :
      sentAt ? 3 : 2
    ) :
    viewedAt ? 3 :
    sentAt ? 2 : 1

  const current = jobCompleted ? 6 : hasLinkedJob ? 5 : completedCount

  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto py-2">
      {STEPS.map((step, i) => {
        const stepNum = i + 1
        const done = stepNum < current
        const active = stepNum === current
        return (
          <div key={step} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                done ? 'bg-volturaGold border-volturaGold text-volturaBlue' :
                active ? 'bg-transparent border-volturaGold text-volturaGold' :
                'bg-transparent border-gray-600 text-gray-600'
              }`}>
                {done ? '✓' : stepNum}
              </div>
              <span className={`text-[9px] mt-1 text-center leading-tight ${
                active ? 'text-volturaGold' : done ? 'text-white/60' : 'text-gray-600'
              }`}>{step}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 ${done ? 'bg-volturaGold' : 'bg-gray-700'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Add to public estimate view**

In `app/estimates/[id]/view/page.tsx`, after fetching the estimate, render `<ProgressTracker>` at the top of the page content. Pass `sentAt`, `viewedAt`, `status` from `estimates[0]`. `hasLinkedJob` and `jobCompleted` can default to `false` for now (public view doesn't query jobs).

- [ ] **Step 3: Add to internal estimate detail page**

In `app/(app)/estimates/[id]/page.tsx`, render `<ProgressTracker>` below the estimate name/status header. This is a server component so it can query the linked job directly if needed.

- [ ] **Step 4: Commit**
```bash
git add volturaos/components/estimates/ProgressTracker.tsx volturaos/app/estimates/[id]/view/page.tsx volturaos/app/(app)/estimates/[id]/page.tsx
git commit -m "feat: add progress tracker stepper to estimate views"
```

---

## Task 4: One-Click Invoice Button

> `createInvoiceFromEstimate(estimateId)` already exists in `lib/actions/invoices.ts`. This task is UI only.

**Files:**
- Modify: `volturaos/app/(app)/estimates/[id]/page.tsx`
- Modify: `volturaos/components/estimate-builder/EstimateBuilder.tsx`

- [ ] **Step 1: Query for existing invoice on the estimate detail page**

In `app/(app)/estimates/[id]/page.tsx`, add a parallel query:
```typescript
const [estimate, pricebook, proposal, linkedInvoice] = await Promise.all([
  getEstimateById(id),
  getAllPricebook(),
  getProposalEstimates(id),
  getLinkedInvoice(id),   // new
])
```

Add `getLinkedInvoice(estimateId)` to `lib/actions/estimates.ts` (or `invoices.ts`):
```typescript
export async function getLinkedInvoice(estimateId: string): Promise<{ id: string } | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('invoices')
    .select('id')
    .eq('estimate_id', estimateId)
    .maybeSingle()
  return data ?? null
}
```

Pass `linkedInvoiceId={linkedInvoice?.id ?? null}` to `EstimateBuilder`.

- [ ] **Step 2: Add invoice button to EstimateBuilder**

Add prop `linkedInvoiceId?: string | null` to `EstimateBuilder`.

In the action buttons area (near Send/Present buttons), add:

```tsx
{initialEstimate?.status === 'Approved' && (
  linkedInvoiceId ? (
    <button
      onClick={() => router.push(`/invoices/${linkedInvoiceId}`)}
      className="w-full bg-green-700 text-white font-bold py-3 rounded-xl"
    >
      View Invoice
    </button>
  ) : (
    <button
      onClick={handleCreateInvoice}
      disabled={saving}
      className="w-full bg-green-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
    >
      💰 Create Invoice
    </button>
  )
)}
```

Add handler:
```typescript
async function handleCreateInvoice() {
  setSaving(true)
  try {
    const inv = await createInvoiceFromEstimate(estimateId)
    router.push(`/invoices/${inv.id}`)
  } finally {
    setSaving(false)
  }
}
```

- [ ] **Step 3: Commit**
```bash
git add volturaos/lib/actions/estimates.ts volturaos/app/(app)/estimates/[id]/page.tsx volturaos/components/estimate-builder/EstimateBuilder.tsx
git commit -m "feat: add one-click create invoice button on approved estimates"
```

---

## Task 5: Site Photos

**Files:**
- Create: `volturaos/lib/actions/job-photos.ts`
- Create: `volturaos/components/jobs/JobPhotos.tsx`
- Modify: `volturaos/components/jobs/JobDetail.tsx`
- Modify: `volturaos/app/(app)/jobs/[id]/page.tsx`

> Prerequisite: DB migration for `job_photos` table and Supabase Storage bucket `job-photos` must be done.

- [ ] **Step 1: Create server actions for photos**

Create `volturaos/lib/actions/job-photos.ts`:
```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface JobPhotoRecord {
  id: string
  job_id: string
  storage_path: string
  caption: string | null
  uploaded_at: string
  url?: string  // signed URL, added at fetch time
}

export async function getJobPhotos(jobId: string): Promise<JobPhotoRecord[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('job_photos')
    .select('*')
    .eq('job_id', jobId)
    .order('uploaded_at', { ascending: false })
  if (error) throw new Error(error.message)
  const photos = data as JobPhotoRecord[]
  // Generate signed URLs (valid 1 hour)
  const withUrls = await Promise.all(
    photos.map(async (p) => {
      const { data: signed } = await admin.storage
        .from('job-photos')
        .createSignedUrl(p.storage_path, 3600)
      return { ...p, url: signed?.signedUrl ?? '' }
    })
  )
  return withUrls
}

export async function uploadJobPhoto(jobId: string, formData: FormData): Promise<void> {
  const admin = createAdminClient()
  const file = formData.get('photo') as File
  if (!file) throw new Error('No file')
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${jobId}/${crypto.randomUUID()}.${ext}`
  const bytes = await file.arrayBuffer()
  const { error: upErr } = await admin.storage
    .from('job-photos')
    .upload(path, bytes, { contentType: file.type })
  if (upErr) throw new Error(upErr.message)
  const { error: dbErr } = await admin.from('job_photos').insert({
    job_id: jobId,
    storage_path: path,
  })
  if (dbErr) throw new Error(dbErr.message)
  revalidatePath(`/jobs/${jobId}`)
}

export async function deleteJobPhoto(photoId: string, storagePath: string, jobId: string): Promise<void> {
  const admin = createAdminClient()
  await admin.storage.from('job-photos').remove([storagePath])
  await admin.from('job_photos').delete().eq('id', photoId)
  revalidatePath(`/jobs/${jobId}`)
}
```

- [ ] **Step 2: Create `JobPhotos` component**

Create `volturaos/components/jobs/JobPhotos.tsx`:
```typescript
'use client'

import { useState, useRef, useTransition } from 'react'
import { uploadJobPhoto, deleteJobPhoto } from '@/lib/actions/job-photos'
import type { JobPhotoRecord } from '@/lib/actions/job-photos'

export function JobPhotos({ jobId, initialPhotos }: { jobId: string; initialPhotos: JobPhotoRecord[] }) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('photo', file)
    startTransition(async () => {
      await uploadJobPhoto(jobId, fd)
      // Page will revalidate and re-render with new photos via server
      // For instant feedback, add optimistic URL from file
      const url = URL.createObjectURL(file)
      setPhotos(p => [{ id: 'tmp', job_id: jobId, storage_path: '', caption: null, uploaded_at: new Date().toISOString(), url }, ...p])
    })
    e.target.value = ''
  }

  function handleDelete(photo: JobPhotoRecord) {
    startTransition(async () => {
      await deleteJobPhoto(photo.id, photo.storage_path, jobId)
      setPhotos(p => p.filter(x => x.id !== photo.id))
    })
  }

  return (
    <div className="bg-volturaNavy/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Site Photos</p>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="text-volturaGold text-xs font-semibold disabled:opacity-50"
        >
          {isPending ? 'Uploading...' : '+ Add Photo'}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      {photos.length === 0 ? (
        <p className="text-gray-600 text-sm">No photos yet</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative aspect-square">
              <img
                src={photo.url}
                alt=""
                className="w-full h-full object-cover rounded-lg cursor-pointer"
                onClick={() => setLightbox(photo.url ?? null)}
              />
              <button
                onClick={() => handleDelete(photo)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add `<JobPhotos>` to `JobDetail`**

In `JobDetail.tsx`, add prop `photos: JobPhotoRecord[]` to `JobDetailProps`. Import and render `<JobPhotos jobId={job.id} initialPhotos={photos} />` below the Notes section.

- [ ] **Step 4: Fetch photos in the job page**

In `app/(app)/jobs/[id]/page.tsx`, add parallel fetch:
```typescript
const [job, checklist, photos] = await Promise.all([
  getJobById(id),
  getOrCreateChecklist(id),
  getJobPhotos(id),
])
```
Pass `photos` to `<JobDetail>`.

- [ ] **Step 5: Commit**
```bash
git add volturaos/lib/actions/job-photos.ts volturaos/components/jobs/JobPhotos.tsx volturaos/components/jobs/JobDetail.tsx volturaos/app/(app)/jobs/[id]/page.tsx
git commit -m "feat: add site photo upload and gallery to job detail"
```

---

## Task 6: Estimate Templates

**Files:**
- Modify: `volturaos/types/index.ts`
- Modify: `volturaos/lib/actions/estimates.ts`
- Modify: `volturaos/components/estimate-builder/EstimateBuilder.tsx`
- Modify: `volturaos/app/(app)/estimates/new/page.tsx`
- Create: `volturaos/app/(app)/settings/templates/page.tsx`

> Prerequisite: `ALTER TABLE estimates ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false;` must be run.

- [ ] **Step 1: Add `is_template` to `Estimate` type**

```typescript
export interface Estimate {
  // ... existing ...
  is_template: boolean
}
```

- [ ] **Step 2: Add template server actions to `estimates.ts`**

```typescript
export async function saveAsTemplate(estimateId: string, name: string): Promise<string> {
  const admin = createAdminClient()
  const { data: src } = await admin.from('estimates').select('*').eq('id', estimateId).single()
  if (!src) throw new Error('Estimate not found')
  const { data, error } = await admin.from('estimates').insert({
    name,
    is_template: true,
    line_items: src.line_items,
    addons: src.addons,
    includes_permit: src.includes_permit,
    includes_cleanup: src.includes_cleanup,
    includes_warranty: src.includes_warranty,
    customer_id: src.customer_id,  // required FK; keep original customer
    status: 'Draft',
    total: src.total,
    subtotal: src.subtotal,
  }).select('id').single()
  if (error) throw new Error(error.message)
  return data.id
}

export async function getTemplates(): Promise<Pick<Estimate, 'id' | 'name' | 'total' | 'line_items' | 'addons' | 'includes_permit' | 'includes_cleanup' | 'includes_warranty'>[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('estimates')
    .select('id, name, total, line_items, addons, includes_permit, includes_cleanup, includes_warranty')
    .eq('is_template', true)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function deleteTemplate(id: string): Promise<void> {
  const admin = createAdminClient()
  await admin.from('estimates').delete().eq('id', id)
}

export async function createEstimateFromTemplate(
  templateId: string,
  customerId: string,
): Promise<string> {
  const admin = createAdminClient()
  const { data: tpl } = await admin.from('estimates').select('*').eq('id', templateId).single()
  if (!tpl) throw new Error('Template not found')
  const { data, error } = await admin.from('estimates').insert({
    name: tpl.name,
    customer_id: customerId,
    line_items: tpl.line_items,
    addons: tpl.addons,
    includes_permit: tpl.includes_permit,
    includes_cleanup: tpl.includes_cleanup,
    includes_warranty: tpl.includes_warranty,
    total: tpl.total,
    subtotal: tpl.subtotal,
    status: 'Draft',
    is_template: false,
  }).select('id').single()
  if (error) throw new Error(error.message)
  return data.id
}
```

- [ ] **Step 3: Add "Save as Template" button to EstimateBuilder**

In the header area (next to estimate name), add a bookmark button:
```tsx
<button
  onClick={handleSaveAsTemplate}
  title="Save as template"
  className="text-gray-500 hover:text-volturaGold text-lg px-2"
>
  🔖
</button>
```

Handler:
```typescript
async function handleSaveAsTemplate() {
  const templateName = window.prompt('Template name:', estimateName)
  if (!templateName) return
  await saveAsTemplate(estimateId, templateName)
  // Show brief success toast — set a local state flag
}
```

- [ ] **Step 4: Template picker on new estimate page**

`app/(app)/estimates/new/page.tsx` currently creates an estimate immediately and redirects. Change it to a page that shows templates first:

```typescript
// If customerId is present and templates exist, show picker
// If user clicks a template → createEstimateFromTemplate → redirect to /estimates/[id]
// If user clicks "Blank" → existing createEstimate flow
```

Make it a server component that fetches templates and renders a simple client component `TemplatePicker` that handles the choice.

- [ ] **Step 5: Create Settings > Templates page**

Create `volturaos/app/(app)/settings/templates/page.tsx`:
```typescript
export const dynamic = 'force-dynamic'
import { getTemplates, deleteTemplate } from '@/lib/actions/estimates'
// Server component: lists templates with name, item count, total
// Each has a delete button (client action)
```

- [ ] **Step 6: Commit**
```bash
git add volturaos/types/index.ts volturaos/lib/actions/estimates.ts volturaos/components/estimate-builder/EstimateBuilder.tsx volturaos/app/(app)/estimates/new/page.tsx volturaos/app/(app)/settings/templates/page.tsx
git commit -m "feat: add estimate templates — save, load, and manage"
```

---

## Task 7: Deploy

- [ ] **Step 1: Push to GitHub**
```bash
git push origin master
```

- [ ] **Step 2: Verify Vercel build succeeds** — check Vercel dashboard for green build.

- [ ] **Step 3: Smoke test on phone**
- Open estimate → tap line item → description expands
- Check badge toggles save and show in Present mode
- Progress tracker shows correct step
- Approved estimate shows "Create Invoice" button
- Job detail shows photo upload + grid
- Estimate builder shows 🔖 template button
