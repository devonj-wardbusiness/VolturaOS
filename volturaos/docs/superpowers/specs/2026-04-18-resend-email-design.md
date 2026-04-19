# Resend Email Integration — Design Spec

**Goal:** Wire Resend to send branded estimate and invoice emails to customers, with a PDF attachment and a link to the public view page.

**Approach:** Follow the existing `lib/telegram.ts` and `lib/sms.ts` patterns — a single `lib/email.ts` module with a graceful no-op if `RESEND_API_KEY` is missing. Two server actions handle data fetching + PDF generation + sending. UI wires into existing surfaces.

---

## What Already Exists (do not rebuild)

- `customer.email: string | null` — DB column, type, and form fields all in place
- `components/pdf/EstimatePDF.tsx` — React PDF component for `@react-pdf/renderer`
- `components/pdf/InvoicePDF.tsx` — React PDF component for `@react-pdf/renderer`
- Public views already live at `/estimates/[id]/view` and `/invoices/[id]/view`
- `components/estimate-builder/SendSheet.tsx` — currently has a `mailto:` hack for email; this gets replaced
- `components/invoices/InvoiceDetail.tsx` — currently has a "Share Invoice" copy-link button; email button added alongside it
- `resend` package already installed in `package.json`

---

## Files Changed

### New
- `lib/email.ts` — core sendEmail function
- `lib/actions/emails.ts` — sendEstimateEmail and sendInvoiceEmail server actions

### Modified
- `components/pdf/EstimatePDF.tsx` — remove `'use client'` directive (line 1); component uses only `@react-pdf/renderer` primitives, no browser APIs — safe to run server-side
- `components/pdf/InvoicePDF.tsx` — remove `'use client'` directive (line 1); same reasoning
- `components/estimate-builder/SendSheet.tsx` — replace `mailto:` with real email action; add `customerEmail: string | null` prop
- `components/estimate-builder/EstimateBuilder.tsx` — add `initialCustomerEmail?: string | null` prop; pass to `SendSheet`
- `components/invoices/InvoiceDetail.tsx` — add Email Invoice button; add `email: string | null` to customer shape in props
- `lib/actions/invoices.ts` — update `getInvoiceById` to select `email` from customers and update return type
- `lib/actions/estimates.ts` — update `getEstimateById` to select `email` from customers and update return type
- `app/(app)/estimates/[id]/page.tsx` — pass `initialCustomerEmail={estimate.customer.email}` to `EstimateBuilder`

### Env vars required
```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=estimates@volturapower.energy   # or noreply@volturapower.energy
```

---

## lib/email.ts

Single exported function, graceful no-op if env var missing. Follows telegram.ts pattern exactly.

```ts
// Server-only — never import from client components

import { Resend } from 'resend'

interface EmailOptions {
  to: string
  subject: string
  html: string
  attachments?: {
    filename: string
    content: Buffer
  }[]
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL ?? 'Voltura Power Group <noreply@volturapower.energy>'
  if (!apiKey) return // graceful no-op until configured

  const resend = new Resend(apiKey)
  try {
    await resend.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    })
  } catch {
    console.warn('[Email] Failed to send email')
    // non-critical — never throw
  }
}
```

---

## lib/actions/emails.ts

Two server actions. Each fetches data, generates PDF via `renderToBuffer`, builds HTML, sends via `sendEmail`.

