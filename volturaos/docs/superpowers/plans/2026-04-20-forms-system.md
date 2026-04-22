# Forms System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the locked Forms tab placeholder in the Unified Profile with real digital field forms — Material List (internal checklist), Permission to Cut (signed), and Safety Waiver (signed) — all optional, creatable per-job, with in-person and remote sign flows.

**Architecture:** Forms reuse the `estimates` table with two new columns (`form_type`, `job_id`). Existing signature infrastructure (`signEstimate`, canvas pattern, public `/estimates/[id]/view` route) handles signing with minimal new code. Data flows from server page → UnifiedProfile props → FormsTab client component.

**Tech Stack:** Next.js 15 App Router · TypeScript · Supabase (admin client) · Tailwind CSS v4 · Twilio SMS (existing)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `scripts/add-form-columns.mjs` | Create | DB migration — adds `form_type` + `job_id` columns |
| `lib/form-templates.ts` | Create | Boilerplate text for Permission to Cut + Safety Waiver |
| `types/index.ts` | Modify | Add `FormType` and `Form` types |
| `lib/actions/forms.ts` | Create | Server actions: list, create, save, publish, SMS, delete |
| `lib/actions/estimates.ts` | Modify | Add `form_type IS NULL` guards; update `signEstimate` Telegram |
| `app/(app)/jobs/[id]/page.tsx` | Modify | Add `listJobForms` to Promise.all; pass to UnifiedProfile |
| `components/profile/UnifiedProfile.tsx` | Modify | Accept forms props; pass to FormsTab |
| `components/profile/tabs/FormsTab.tsx` | Modify | Replace placeholder with 3 form type cards |
| `components/forms/MaterialListSheet.tsx` | Create | Full-screen overlay for material list editing |
| `components/forms/SignedFormSheet.tsx` | Create | Full-screen overlay for Permission to Cut + Safety Waiver |
| `components/forms/FormSignatureModal.tsx` | Create | Simplified canvas signature modal (no T&C, no pricing) |
| `components/forms/PublicFormView.tsx` | Create | Public-facing form view with remote sign flow |
| `app/estimates/[id]/view/page.tsx` | Modify | Branch on `form_type` to render PublicFormView |

---

## Task 1: DB Migration

**Files:**
- Create: `scripts/add-form-columns.mjs`

- [ ] **Step 1: Create migration script**

```javascript
// scripts/add-form-columns.mjs
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const sql = `
  ALTER TABLE estimates
    ADD COLUMN IF NOT EXISTS form_type text CHECK (
      form_type IN ('material_list', 'permission_to_cut', 'safety_waiver')
    ),
    ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES jobs(id) ON DELETE CASCADE;
`

const { error } = await supabase.rpc('exec_sql', { sql })

if (error) {
  console.error('RPC failed:', error.message)
  console.log('\nRun this SQL manually in the Supabase SQL editor:\n')
  console.log(sql)
} else {
  console.log('✅ form_type and job_id columns added to estimates table')
}
```

- [ ] **Step 2: Run migration**

```bash
node scripts/add-form-columns.mjs
```

Expected: `✅ form_type and job_id columns added to estimates table`

If RPC fails, copy the SQL from the output and run it in the Supabase dashboard → SQL Editor.

- [ ] **Step 3: Verify in Supabase**

Go to Supabase dashboard → Table Editor → estimates. Confirm `form_type` and `job_id` columns exist. `form_type` should be nullable with a text constraint.

- [ ] **Step 4: Commit**

```bash
git add scripts/add-form-columns.mjs
git commit -m "chore: add form_type and job_id columns migration script"
```

---

## Task 2: Types + Form Templates

**Files:**
- Modify: `types/index.ts` (after line 50, after the `Job` interface)
- Create: `lib/form-templates.ts`

- [ ] **Step 1: Add FormType and Form to `types/index.ts`**

After the `Job` interface (after line 49 — after `review_requested_at: string | null`), add:

```typescript
export type FormType = 'material_list' | 'permission_to_cut' | 'safety_waiver'

export interface Form {
  id: string
  job_id: string
  customer_id: string
  form_type: FormType
  status: 'Draft' | 'Sent' | 'Viewed' | 'Approved'
  line_items: { name: string; qty: string }[] | null  // material_list only
  signer_name: string | null
  signature_data: string | null
  signed_at: string | null
  created_at: string
}
```

