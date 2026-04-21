# Forms System Design Spec

**Date:** 2026-04-20  
**Status:** Draft  
**Feature:** Digital field forms — fillable, optionally signed, tied to jobs

---

## Overview

The Forms tab in the Unified Profile sidebar (currently a locked placeholder at `components/profile/tabs/FormsTab.tsx`) gets a real implementation. Three form types are supported:

1. **Material List** — internal checklist of items + quantities. No signature. Created on demand.
2. **Permission to Cut** — fixed boilerplate text. Customer signature optional (in-person or via link). Internal Telegram notification on sign.
3. **Safety Waiver** — fixed boilerplate text. Customer signature optional (in-person or via link). Internal Telegram notification on sign.

All three forms are **optional** — none are forced or required on any job. You create them when needed.

---

## Data Storage

Forms reuse the existing `estimates` table with two new nullable columns:

| Column | Type | Description |
|--------|------|-------------|
| `form_type` | `text` | One of `material_list`, `permission_to_cut`, `safety_waiver`. NULL on regular estimates. |
| `job_id` | `uuid` | FK → `jobs.id`. NULL on regular estimates. |

**Why reuse estimates?** The table already has `signature_data`, `signer_name`, `signed_at`, `status`, `customer_id`, `line_items` (JSONB) — everything forms need. The existing `signEstimate()` server action handles signing for both in-person and remote flows.

**Filtering:** Regular estimates always have `form_type IS NULL`. Forms always have `form_type IS NOT NULL`. All existing estimate queries (`listEstimates`, `getEstimatesByCustomer`, `listCustomerEstimates`, `getSignedEstimateForJob`) must add a `.is('form_type', null)` filter to prevent forms from appearing in estimate lists.

**Material list items** stored in `line_items` JSONB as `[{ name: string, qty: string }]`.

**One form per type per job** — enforced at the server action level (check-before-create; return existing if found).

**`proposal_id`** must be explicitly set to `null` when creating a form row. `getProposalEstimates()` works correctly for forms without modification: when called with a form's `id`, it fetches `proposal_id` (which is null), falls back to `anchorId = formId`, then queries `id.eq.${formId} OR proposal_id.eq.${formId}` — which returns only the one form row (no other rows share this anchor). Do NOT add a `form_type IS NULL` filter to `getProposalEstimates`.

**Form status lifecycle** (uses the same values as the `estimates` table):
- `Draft` — created, not yet shared or signed
- `Sent` — link has been generated for the customer (required before the public URL is accessible)
- `Viewed` — customer opened the public page (auto-set by `getPublicEstimate()`, same as estimates)
- `Approved` — customer has signed (set by `signEstimate()`)

The public `/estimates/[id]/view` page gates access to statuses `['Sent', 'Viewed', 'Approved', 'Declined']`. A form in `Draft` status returns `notFound()`. Generating the share link (copy or SMS) must advance the form to `Sent` first via `publishForm()`.

---

## DB Migration

```sql
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS form_type text CHECK (
    form_type IN ('material_list', 'permission_to_cut', 'safety_waiver')
  ),
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES jobs(id) ON DELETE CASCADE;
```

Migration script: `scripts/add-form-columns.mjs`  
Run with: `node scripts/add-form-columns.mjs`

---

## Types (`types/index.ts`)

```ts
export type FormType = 'material_list' | 'permission_to_cut' | 'safety_waiver'

export type Form = {
  id: string
  job_id: string
  customer_id: string
  form_type: FormType
  status: 'Draft' | 'Sent' | 'Viewed' | 'Approved'  // 'Approved' = signed in DB
  line_items: { name: string; qty: string }[] | null  // material_list only
  signer_name: string | null
  signature_data: string | null
  signed_at: string | null
  created_at: string
}
```

---

## Server Actions (`lib/actions/forms.ts`)

All actions use `createAdminClient()`. File has `'use server'` at the top.

```ts
// List all forms for a job
listJobForms(jobId: string): Promise<Form[]>

// Create a form — returns existing if one already exists for this job + form_type
// Sets: form_type, job_id, customer_id, status='Draft', total=0, proposal_id=null
createOrGetForm(jobId: string, customerId: string, formType: FormType): Promise<Form>

// Save material list items (each call is a full replace of line_items)
saveMaterialList(formId: string, items: { name: string; qty: string }[]): Promise<void>

// Advance form to 'Sent' status and return the public URL.
// Uses a direct .update() on the estimates table — does NOT call updateEstimateStatus()
// (which would fire a misleading "Estimate sent" Telegram message).
// Returns: `${NEXT_PUBLIC_APP_URL}/estimates/${formId}/view`
publishForm(formId: string): Promise<string>

// Send sign link via SMS — fetches form + customer from DB, builds a form-specific
// message ("here's your form to review and sign from Voltura Power Group: [link]"),
// calls sendSMS(phone, message, smsOptOut) directly. Also calls publishForm() internally
// to advance status to 'Sent'. Does NOT call sendEstimateLinkSMS() (which would send
// "here's your estimate" copy and fire updateEstimateStatus with its Telegram noise).
sendFormLinkSMS(formId: string): Promise<void>

// Delete a form
deleteForm(formId: string): Promise<void>
```