```ts
'use server'

import { renderToBuffer } from '@react-pdf/renderer'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { EstimatePDF } from '@/components/pdf/EstimatePDF'
import { InvoicePDF } from '@/components/pdf/InvoicePDF'
import type { LineItem, Addon } from '@/types'
import React from 'react'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://volturaos.vercel.app'

export async function sendEstimateEmail(estimateId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { data: estimate } = await supabase
    .from('estimates')
    .select('*, customer:customers(name, phone, address, email)')
    .eq('id', estimateId)
    .single()

  if (!estimate) return { ok: false, error: 'Estimate not found' }
  if (!estimate.customer?.email) return { ok: false, error: 'Customer has no email address' }

  const lineItems = (estimate.line_items ?? []) as LineItem[]
  const addons = (estimate.addons ?? []) as Addon[]
  const total = estimate.total ?? 0
  const viewUrl = `${BASE_URL}/estimates/${estimateId}/view`
  const customerFirstName = estimate.customer.name.split(' ')[0]

  // Generate PDF server-side
  // EstimatePDFProps: estimateId, customerName, customerPhone?, customerAddress?, lineItems, addons?, total, notes?, createdAt
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderToBuffer(
      React.createElement(EstimatePDF, {
        estimateId,
        customerName: estimate.customer.name,
        customerPhone: estimate.customer.phone ?? null,
        customerAddress: estimate.customer.address ?? null,
        lineItems,
        addons,
        total,
        notes: estimate.notes ?? null,
        createdAt: estimate.created_at,
      })
    )
  } catch {
    return { ok: false, error: 'PDF generation failed' }
  }

  const html = buildEstimateEmailHtml({
    customerName: estimate.customer.name,
    customerFirstName,
    estimateName: estimate.name ?? 'Estimate',
    total,
    viewUrl,
  })

  await sendEmail({
    to: estimate.customer.email,
    subject: `Your Estimate from Voltura Power Group — $${total.toLocaleString()}`,
    html,
    attachments: [{ filename: `Voltura-Estimate-${estimateId.slice(0, 8)}.pdf`, content: pdfBuffer }],
  })

  return { ok: true }
}

export async function sendInvoiceEmail(invoiceId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, customer:customers(name, phone, address, email), payments:invoice_payments(*)')
    .eq('id', invoiceId)
    .single()

  if (!invoice) return { ok: false, error: 'Invoice not found' }
  if (!invoice.customer?.email) return { ok: false, error: 'Customer has no email address' }

  const lineItems = (invoice.line_items ?? []) as LineItem[]
  const total = invoice.total ?? 0
  const balance = invoice.balance ?? total
  const amountPaid = invoice.amount_paid ?? 0
  const viewUrl = `${BASE_URL}/invoices/${invoiceId}/view`
  const customerFirstName = invoice.customer.name.split(' ')[0]

  // InvoicePDFProps: invoiceId, customerName, customerPhone?, customerAddress?, lineItems,
  //   total, amountPaid, balance, status, payments, notes?, createdAt, dueDate?, permitNumber?
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderToBuffer(
      React.createElement(InvoicePDF, {
        invoiceId,
        customerName: invoice.customer.name,
        customerPhone: invoice.customer.phone ?? null,
        customerAddress: invoice.customer.address ?? null,
        lineItems,
        total,
        amountPaid,
        balance,
        status: invoice.status,
        payments: invoice.payments ?? [],
        notes: invoice.notes ?? null,
        createdAt: invoice.created_at,
        dueDate: invoice.due_date ?? null,
      })
    )
  } catch {
    return { ok: false, error: 'PDF generation failed' }
  }

  const html = buildInvoiceEmailHtml({
    customerFirstName,
    customerName: invoice.customer.name,
    total,
    balance,
    viewUrl,
  })

  await sendEmail({
    to: invoice.customer.email,
    subject: `Invoice from Voltura Power Group — $${total.toLocaleString()}`,
    html,
    attachments: [{ filename: `Voltura-Invoice-${invoiceId.slice(0, 8)}.pdf`, content: pdfBuffer }],
  })

  return { ok: true }
}
```

### HTML email templates

Inline-styled for email client compatibility. Voltura brand colors (navy background, gold accent, white text).