- [ ] **Step 2: Create `lib/form-templates.ts`**

```typescript
// lib/form-templates.ts
// Note: material_list is intentionally absent — it has no boilerplate text

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

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add types/index.ts lib/form-templates.ts
git commit -m "feat: add FormType, Form types and form boilerplate templates"
```

---

## Task 3: Forms Server Actions

**Files:**
- Create: `lib/actions/forms.ts`

- [ ] **Step 1: Create `lib/actions/forms.ts`**

```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendSMS } from '@/lib/sms'
import type { Form, FormType } from '@/types'

export async function listJobForms(jobId: string): Promise<Form[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('estimates')
    .select('id, job_id, customer_id, form_type, status, line_items, signer_name, signature_data, signed_at, created_at')
    .eq('job_id', jobId)
    .not('form_type', 'is', null)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as Form[]
}

export async function createOrGetForm(
  jobId: string,
  customerId: string,
  formType: FormType
): Promise<Form> {
  const admin = createAdminClient()

  // Return existing form if one already exists for this job + type
  const { data: existing } = await admin
    .from('estimates')
    .select('id, job_id, customer_id, form_type, status, line_items, signer_name, signature_data, signed_at, created_at')
    .eq('job_id', jobId)
    .eq('form_type', formType)
    .maybeSingle()
  if (existing) return existing as unknown as Form

  const { data, error } = await admin
    .from('estimates')
    .insert({
      job_id: jobId,
      customer_id: customerId,
      form_type: formType,
      proposal_id: null,
      name: formType.replace(/_/g, ' '),
      status: 'Draft',
      total: 0,
      is_template: false,
    })
    .select('id, job_id, customer_id, form_type, status, line_items, signer_name, signature_data, signed_at, created_at')
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as Form
}

export async function saveMaterialList(
  formId: string,
  items: { name: string; qty: string }[]
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('estimates')
    .update({ line_items: items as unknown[] })
    .eq('id', formId)
  if (error) throw new Error(error.message)
}

// Advance form to 'Sent' and return the public URL.
// Uses a direct .update() — does NOT call updateEstimateStatus() to avoid its Telegram noise.
export async function publishForm(formId: string): Promise<string> {
  const admin = createAdminClient()
  const now = new Date().toISOString()
  const { error } = await admin
    .from('estimates')
    .update({ status: 'Sent', sent_at: now })
    .eq('id', formId)
  if (error) throw new Error(error.message)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://volturaos.vercel.app'
  return `${baseUrl}/estimates/${formId}/view`
}

// Fetches customer from DB, builds a form-specific SMS, calls publishForm internally.
// Does NOT call sendEstimateLinkSMS() — that sends "here's your estimate" copy.
export async function sendFormLinkSMS(formId: string): Promise<void> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('estimates')
    .select('customer_id, customers(name, phone, sms_opt_out)')
    .eq('id', formId)
    .single()
  if (error || !data) return

  const row = data as Record<string, unknown>
  const customer = row.customers as { name: string; phone: string | null; sms_opt_out: boolean } | null
  if (!customer?.phone) return

  const url = await publishForm(formId)
  const firstName = customer.name.split(' ')[0]
  const message = `Hi ${firstName}, here's your form to review and sign from Voltura Power Group: ${url}`
  await sendSMS(customer.phone, message, customer.sms_opt_out)
}