`signEstimate(id, signerName, signatureData)` (existing, in `lib/actions/estimates.ts`) handles the actual signing for both in-person and remote flows — no new sign action needed.

---

## `lib/actions/estimates.ts` — Required Modifications

**Five functions need a `.is('form_type', null)` filter to prevent forms from appearing in estimate queries:**

| Function | Change |
|----------|--------|
| `listEstimates()` | Add `.is('form_type', null)` |
| `getEstimatesByCustomer()` | Add `.is('form_type', null)` |
| `listCustomerEstimates()` | Add `.is('form_type', null)` |
| `getSignedEstimateForJob()` | Add `.is('form_type', null)` |
| `approvePublicEstimate()` | No filter change, but see note below |

**`signEstimate()` update — form-aware Telegram:**

The existing `signEstimate` fires Telegram with a hardcoded `"✍️ Estimate signed in person by ${signerName}"` at the end of the function, with no post-update query. Replace that single `sendTelegram` call with a new `.select()` query + conditional message:

```ts
// Replace the existing: void sendTelegram(`✍️ Estimate signed in person by ${signerName}`)
// with this new block:

const { data: row } = await admin
  .from('estimates')
  .select('form_type, jobs(job_type)')
  .eq('id', id)
  .single()

if (row?.form_type) {
  const label = FORM_TEMPLATES[row.form_type as string]?.title ?? row.form_type
  const jobTitle = ((row.jobs as Record<string, unknown> | null)?.job_type as string) ?? 'unknown job'
  void sendTelegram(`✍️ ${label} signed by ${signerName} — Job: ${jobTitle}`)
} else {
  void sendTelegram(`✍️ Estimate signed in person by ${signerName}`)
}
```

Import `FORM_TEMPLATES` from `lib/form-templates.ts` at the top of `estimates.ts`.

**`approvePublicEstimate()` note:** This function is only called for multi-estimate proposals via `PublicCompareView`. Forms never go through `approvePublicEstimate()` — both in-person and remote form signing call `signEstimate()` directly. No changes needed to `approvePublicEstimate`.

---

## FormsTab Data Flow

`FormsTab` is a **client component** (its parent `UnifiedProfile` is already `'use client'` — async server components cannot be rendered inside client components).

The data fetch happens in the **server page** at `app/(app)/jobs/[id]/page.tsx`:
- Call `listJobForms(job.id)` alongside the existing `Promise.all` fetches
- Pass result as `forms` prop to `<UnifiedProfile>`
- `UnifiedProfile` receives `forms: Form[]` and passes it + `jobId` + `customerId` to `<FormsTab>`

`FormsTab` props:
```ts
type FormsTabProps = {
  forms: Form[]
  jobId: string
  customerId: string
  customerPhone: string | null
}
```

---

## FormsTab UI (`components/profile/tabs/FormsTab.tsx`)

Client component receiving `FormsTabProps`. Three form type cards:

```
┌─────────────────────────────────┐
│ 📋 Material List          [+]   │
│  (empty) or item count          │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ✂️ Permission to Cut      [+]   │
│  Draft  or  ✅ Signed           │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ⚠️ Safety Waiver          [+]   │
│  Draft  or  ✅ Signed           │
└─────────────────────────────────┘
```

- Each card looks up whether a form of that type exists in `forms[]`
- `[+]` button: calls `createOrGetForm(jobId, customerId, formType)`, then opens the appropriate sheet
- If form already exists, tapping the card opens the sheet directly
- Long-press on a card → action sheet with **Delete** option (same `useLongPress` + `ActionSheetProvider` pattern as `JobCard`, `CustomerCard`, etc.)

---

## Form Sheets (Client Components)

### MaterialListSheet (`components/forms/MaterialListSheet.tsx`)

Full-screen overlay (not a short ActionSheet — needs vertical space for a list). Receives `form: Form`. Shows:
- List of `{ name, qty }` rows — each row has two text inputs
- "+ Add Item" button at bottom
- On each change: debounced call to `saveMaterialList(form.id, items)`
- No sign action
- Close button returns to FormsTab

### SignedFormSheet (`components/forms/SignedFormSheet.tsx`)

Full-screen overlay shared by Permission to Cut and Safety Waiver. Receives `form: Form`, `customerPhone: string | null`. Shows:
- Form title + boilerplate body text from `FORM_TEMPLATES[form.form_type]`
- If `status !== 'Approved'`: two action buttons — **Sign In Person** and **Send Link**
- If `status === 'Approved'`: signer name + `signed_at` timestamp; no action buttons

**Sign In Person:**
Opens `FormSignatureModal`. On submit → calls `signEstimate(form.id, signerName, signatureData)`. On success, sheet closes and parent re-fetches.

**Send Link:**
1. Calls `publishForm(form.id)` — advances status to `Sent`, returns the absolute URL
2. Displays the URL as a copyable text field (tap to copy to clipboard)
3. If `customerPhone` is non-null, shows **Send SMS** button → calls `sendFormLinkSMS(form.id)`

---

## FormSignatureModal (`components/forms/FormSignatureModal.tsx`)