```ts
function buildEstimateEmailHtml(opts: {
  customerName: string
  customerFirstName: string
  estimateName: string
  total: number
  viewUrl: string
}): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f1623;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="color:#f5c842;font-size:24px;margin:0 0 4px;">VOLTURA</h1>
    <p style="color:#6b7280;font-size:13px;margin:0 0 32px;">Power Group — Colorado Springs, CO · License #3001608</p>

    <p style="color:#ffffff;font-size:16px;margin:0 0 8px;">Hi ${opts.customerFirstName},</p>
    <p style="color:#9ca3af;font-size:14px;margin:0 0 24px;">
      Your estimate is ready. Review the full scope and pricing below.
    </p>

    <div style="background:#1a2540;border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="color:#6b7280;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Estimate</p>
      <p style="color:#ffffff;font-size:18px;font-weight:bold;margin:0 0 16px;">${opts.estimateName}</p>
      <p style="color:#6b7280;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Total</p>
      <p style="color:#f5c842;font-size:32px;font-weight:bold;margin:0;">$${opts.total.toLocaleString()}</p>
    </div>

    <a href="${opts.viewUrl}"
       style="display:block;background:#f5c842;color:#0f1623;font-weight:bold;font-size:15px;text-align:center;padding:14px 24px;border-radius:12px;text-decoration:none;margin-bottom:24px;">
      View &amp; Compare Estimates →
    </a>

    <p style="color:#6b7280;font-size:12px;margin:0 0 4px;">A PDF copy is attached to this email for your records.</p>
    <p style="color:#6b7280;font-size:12px;margin:0;">Questions? Call or text (719) 659-9300.</p>

    <hr style="border:none;border-top:1px solid #1f2937;margin:32px 0;" />
    <p style="color:#374151;font-size:11px;margin:0;">Voltura Power Group · volturapower.energy</p>
  </div>
</body>
</html>`
}

function buildInvoiceEmailHtml(opts: {
  customerFirstName: string
  customerName: string
  total: number
  balance: number
  viewUrl: string
}): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f1623;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="color:#f5c842;font-size:24px;margin:0 0 4px;">VOLTURA</h1>
    <p style="color:#6b7280;font-size:13px;margin:0 0 32px;">Power Group — Colorado Springs, CO · License #3001608</p>

    <p style="color:#ffffff;font-size:16px;margin:0 0 8px;">Hi ${opts.customerFirstName},</p>
    <p style="color:#9ca3af;font-size:14px;margin:0 0 24px;">
      Here is your invoice from Voltura Power Group.
    </p>

    <div style="background:#1a2540;border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="color:#6b7280;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Invoice Total</p>
      <p style="color:#f5c842;font-size:32px;font-weight:bold;margin:0 0 16px;">$${opts.total.toLocaleString()}</p>
      ${opts.balance < opts.total ? `
      <p style="color:#6b7280;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Balance Due</p>
      <p style="color:#f87171;font-size:20px;font-weight:bold;margin:0;">$${opts.balance.toLocaleString()}</p>
      ` : ''}
    </div>

    <a href="${opts.viewUrl}"
       style="display:block;background:#f5c842;color:#0f1623;font-weight:bold;font-size:15px;text-align:center;padding:14px 24px;border-radius:12px;text-decoration:none;margin-bottom:24px;">
      View Invoice →
    </a>

    <p style="color:#6b7280;font-size:12px;margin:0 0 4px;">A PDF copy is attached to this email for your records.</p>
    <p style="color:#6b7280;font-size:12px;margin:0;">Questions? Call or text (719) 659-9300.</p>

    <hr style="border:none;border-top:1px solid #1f2937;margin:32px 0;" />
    <p style="color:#374151;font-size:11px;margin:0;">Voltura Power Group · volturapower.energy</p>
  </div>
</body>
</html>`
}
```

---

## SendSheet.tsx — Replace mailto: with real email

The existing "Send Email" button opens `mailto:` on the device. Replace it with a button that calls `sendEstimateEmail` as a server action.

**Current behavior (lines ~49–57):** Opens `mailto:` URI on the client — relies on user's email client. No deliverability guarantee.

**New behavior:**
- Button calls `sendEstimateEmail(estimateId)` (server action)
- Shows loading state while sending
- Shows success or error feedback
- If customer has no email: button is greyed out with text "No email on file"

**Prop changes required — full chain:**