export async function deleteForm(formId: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('estimates')
    .delete()
    .eq('id', formId)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/forms.ts
git commit -m "feat: add forms server actions (list, create, save, publish, SMS, delete)"
```

---

## Task 4: Patch `lib/actions/estimates.ts`

**Files:**
- Modify: `lib/actions/estimates.ts`

Four functions need `.is('form_type', null)` added so forms don't show up in estimate lists. `signEstimate` needs a form-aware Telegram message. Add one import.

- [ ] **Step 1: Add FORM_TEMPLATES import**

At the top of `lib/actions/estimates.ts`, after the existing imports, add:

```typescript
import { FORM_TEMPLATES } from '@/lib/form-templates'
```

- [ ] **Step 2: Patch `listEstimates()`**

Find this line inside `listEstimates()` (around line 422):
```typescript
const { data, error } = await admin.from('estimates').select('*, customers(name)').eq('is_template', false).order('created_at', { ascending: false }).limit(100)
```

Add `.is('form_type', null)` before `.order(...)`:
```typescript
const { data, error } = await admin.from('estimates').select('*, customers(name)').eq('is_template', false).is('form_type', null).order('created_at', { ascending: false }).limit(100)
```

- [ ] **Step 3: Patch `getEstimatesByCustomer()`**

Find the query inside `getEstimatesByCustomer()` (around line 381). It has `.eq('is_template', false)`. Add `.is('form_type', null)` right after that line:

Before:
```typescript
    .eq('is_template', false)
    .not('status', 'eq', 'Declined')
```

After:
```typescript
    .eq('is_template', false)
    .is('form_type', null)
    .not('status', 'eq', 'Declined')
```

- [ ] **Step 4: Patch `listCustomerEstimates()`**

Same pattern as above — find the query in `listCustomerEstimates()` (around line 400). Add `.is('form_type', null)` after `.eq('is_template', false)`:

Before:
```typescript
    .eq('is_template', false)
    .not('status', 'eq', 'Declined')
```

After:
```typescript
    .eq('is_template', false)
    .is('form_type', null)
    .not('status', 'eq', 'Declined')
```

- [ ] **Step 5: Patch `getSignedEstimateForJob()`**

Find the query in `getSignedEstimateForJob()` (around line 427). Add `.is('form_type', null)` after `.eq('status', 'Approved')`:

Before:
```typescript
    .eq('job_id', jobId)
    .eq('status', 'Approved')
    .order('created_at', { ascending: false })
```

After:
```typescript
    .eq('job_id', jobId)
    .eq('status', 'Approved')
    .is('form_type', null)
    .order('created_at', { ascending: false })
```

- [ ] **Step 6: Update `signEstimate()` Telegram**

Find the last line of `signEstimate()` (around line 286):
```typescript
  void sendTelegram(`✍️ Estimate signed in person by ${signerName}`)
```

Replace that single line with:
```typescript
  // Form-aware Telegram: fetch form_type to send the right message
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

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add lib/actions/estimates.ts
git commit -m "fix: add form_type IS NULL guards to estimate queries; form-aware sign Telegram"
```

---

## Task 5: Thread Forms Data Through Job Page + UnifiedProfile

**Files:**
- Modify: `app/(app)/jobs/[id]/page.tsx`
- Modify: `components/profile/UnifiedProfile.tsx`

- [ ] **Step 1: Update `app/(app)/jobs/[id]/page.tsx`**

Add import for `listJobForms`:
```typescript
import { listJobForms } from '@/lib/actions/forms'
```

Extend the `Promise.all` to add `listJobForms` as the 8th item:

Before:
```typescript
  const [checklist, photos, signedEstimate, changeOrders, estimates, invoices, jobHistory] =
    await Promise.all([
      getOrCreateChecklist(job.id, job.job_type),
      getJobPhotos(job.id),
      getSignedEstimateForJob(job.id),
      listChangeOrdersForJob(job.id),
      listCustomerEstimates(job.customer_id),
      listCustomerInvoices(job.customer_id),
      listCustomerJobs(job.customer_id, job.id),
    ])
```

After:
```typescript
  const [checklist, photos, signedEstimate, changeOrders, estimates, invoices, jobHistory, forms] =
    await Promise.all([
      getOrCreateChecklist(job.id, job.job_type),
      getJobPhotos(job.id),
      getSignedEstimateForJob(job.id),
      listChangeOrdersForJob(job.id),
      listCustomerEstimates(job.customer_id),
      listCustomerInvoices(job.customer_id),
      listCustomerJobs(job.customer_id, job.id),
      listJobForms(job.id),
    ])
```

Add `forms` to the `<UnifiedProfile>` render:
```typescript
  return (
    <UnifiedProfile
      job={job}
      checklist={checklist}
      photos={photos}
      signedEstimateId={signedEstimate?.id ?? null}
      changeOrders={changeOrders}
      estimates={estimates}
      invoices={invoices}
      jobHistory={jobHistory}
      forms={forms}
    />
  )
```

- [ ] **Step 2: Update `components/profile/UnifiedProfile.tsx`**

Add the `Form` import at the top:
```typescript
import type { Job, JobChecklist, ChangeOrder, Invoice, EstimateStatus, LineItem, Addon, Form } from '@/types'
```

Add `forms` to the `UnifiedProfileProps` interface (after `jobHistory: Job[]`):
```typescript
  jobHistory: Job[]
  forms: Form[]
}
```

Add `forms` to the destructured props parameter:
```typescript
export function UnifiedProfile({
  job,
  checklist,
  photos,
  signedEstimateId,
  changeOrders,
  estimates,
  invoices,
  jobHistory,
  forms,
}: UnifiedProfileProps) {
```

Replace the FormsTab render (line 97):

Before:
```typescript
        {activeTab === 'forms' && <FormsTab />}
```

After:
```typescript
        {activeTab === 'forms' && (
          <FormsTab
            forms={forms}
            jobId={job.id}
            customerId={job.customer.id}
            customerPhone={job.customer.phone}
          />
        )}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: FormsTab props mismatch errors until Task 6. That's OK — fix those in Task 6.

- [ ] **Step 4: Commit**

```bash
git add app/(app)/jobs/[id]/page.tsx components/profile/UnifiedProfile.tsx
git commit -m "feat: thread forms data through job page and UnifiedProfile"
```

---

## Task 6: FormsTab — Replace Placeholder

**Files:**
- Modify: `components/profile/tabs/FormsTab.tsx`

- [ ] **Step 1: Rewrite `components/profile/tabs/FormsTab.tsx`**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useLongPress } from '@/hooks/useLongPress'
import { useActionSheet } from '@/components/ui/ActionSheetProvider'
import { createOrGetForm, deleteForm } from '@/lib/actions/forms'
import { MaterialListSheet } from '@/components/forms/MaterialListSheet'
import { SignedFormSheet } from '@/components/forms/SignedFormSheet'
import type { Form, FormType } from '@/types'