A new simplified signature capture modal — **not** a reuse of `InPersonSignature`. That component has a T&C accordion step and pricing display which are not relevant for forms.

This modal is simpler:
- Full-screen overlay (same z-index pattern as InPersonSignature)
- Print name text input (required)
- Canvas signature pad — same HTML5 Canvas API, same Voltura gold (#C9A227) stroke at 2.5px, same pointer event handling as `InPersonSignature`
- "Clear" link, "Submit" button (disabled until both name and signature are present)
- On submit: calls `signEstimate(formId, signerName, signatureData)`, shows 2-second success state, then calls `onClose()`
- Props: `formId: string`, `onClose: () => void`

---

## Public Sign Page (`app/estimates/[id]/view/page.tsx` + `PublicFormView`)

The existing public page currently has **no** signature canvas in the solo-estimate branch — the canvas exists only inside `PublicCompareView` (for proposal flows). For forms, a new branch renders `PublicFormView`.

**Page-level change:** After `getPublicEstimate()` returns, check `estimates[0].form_type`:

```tsx
const formType = (solo as Record<string, unknown>).form_type as FormType | null

if (formType) {
  return (
    <div className="min-h-dvh bg-volturaBlue px-4 py-8 max-w-lg mx-auto">
      <header>...</header>  {/* same Voltura header */}
      <PublicFormView form={solo as unknown as Form} customerName={customer.name} />
    </div>
  )
}
// ... existing estimate render below
```

**`PublicFormView` (`components/forms/PublicFormView.tsx`):**

Client component. Receives `form: Form`, `customerName: string`. Shows:
- Customer name card (same style as existing)
- Boilerplate text from `FORM_TEMPLATES[form.form_type]` in a styled card
- If `status === 'Approved'`: signed confirmation (name + date)
- If `status !== 'Approved'`: "Sign" button → opens inline canvas signature modal (same `FormSignatureModal` pattern)
- On sign: calls `signEstimate(form.id, signerName, signatureData)` then shows success state

`signEstimate` must be importable in a client component context. Since it's a server action (`'use server'`), Next.js allows calling it directly from client components — no change needed.

---

## Form Boilerplate Text (`lib/form-templates.ts`)

Note: `material_list` is intentionally absent — it has no boilerplate text.

```ts
export const FORM_TEMPLATES: Record<string, { title: string; body: string }> = {
  permission_to_cut: {
    title: 'Permission to Cut',
    body: `I, the undersigned, hereby grant Voltura Power Group permission to cut into walls, ceilings, floors, or other surfaces as necessary to complete the electrical work described in the associated estimate or work order. I understand that Voltura Power Group will take reasonable care to minimize damage and that any patching or cosmetic repair is not included unless separately quoted.`,
  },
  safety_waiver: {
    title: 'Safety Waiver',
    body: `I, the undersigned, acknowledge that electrical work carries inherent risks. I agree that Voltura Power Group has explained the scope of work and any associated safety considerations. I release Voltura Power Group from liability for pre-existing conditions, concealed hazards, or damage resulting from circumstances outside their control. I confirm that I am the property owner or authorized representative with authority to approve this work.`,
  },
}
```

---

## Files

| File | Action |
|------|--------|
| `scripts/add-form-columns.mjs` | Create — DB migration (run: `node scripts/add-form-columns.mjs`) |
| `lib/form-templates.ts` | Create — boilerplate text constants |
| `lib/actions/forms.ts` | Create — `listJobForms`, `createOrGetForm`, `saveMaterialList`, `publishForm`, `sendFormLinkSMS`, `deleteForm` |
| `types/index.ts` | Modify — add `Form`, `FormType` types |
| `lib/actions/estimates.ts` | Modify — add `.is('form_type', null)` to `listEstimates`, `getEstimatesByCustomer`, `listCustomerEstimates`, `getSignedEstimateForJob`; update `signEstimate()` for form-aware Telegram |
| `app/(app)/jobs/[id]/page.tsx` | Modify — add `listJobForms(job.id)` to Promise.all; pass `forms`, `jobId`, `customerId`, `customerPhone` to `UnifiedProfile` |
| `components/profile/UnifiedProfile.tsx` | Modify — accept and forward `forms`, `jobId`, `customerId`, `customerPhone` props to `FormsTab` |
| `components/profile/tabs/FormsTab.tsx` | Modify — replace placeholder; client component accepting `FormsTabProps` |
| `components/forms/MaterialListSheet.tsx` | Create — full-screen overlay for material list |
| `components/forms/SignedFormSheet.tsx` | Create — full-screen overlay for permission to cut + safety waiver |
| `components/forms/FormSignatureModal.tsx` | Create — simplified canvas signature modal (no T&C, no pricing) |
| `components/forms/PublicFormView.tsx` | Create — public-facing form view with remote sign flow |
| `app/estimates/[id]/view/page.tsx` | Modify — conditional `form_type` branch rendering `PublicFormView` |

---

## Out of Scope

- Email delivery of signed forms (deferred — Resend integration planned separately)
- More than 3 form types
- Custom/editable boilerplate text
- Signature on material list