`SendSheet` is rendered directly inside `EstimateBuilder.tsx` (not via `EstimateBottomBar` — `EstimateBottomBar`'s `onSend` just calls `setSendOpen(true)` in the parent). The email must flow down this chain:

1. **`getEstimateById`** (`lib/actions/estimates.ts`) — currently returns `customer: { name, phone, id }`. Add `email: string | null` to the select and return type.
2. **`app/(app)/estimates/[id]/page.tsx`** — add `initialCustomerEmail={estimate.customer.email}` to the `EstimateBuilder` component call.
3. **`EstimateBuilderProps`** (`components/estimate-builder/EstimateBuilder.tsx`) — add `initialCustomerEmail?: string | null`.
4. **`SendSheetProps`** (`components/estimate-builder/SendSheet.tsx`) — add `customerEmail: string | null`; pass `initialCustomerEmail ?? null` from EstimateBuilder.

New state needed in SendSheet:
```ts
const [emailPending, setEmailPending] = useState(false)
const [emailResult, setEmailResult] = useState<'sent' | 'no-email' | 'error' | null>(null)
```

---

## InvoiceDetail.tsx — Add Email Invoice button

Add alongside the existing "Share Invoice" copy-link button.

**New button:**
```tsx
<button
  onClick={handleEmailInvoice}
  disabled={emailPending || !invoice.customer.email}
  className="w-full bg-volturaNavy border border-volturaGold/30 text-volturaGold font-semibold py-3 rounded-xl text-sm disabled:opacity-50"
>
  {emailPending ? 'Sending…' : emailResult === 'sent' ? '✓ Email Sent' : '📧 Email Invoice'}
</button>
{!invoice.customer.email && (
  <p className="text-gray-600 text-xs text-center -mt-1">No email — add one in customer profile</p>
)}
```

**Data change required:** `getInvoiceById` currently selects `customers(name, phone, address)` — it must be updated to also select `email`:

```ts
// lib/actions/invoices.ts — update the select query
.select('*, customers(name, phone, address, email), invoice_payments(*), jobs(permit_number)')

// Update the return type:
export async function getInvoiceById(id: string): Promise<Invoice & {
  customer: { name: string; phone: string | null; address: string | null; email: string | null }
  payments: InvoicePayment[]
  permitNumber: string | null
}>

// Update InvoiceDetailProps to match:
interface InvoiceDetailProps {
  invoice: Invoice & {
    customer: { name: string; phone: string | null; address: string | null; email: string | null }
    payments: InvoicePayment[]
    permitNumber?: string | null
  }
}
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Customer has no email | Return `{ ok: false, error: 'Customer has no email address' }` — UI shows disabled button with message |
| `RESEND_API_KEY` not set | `sendEmail()` no-ops silently — useful for local dev |
| Resend API error | Caught in `sendEmail()`, `console.warn`, never throws — server action returns `{ ok: false }` |
| PDF render fails | `renderToBuffer` throws — caught in server action, returns `{ ok: false, error: 'PDF generation failed' }` |
| Estimate/invoice not found | Return `{ ok: false, error: '...' }` — UI shows error message |

---

## PDF Components — Server-Side Compatibility

`@react-pdf/renderer` supports both client and server environments. `renderToBuffer()` is the server-side API — it takes a React element (not JSX, so `React.createElement()` is used) and returns a `Promise<Buffer>`.

**Required:** Remove `'use client'` from the top of both `EstimatePDF.tsx` and `InvoicePDF.tsx`. Both files currently have this directive on line 1. When `lib/actions/emails.ts` (a server action) imports these components, Next.js will refuse to import a `'use client'` module in a server context and the build will fail.

Both components use only `@react-pdf/renderer` primitives (`View`, `Text`, `Document`, `Page`, `StyleSheet`) — no `window`, no `navigator`, no browser-only APIs. Removing `'use client'` is safe. The existing `EstimateDownloadButton` and `InvoiceDownloadButton` will continue to work — they render the PDF components inside a `dynamic()` import with `ssr: false`, which already handles the client boundary correctly.

**After implementing:** Run `npx tsc --noEmit` and manually test the PDF download buttons in the browser to confirm client-side rendering is unaffected.

---

## What This Does NOT Change

- Customer creation/edit forms — email field already exists
- Public estimate and invoice view pages — no changes
- SMS sending — unchanged, runs in parallel
- Telegram notifications — unchanged
- PDF download buttons in the app — unchanged (still client-side)
- Any pricebook, job, or settings pages