const FORM_DEFS: { type: FormType; label: string; icon: string }[] = [
  { type: 'material_list', label: 'Material List', icon: '📋' },
  { type: 'permission_to_cut', label: 'Permission to Cut', icon: '✂️' },
  { type: 'safety_waiver', label: 'Safety Waiver', icon: '⚠️' },
]

interface FormsTabProps {
  forms: Form[]
  jobId: string
  customerId: string
  customerPhone: string | null
}

export function FormsTab({ forms: initialForms, jobId, customerId, customerPhone }: FormsTabProps) {
  const [forms, setForms] = useState<Form[]>(initialForms)
  const [openForm, setOpenForm] = useState<Form | null>(null)
  const [, startTransition] = useTransition()
  const { openSheet } = useActionSheet()

  function getForm(type: FormType): Form | null {
    return forms.find(f => f.form_type === type) ?? null
  }

  function handleOpen(type: FormType) {
    const existing = getForm(type)
    if (existing) { setOpenForm(existing); return }
    startTransition(async () => {
      const form = await createOrGetForm(jobId, customerId, type)
      setForms(prev => [...prev, form])
      setOpenForm(form)
    })
  }

  function handleDelete(form: Form) {
    openSheet(form.form_type.replace(/_/g, ' '), [
      {
        label: 'Delete',
        variant: 'destructive' as const,
        action: () => {
          startTransition(async () => {
            await deleteForm(form.id)
            setForms(prev => prev.filter(f => f.id !== form.id))
          })
        },
      },
    ])
  }

  return (
    <div className="p-4 space-y-3">
      {FORM_DEFS.map(({ type, label, icon }) => {
        const form = getForm(type)
        return (
          <FormCard
            key={type}
            icon={icon}
            label={label}
            form={form}
            onOpen={() => handleOpen(type)}
            onLongPress={form ? () => handleDelete(form) : undefined}
          />
        )
      })}

      {openForm?.form_type === 'material_list' && (
        <MaterialListSheet
          form={openForm}
          onClose={() => setOpenForm(null)}
          onSave={(items) =>
            setForms(prev =>
              prev.map(f => f.id === openForm.id ? { ...f, line_items: items } : f)
            )
          }
        />
      )}

      {openForm && openForm.form_type !== 'material_list' && (
        <SignedFormSheet
          form={openForm}
          customerPhone={customerPhone}
          onClose={() => setOpenForm(null)}
          onSigned={(updated) => {
            setForms(prev => prev.map(f => f.id === updated.id ? updated : f))
            setOpenForm(updated)
          }}
        />
      )}
    </div>
  )
}

function FormCard({
  icon,
  label,
  form,
  onOpen,
  onLongPress,
}: {
  icon: string
  label: string
  form: Form | null
  onOpen: () => void
  onLongPress?: () => void
}) {
  const longPress = useLongPress(onLongPress ?? (() => {}))

  const statusText = !form
    ? 'Tap + to create'
    : form.status === 'Approved'
    ? '✅ Signed'
    : 'Draft'

  return (
    <div
      {...longPress}
      onClick={onOpen}
      className="flex items-center justify-between bg-volturaNavy rounded-xl px-4 py-4 cursor-pointer active:opacity-70"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-white font-medium">{label}</p>
          <p className={`text-sm ${form?.status === 'Approved' ? 'text-green-400' : 'text-gray-500'}`}>
            {statusText}
          </p>
        </div>
      </div>
      <span className="text-volturaGold text-xl font-light">+</span>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: errors about `MaterialListSheet` and `SignedFormSheet` not found — those get built in Tasks 7 and 8. Confirm no other errors.

- [ ] **Step 3: Commit**

```bash
git add components/profile/tabs/FormsTab.tsx
git commit -m "feat: implement FormsTab with three form type cards"
```

---

## Task 7: MaterialListSheet

**Files:**
- Create: `components/forms/MaterialListSheet.tsx`

- [ ] **Step 1: Create `components/forms/MaterialListSheet.tsx`**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { saveMaterialList } from '@/lib/actions/forms'
import type { Form } from '@/types'

interface MaterialListSheetProps {
  form: Form
  onClose: () => void
  onSave: (items: { name: string; qty: string }[]) => void
}

export function MaterialListSheet({ form, onClose, onSave }: MaterialListSheetProps) {
  const [items, setItems] = useState<{ name: string; qty: string }[]>(
    (form.line_items as { name: string; qty: string }[] | null) ?? []
  )
  const [, startTransition] = useTransition()

  function persist(next: { name: string; qty: string }[]) {
    startTransition(async () => {
      await saveMaterialList(form.id, next)
      onSave(next)
    })
  }

  function addItem() {
    const next = [...items, { name: '', qty: '' }]
    setItems(next)
    // Don't auto-save empty row — save on blur
  }

  function updateItem(index: number, field: 'name' | 'qty', value: string) {
    const next = items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    setItems(next)
    persist(next)
  }

  function removeItem(index: number) {
    const next = items.filter((_, i) => i !== index)
    setItems(next)
    persist(next)
  }

  return (
    <div className="fixed inset-0 z-50 bg-volturaBlue flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <button onClick={onClose} className="text-volturaGold text-sm font-medium">Done</button>
        <h2 className="text-white font-semibold">📋 Material List</h2>
        <div className="w-12" />
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {items.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-10">
            No items yet. Tap + Add Item to start.
          </p>
        )}
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className="flex-1 bg-volturaNavy text-white rounded-xl px-3 py-3 text-sm outline-none placeholder:text-gray-600"
              placeholder="Item name"
              value={item.name}
              onChange={e => updateItem(i, 'name', e.target.value)}
            />
            <input
              className="w-20 bg-volturaNavy text-white rounded-xl px-3 py-3 text-sm outline-none text-center placeholder:text-gray-600"
              placeholder="Qty"
              value={item.qty}
              onChange={e => updateItem(i, 'qty', e.target.value)}
            />
            <button
              onClick={() => removeItem(i)}
              className="text-gray-500 text-2xl leading-none px-1 hover:text-gray-300"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={addItem}
          className="w-full py-3 rounded-xl border border-volturaGold/40 text-volturaGold text-sm font-medium active:opacity-70"
        >
          + Add Item
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/forms/MaterialListSheet.tsx
git commit -m "feat: add MaterialListSheet for internal material list forms"
```

---

## Task 8: SignedFormSheet + FormSignatureModal

**Files:**
- Create: `components/forms/FormSignatureModal.tsx`
- Create: `components/forms/SignedFormSheet.tsx`

- [ ] **Step 1: Create `components/forms/FormSignatureModal.tsx`**

This is a simplified canvas signature modal — no T&C accordion, no pricing display. Reuses the same canvas API pattern as `InPersonSignature`.

```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { signEstimate } from '@/lib/actions/estimates'

interface FormSignatureModalProps {
  formId: string
  onClose: () => void
  onSigned: () => void
}

export function FormSignatureModal({ formId, onClose, onSigned }: FormSignatureModalProps) {
  const [signerName, setSignerName] = useState('')
  const [hasSig, setHasSig] = useState(false)
  const [signing, setSigning] = useState(false)
  const [done, setDone] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Size canvas once mounted
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      const ctx = canvas.getContext('2d')!
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
  }, [])

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDrawing.current = true
    lastPos.current = getPos(e)
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath()
    ctx.strokeStyle = '#C9A227'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (lastPos.current) {
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
    }
    ctx.stroke()
    lastPos.current = pos
    setHasSig(true)
  }
  function onPointerUp() { isDrawing.current = false; lastPos.current = null }

  function clearSignature() {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    setHasSig(false)
  }

  async function handleSign() {
    if (!hasSig || !signerName.trim() || signing) return
    setSigning(true)
    try {
      const dataUrl = canvasRef.current!.toDataURL('image/png')
      await signEstimate(formId, signerName.trim(), dataUrl)
      setDone(true)
      setTimeout(() => onSigned(), 2000)
    } catch {
      alert('Failed to save signature. Please try again.')
      setSigning(false)
    }
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-[60] bg-volturaBlue flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl mb-4 block">✅</span>
          <p className="text-white text-xl font-semibold">Signed!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] bg-volturaBlue flex flex-col">
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <button onClick={onClose} className="text-gray-400 text-sm">Cancel</button>
        <h2 className="text-white font-semibold">Sign</h2>
        <div className="w-14" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <label className="text-gray-400 text-sm block mb-2">Print Name</label>
          <input
            className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 outline-none placeholder:text-gray-600"
            placeholder="Full name"
            value={signerName}
            onChange={e => setSignerName(e.target.value)}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-gray-400 text-sm">Signature</label>
            {hasSig && (
              <button onClick={clearSignature} className="text-gray-400 text-sm">Clear</button>
            )}
          </div>
          <canvas
            ref={canvasRef}
            className="w-full h-40 bg-volturaNavy rounded-xl touch-none"
            style={{ touchAction: 'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
          {!hasSig && (
            <p className="text-gray-600 text-xs text-center mt-1">Draw signature above</p>
          )}
        </div>
      </div>

      <div className="p-4">
        <button
          onClick={handleSign}
          disabled={!hasSig || !signerName.trim() || signing}
          className="w-full py-4 bg-volturaGold text-volturaBlue font-bold rounded-xl disabled:opacity-40 active:opacity-80"
        >
          {signing ? 'Saving…' : 'Submit Signature'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/forms/SignedFormSheet.tsx`**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { publishForm, sendFormLinkSMS } from '@/lib/actions/forms'
import { FormSignatureModal } from './FormSignatureModal'
import { FORM_TEMPLATES } from '@/lib/form-templates'
import type { Form } from '@/types'

interface SignedFormSheetProps {
  form: Form
  customerPhone: string | null
  onClose: () => void
  onSigned: (updated: Form) => void
}

export function SignedFormSheet({ form, customerPhone, onClose, onSigned }: SignedFormSheetProps) {
  const [showSignModal, setShowSignModal] = useState(false)
  const [linkUrl, setLinkUrl] = useState<string | null>(null)
  const [smsSent, setSmsSent] = useState(false)
  const [copied, setCopied] = useState(false)
  const [, startTransition] = useTransition()

  const template = FORM_TEMPLATES[form.form_type]
  const isSigned = form.status === 'Approved'

  function handleGetLink() {
    startTransition(async () => {
      const url = await publishForm(form.id)
      setLinkUrl(url)
    })
  }

  function handleSendSMS() {
    startTransition(async () => {
      await sendFormLinkSMS(form.id)
      setSmsSent(true)
    })
  }

  async function handleCopyLink() {
    if (!linkUrl) return
    await navigator.clipboard.writeText(linkUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSigned() {
    setShowSignModal(false)
    onSigned({ ...form, status: 'Approved' })
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-volturaBlue flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <button onClick={onClose} className="text-volturaGold text-sm font-medium">Done</button>
          <h2 className="text-white font-semibold">{template?.title}</h2>
          <div className="w-12" />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Boilerplate text */}
          <div className="bg-volturaNavy rounded-xl p-4">
            <p className="text-gray-300 text-sm leading-relaxed">{template?.body}</p>
          </div>

          {isSigned ? (
            <div className="bg-green-900/30 border border-green-700/30 rounded-xl p-4">
              <p className="text-green-400 font-semibold">✅ Signed by {form.signer_name}</p>
              {form.signed_at && (
                <p className="text-gray-400 text-sm mt-1">
                  {new Date(form.signed_at).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric'
                  })}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => setShowSignModal(true)}
                className="w-full py-4 bg-volturaGold text-volturaBlue font-bold rounded-xl active:opacity-80"
              >
                Sign In Person
              </button>

              {!linkUrl ? (
                <button
                  onClick={handleGetLink}
                  className="w-full py-4 border border-volturaGold/40 text-volturaGold rounded-xl active:opacity-70"
                >
                  Send Link
                </button>
              ) : (
                <div className="bg-volturaNavy rounded-xl p-4 space-y-3">
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Share link</p>
                  <button
                    onClick={handleCopyLink}
                    className="w-full text-left text-volturaGold text-xs break-all"
                  >
                    {linkUrl}
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="w-full py-2 border border-volturaGold/30 text-volturaGold rounded-lg text-sm"
                  >
                    {copied ? 'Copied ✓' : 'Copy Link'}
                  </button>
                  {customerPhone && !smsSent && (
                    <button
                      onClick={handleSendSMS}
                      className="w-full py-2 border border-volturaGold/30 text-volturaGold rounded-lg text-sm"
                    >
                      Send SMS to {customerPhone}
                    </button>
                  )}
                  {smsSent && (
                    <p className="text-green-400 text-sm text-center">SMS sent ✓</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showSignModal && (
        <FormSignatureModal
          formId={form.id}
          onClose={() => setShowSignModal(false)}
          onSigned={handleSigned}
        />
      )}
    </>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Start dev server and open a job with the Forms tab**

```bash
npm run dev
```

Navigate to `/jobs/[any-job-id]` → tap the Forms tab icon in the sidebar. Verify:
- Three form cards appear (Material List, Permission to Cut, Safety Waiver)
- Tapping Material List opens `MaterialListSheet`
- Tapping Permission to Cut opens `SignedFormSheet` with the boilerplate text
- "Sign In Person" opens `FormSignatureModal`
- Canvas draws in gold, Submit Signature saves and shows success state

- [ ] **Step 5: Commit**

```bash
git add components/forms/FormSignatureModal.tsx components/forms/SignedFormSheet.tsx
git commit -m "feat: add FormSignatureModal and SignedFormSheet for waiver/permission forms"
```

---

## Task 9: PublicFormView + Public Page Adaptation

**Files:**
- Create: `components/forms/PublicFormView.tsx`
- Modify: `app/estimates/[id]/view/page.tsx`

- [ ] **Step 1: Create `components/forms/PublicFormView.tsx`**

```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { signEstimate } from '@/lib/actions/estimates'
import { FORM_TEMPLATES } from '@/lib/form-templates'
import type { Form } from '@/types'

interface PublicFormViewProps {
  form: Form
  customerName: string
}

export function PublicFormView({ form, customerName }: PublicFormViewProps) {
  const [showSign, setShowSign] = useState(false)
  const [signerName, setSignerName] = useState(customerName)
  const [hasSig, setHasSig] = useState(false)
  const [signing, setSigning] = useState(false)
  const [done, setDone] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  const template = FORM_TEMPLATES[form.form_type]
  const isSigned = form.status === 'Approved'

  // Size canvas when sign section opens
  useEffect(() => {
    if (showSign && canvasRef.current) {
      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      const ctx = canvas.getContext('2d')!
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
  }, [showSign])

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDrawing.current = true
    lastPos.current = getPos(e)
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath()
    ctx.strokeStyle = '#C9A227'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (lastPos.current) {
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
    }
    ctx.stroke()
    lastPos.current = pos
    setHasSig(true)
  }
  function onPointerUp() { isDrawing.current = false; lastPos.current = null }

  function clearSignature() {
    if (!canvasRef.current) return
    canvasRef.current.getContext('2d')!.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    setHasSig(false)
  }

  async function handleSign() {
    if (!hasSig || !signerName.trim() || signing) return
    setSigning(true)
    try {
      const dataUrl = canvasRef.current!.toDataURL('image/png')
      await signEstimate(form.id, signerName.trim(), dataUrl)
      setDone(true)
    } catch {
      alert('Failed to save. Please try again.')
      setSigning(false)
    }
  }

  if (done) {
    return (
      <div className="text-center py-12">
        <span className="text-6xl mb-4 block">✅</span>
        <p className="text-white text-xl font-semibold">Signed!</p>
        <p className="text-gray-400 text-sm mt-2">Thank you, {signerName}.</p>
      </div>
    )
  }

  if (isSigned) {
    return (
      <div className="bg-green-900/30 border border-green-700/30 rounded-xl p-4">
        <p className="text-green-400 font-semibold">✅ Already signed by {form.signer_name}</p>
        {form.signed_at && (
          <p className="text-gray-400 text-sm mt-1">
            {new Date(form.signed_at).toLocaleDateString()}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="bg-volturaNavy rounded-xl p-4">
        <p className="text-gray-300 text-sm leading-relaxed">{template?.body}</p>
      </div>

      {!showSign ? (
        <button
          onClick={() => setShowSign(true)}
          className="w-full py-4 bg-volturaGold text-volturaBlue font-bold rounded-xl active:opacity-80"
        >
          Sign
        </button>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm block mb-2">Print Name</label>
            <input
              className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 outline-none"
              value={signerName}
              onChange={e => setSignerName(e.target.value)}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-gray-400 text-sm">Signature</label>
              {hasSig && (
                <button onClick={clearSignature} className="text-gray-400 text-sm">Clear</button>
              )}
            </div>
            <canvas
              ref={canvasRef}
              className="w-full h-40 bg-volturaNavy rounded-xl touch-none"
              style={{ touchAction: 'none' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            />
            {!hasSig && (
              <p className="text-gray-600 text-xs text-center mt-1">Draw signature above</p>
            )}
          </div>
          <button
            onClick={handleSign}
            disabled={!hasSig || !signerName.trim() || signing}
            className="w-full py-4 bg-volturaGold text-volturaBlue font-bold rounded-xl disabled:opacity-40 active:opacity-80"
          >
            {signing ? 'Saving…' : 'Submit Signature'}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update `app/estimates/[id]/view/page.tsx`**

Add two imports at the top of the file:
```typescript
import { PublicFormView } from '@/components/forms/PublicFormView'
import type { Form } from '@/types'
```

After the `const solo = estimates[0]` line (line 19), add the form branch BEFORE the existing `return` statement:

```typescript
  // Form branch — render form view instead of estimate content
  const formType = (solo as Record<string, unknown>).form_type as string | null
  if (formType) {
    return (
      <div className="min-h-dvh bg-volturaBlue px-4 py-8 max-w-lg mx-auto">
        <header className="mb-8">
          <h1 className="text-volturaGold text-3xl font-bold tracking-widest">VOLTURA</h1>
          <p className="text-gray-400 text-sm">Power Group — Colorado Springs, CO</p>
          <p className="text-gray-400 text-xs mt-1">License #3001608</p>
        </header>
        <div className="bg-volturaNavy rounded-2xl p-5 mb-6">
          <p className="text-gray-400 text-sm mb-1">Document for</p>
          <p className="text-white text-xl font-bold">{customer.name}</p>
        </div>
        <PublicFormView form={solo as unknown as Form} customerName={customer.name} />
      </div>
    )
  }
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: successful build with no errors.

- [ ] **Step 5: End-to-end smoke test**

1. Start dev server: `npm run dev`
2. Open a job → Forms tab → tap Permission to Cut → tap "Send Link"
3. Confirm the form status advances to Sent (check Supabase dashboard)
4. Open the returned URL in an incognito/private browser window
5. Confirm the form boilerplate text is shown (not estimate content)
6. Sign it — confirm status changes to Approved in Supabase and Telegram fires

- [ ] **Step 6: Commit**

```bash
git add components/forms/PublicFormView.tsx app/estimates/[id]/view/page.tsx
git commit -m "feat: add PublicFormView and wire public page form_type branch"
```

- [ ] **Step 7: Push**

```bash
git push
```
