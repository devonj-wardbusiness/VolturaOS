# EstimateBuilder Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Break `EstimateBuilder.tsx` (685 lines) into three focused files — a custom hook, a bottom bar component, and a slimmed orchestrator — without changing any visible behavior.

**Architecture:** Extract all 27 state variables + callbacks into `useEstimateEditor` hook. Extract the fixed bottom action bar into `EstimateBottomBar` component. `EstimateBuilder` becomes ~300 lines of pure layout/modal orchestration. Zero behavior changes.

**Tech Stack:** Next.js 15 App Router, TypeScript, React hooks (`useState`, `useCallback`, `useMemo`), Tailwind CSS v4.

---

## File Map

| File | Action | Lines Before → After |
|------|--------|----------------------|
| `components/estimate-builder/EstimateBuilder.BACKUP.tsx` | Create (copy) | 685 → 685 |
| `components/estimate-builder/useEstimateEditor.ts` | Create | 0 → ~260 |
| `components/estimate-builder/EstimateBottomBar.tsx` | Create | 0 → ~130 |
| `components/estimate-builder/EstimateBuilder.tsx` | Modify | 685 → ~300 |

---

## Task 1: Backup + verify clean git state

**Files:**
- Create: `components/estimate-builder/EstimateBuilder.BACKUP.tsx`

- [ ] **Step 1: Verify git is clean**

```bash
cd C:/Users/Devon/VolturaOS/volturaos
git status
```

Expected: `nothing to commit, working tree clean` (or only untracked docs files). If there are uncommitted changes to any `.tsx`/`.ts` files, stop and commit them first.

- [ ] **Step 2: Copy EstimateBuilder to backup**

```bash
cp components/estimate-builder/EstimateBuilder.tsx components/estimate-builder/EstimateBuilder.BACKUP.tsx
```

- [ ] **Step 3: Commit the backup**

```bash
git add components/estimate-builder/EstimateBuilder.BACKUP.tsx
git commit -m "chore: backup EstimateBuilder before refactor"
```

Expected: 1 file changed, 685 insertions(+).

---

## Task 2: Create `useEstimateEditor` hook

**Files:**
- Create: `components/estimate-builder/useEstimateEditor.ts`

- [ ] **Step 1: Create the hook file with complete implementation**

Write the entire file `components/estimate-builder/useEstimateEditor.ts`:

```typescript
import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { PricebookEntry, LineItem, Addon } from '@/types'
import { DEFAULT_ADDONS } from '@/types'
import { calculateTotal } from './LiveTotal'
import { saveEstimate, duplicateEstimate, deleteEstimate, saveAsTemplate } from '@/lib/actions/estimates'
import { createInvoiceFromEstimate } from '@/lib/actions/invoices'

interface UseEstimateEditorOptions {
  estimateId: string
  pricebook: PricebookEntry[]
  proposalCount: number
  initialCustomerId?: string
  initialCustomerName?: string
  initialEstimate?: {
    name: string
    status?: string
    line_items: LineItem[] | null
    addons: Addon[] | null
    notes: string | null
    includes_permit: boolean
    includes_cleanup: boolean
    includes_warranty: boolean
    follow_up_days?: number
  }
}

export function useEstimateEditor({
  estimateId,
  pricebook,
  proposalCount,
  initialCustomerId,
  initialCustomerName,
  initialEstimate,
}: UseEstimateEditorOptions) {
  const router = useRouter()

  // Customer
  const [customerId, setCustomerId] = useState<string | null>(initialCustomerId ?? null)
  const [customerName, setCustomerName] = useState<string | null>(initialCustomerName ?? null)

  // Estimate metadata
  const [estimateName, setEstimateName] = useState(initialEstimate?.name ?? 'Estimate')
  const [primaryJobType, setPrimaryJobType] = useState<string | null>(null)
  const [primarySkipped, setPrimarySkipped] = useState(
    () => (initialEstimate?.line_items ?? []).length > 0
  )
  const [followUpDays, setFollowUpDays] = useState(initialEstimate?.follow_up_days ?? 3)

  // Items
  const [lineItems, setLineItems] = useState<LineItem[]>(
    () => initialEstimate?.line_items ?? []
  )
  const [addons, setAddons] = useState<Addon[]>(
    initialEstimate?.addons ?? DEFAULT_ADDONS.map((a) => ({ ...a, selected: false }))
  )
  const [customItems, setCustomItems] = useState<LineItem[]>([])
  const [notes, setNotes] = useState(initialEstimate?.notes ?? '')

  // Badge toggles
  const [includesPermit, setIncludesPermit] = useState(initialEstimate?.includes_permit ?? false)
  const [includesCleanup, setIncludesCleanup] = useState(initialEstimate?.includes_cleanup ?? true)
  const [includesWarranty, setIncludesWarranty] = useState(initialEstimate?.includes_warranty ?? true)

  // Action states
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [invoicing, setInvoicing] = useState(false)

  // Template modal state
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [templateDraftName, setTemplateDraftName] = useState('')
  const [templateSaving, setTemplateSaving] = useState(false)

  // Derived values
  const allLineItems = useMemo(() => [...lineItems, ...customItems], [lineItems, customItems])
  const total = useMemo(
    () => calculateTotal([], lineItems, addons, customItems),
    [lineItems, addons, customItems]
  )
  const positiveSubtotal = useMemo(
    () => calculateTotal([], lineItems, addons, customItems.filter((i) => i.price > 0)),
    [lineItems, addons, customItems]
  )
  const hasItems = useMemo(() => allLineItems.length > 0, [allLineItems])

  // Item callbacks
  const handlePrimaryJobSelect = useCallback((jobType: string) => {
    setPrimaryJobType(jobType || null)
    setPrimarySkipped(true)
    const entry = pricebook.find((p) => p.job_type === jobType)
    if (!entry) return
    const price = entry.price_better ?? entry.price_good ?? 0
    setLineItems((prev) => [
      { description: entry.job_type, price, is_override: false, original_price: price, category: entry.category },
      ...prev,
    ])
  }, [pricebook])

  const handleQuickAdd = useCallback((items: LineItem[]) => {
    setLineItems((prev) => [...prev, ...items])
  }, [])

  const handleAddItem = useCallback((entry: PricebookEntry) => {
    const price = entry.price_better ?? entry.price_good ?? 0
    setLineItems((prev) => [...prev, {
      description: entry.job_type,
      price,
      is_override: false,
      original_price: price,
      category: entry.category,
      footage: entry.is_footage_item ? null : undefined,
    }])
  }, [])

  const handleFootageChange = useCallback((index: number, footage: number | null, price: number) => {
    setLineItems((prev) => prev.map((item, i) =>
      i === index ? { ...item, footage, price, is_override: footage !== null } : item
    ))
  }, [])

  const handleRemoveItem = useCallback((index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handlePriceUpdate = useCallback((index: number, price: number) => {
    setLineItems((prev) => prev.map((item, i) =>
      i === index
        ? { ...item, price, is_override: true, original_price: item.original_price ?? item.price }
        : item
    ))
  }, [])

  const handleAddSuggestion = useCallback((name: string, price: number) => {
    setCustomItems((prev) => [
      ...prev,
      { description: name, price, is_override: false, original_price: price },
    ])
  }, [])

  const handleAddonToggle = useCallback((index: number) => {
    setAddons((prev) => prev.map((a, i) => i === index ? { ...a, selected: !a.selected } : a))
  }, [])

  const handleAddonPriceChange = useCallback((index: number, price: number) => {
    setAddons((prev) => prev.map((a, i) => i === index ? { ...a, price } : a))
  }, [])

  const addCustomItem = useCallback(() => {
    setCustomItems((prev) => [
      ...prev,
      { description: 'Custom item', price: 0, is_override: false, original_price: null },
    ])
  }, [])

  const updateCustomItem = useCallback((index: number, updates: Partial<LineItem>) => {
    setCustomItems((prev) => prev.map((item, i) => i === index ? { ...item, ...updates } : item))
  }, [])

  const removeCustomItem = useCallback((index: number) => {
    setCustomItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const addDiscount = useCallback((description: string, amount: number) => {
    setCustomItems((prev) => [
      ...prev,
      { description, price: amount, is_override: false, original_price: null },
    ])
  }, [])

  // Internal helper — shared by handleSave and handleDuplicate
  const _persist = useCallback(async (currentTotal: number, currentItems: LineItem[]) => {
    await saveEstimate(estimateId, {
      name: estimateName,
      lineItems: currentItems,
      addons,
      subtotal: currentTotal,
      total: currentTotal,
      notes,
      includesPermit,
      includesCleanup,
      includesWarranty,
      followUpDays,
    })
  }, [estimateId, estimateName, addons, notes, includesPermit, includesCleanup, includesWarranty, followUpDays])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await _persist(total, allLineItems)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }, [_persist, total, allLineItems])

  const handleDuplicate = useCallback(async () => {
    if (duplicating || proposalCount >= 3) return
    setDuplicating(true)
    try {
      await _persist(total, allLineItems)
      const newEst = await duplicateEstimate(estimateId)
      router.push(`/estimates/${newEst.id}`)
    } catch (e) {
      alert((e as Error).message)
      setDuplicating(false)
    }
  }, [duplicating, proposalCount, _persist, total, allLineItems, estimateId, router])

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Delete this estimate? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteEstimate(estimateId)
      router.push('/estimates')
    } catch {
      alert('Failed to delete estimate.')
      setDeleting(false)
    }
  }, [estimateId, router])

  const handleCreateInvoice = useCallback(async () => {
    if (invoicing) return
    setInvoicing(true)
    try {
      const inv = await createInvoiceFromEstimate(estimateId)
      router.push(`/invoices/${inv.id}`)
    } catch {
      alert('Failed to create invoice. Please try again.')
    } finally {
      setInvoicing(false)
    }
  }, [invoicing, estimateId, router])

  const handleSaveAsTemplate = useCallback(() => {
    setTemplateDraftName(estimateName || 'My Template')
    setTemplateModalOpen(true)
  }, [estimateName])

  const handleConfirmSaveTemplate = useCallback(async () => {
    if (!templateDraftName.trim()) return
    setTemplateSaving(true)
    try {
      await saveAsTemplate(estimateId, templateDraftName.trim())
      setTemplateModalOpen(false)
    } catch {
      // silently fail — modal stays open
    } finally {
      setTemplateSaving(false)
    }
  }, [estimateId, templateDraftName])

  return {
    // Customer
    customerId, setCustomerId,
    customerName, setCustomerName,
    // Estimate metadata
    estimateName, setEstimateName,
    primaryJobType, setPrimaryJobType,
    primarySkipped, setPrimarySkipped,
    followUpDays, setFollowUpDays,
    // Items
    lineItems, addons, customItems,
    notes, setNotes,
    // Item callbacks
    handlePrimaryJobSelect,
    handleAddItem, handleQuickAdd,
    handleRemoveItem, handlePriceUpdate, handleFootageChange,
    handleAddonToggle, handleAddonPriceChange,
    addCustomItem, updateCustomItem, removeCustomItem,
    addDiscount, handleAddSuggestion,
    // Badge toggles
    includesPermit, setIncludesPermit,
    includesCleanup, setIncludesCleanup,
    includesWarranty, setIncludesWarranty,
    // Derived
    allLineItems, total, positiveSubtotal, hasItems,
    // Action states + handlers
    saving, saved, handleSave,
    duplicating, handleDuplicate,
    deleting, handleDelete,
    invoicing, handleCreateInvoice,
    // Template
    templateModalOpen, setTemplateModalOpen,
    templateDraftName, setTemplateDraftName,
    templateSaving,
    handleSaveAsTemplate, handleConfirmSaveTemplate,
  }
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd C:/Users/Devon/VolturaOS/volturaos
npx tsc --noEmit 2>&1 | head -40
```

Expected: The hook file itself should produce zero errors (it won't be imported yet so may not appear in output at all). Any errors will be in the existing codebase — ignore those if they existed before this task.

---

## Task 3: Create `EstimateBottomBar` component

**Files:**
- Create: `components/estimate-builder/EstimateBottomBar.tsx`

- [ ] **Step 1: Create the bottom bar component**

Write the entire file `components/estimate-builder/EstimateBottomBar.tsx`:

```typescript
'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { LineItem, Addon } from '@/types'
import { LiveTotal } from './LiveTotal'
import { SavingsCalculator } from '@/components/estimates/SavingsCalculator'
import { PhotoEstimate } from './PhotoEstimate'
import { MaterialList } from '@/components/estimates/MaterialList'

const EstimateDownloadButton = dynamic(
  () => import('@/components/pdf/EstimateDownloadButton').then((m) => m.EstimateDownloadButton),
  { ssr: false, loading: () => null }
)

interface EstimateBottomBarProps {
  total: number
  hasItems: boolean
  lineItems: LineItem[]
  addons: Addon[]
  customItems: LineItem[]
  status?: string
  estimateId: string
  customerName: string
  estimateCreatedAt?: string
  linkedInvoiceId?: string | null
  signedAt?: string | null
  signerName?: string | null
  saving: boolean
  saved: boolean
  invoicing: boolean
  notes: string
  onAddPhotoItems: (items: { description: string; price: number }[]) => void
  onSave: () => void
  onPresent: () => void
  onSign: () => void
  onSend: () => void
  onCreateInvoice: () => void
  onViewInvoice: () => void
}

export function EstimateBottomBar({
  total,
  hasItems,
  lineItems,
  addons,
  customItems,
  status,
  estimateId,
  customerName,
  estimateCreatedAt,
  linkedInvoiceId,
  signedAt,
  signerName,
  saving,
  saved,
  invoicing,
  notes,
  onAddPhotoItems,
  onSave,
  onPresent,
  onSign,
  onSend,
  onCreateInvoice,
  onViewInvoice,
}: EstimateBottomBarProps) {
  // Margin calculator — local UI state only, never persisted
  const [myCost, setMyCost] = useState('')
  const [showMargin, setShowMargin] = useState(false)

  const allLineItems = [...lineItems, ...customItems]

  return (
    <div className="fixed bottom-16 left-0 right-0 bg-volturaBlue border-t border-volturaNavy z-30 px-4 py-3">
      {/* Margin calculator */}
      {showMargin ? (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-gray-400 text-xs">My cost $</span>
          <input
            type="number"
            min={0}
            value={myCost}
            onChange={e => setMyCost(e.target.value)}
            placeholder="0"
            className="w-24 bg-volturaNavy text-white rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-volturaGold/50"
          />
          {myCost && Number(myCost) > 0 && total > 0 && (
            <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
              ((total - Number(myCost)) / total) >= 0.35
                ? 'text-green-400 bg-green-900/30'
                : ((total - Number(myCost)) / total) >= 0.20
                ? 'text-yellow-400 bg-yellow-900/20'
                : 'text-red-400 bg-red-900/20'
            }`}>
              {Math.round(((total - Number(myCost)) / total) * 100)}% margin
            </span>
          )}
          <button onClick={() => setShowMargin(false)} className="ml-auto text-gray-500 text-xs">Done</button>
        </div>
      ) : (
        <button onClick={() => setShowMargin(true)} className="text-gray-500 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
          <span>📊</span> Margin
        </button>
      )}

      {/* Total + icon buttons */}
      <div className="flex items-center justify-between mb-1">
        <LiveTotal primaryItems={[]} additionalItems={lineItems} addons={addons} customItems={customItems} />
        <div className="flex items-center gap-0.5">
          <SavingsCalculator lineItems={lineItems} addons={addons} />
          <PhotoEstimate onAddItems={onAddPhotoItems} />
          <MaterialList lineItems={lineItems} />
        </div>
      </div>

      {/* Signed badge */}
      {signedAt && (
        <div className="flex items-center gap-2 bg-green-900/30 border border-green-500/30 rounded-xl px-4 py-2 mb-2">
          <span className="text-green-400 text-sm">✍️ Signed</span>
          {signerName && (
            <span className="text-green-300 text-sm font-semibold">{signerName}</span>
          )}
          <span className="text-green-600 text-xs ml-auto">
            {new Date(signedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      )}

      {/* Primary action buttons */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={onSave}
          disabled={saving || !hasItems}
          className="flex-1 bg-volturaNavy text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50"
        >
          {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Draft'}
        </button>
        <button
          onClick={onPresent}
          disabled={!hasItems}
          className="flex-1 bg-white/10 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 border border-white/20"
        >
          Present
        </button>
        {!signedAt && hasItems ? (
          <button
            onClick={() => { onSave(); onSign() }}
            disabled={!hasItems}
            className="flex-1 bg-volturaGold text-volturaBlue py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
          >
            ✍️ Sign
          </button>
        ) : (
          <button
            onClick={() => { onSave(); onSend() }}
            disabled={!hasItems}
            className="flex-1 bg-volturaGold text-volturaBlue py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
          >
            Send
          </button>
        )}
      </div>

      {/* Invoice buttons */}
      {status === 'Approved' && (
        linkedInvoiceId ? (
          <button
            onClick={onViewInvoice}
            className="w-full bg-green-700 text-white font-bold py-3 rounded-xl mt-2"
          >
            View Invoice
          </button>
        ) : (
          <button
            onClick={onCreateInvoice}
            disabled={invoicing}
            className="w-full bg-green-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 mt-2"
          >
            {invoicing ? 'Creating...' : '💰 Create Invoice'}
          </button>
        )
      )}

      {/* PDF download */}
      {hasItems && estimateCreatedAt && (
        <div className="mt-2">
          <EstimateDownloadButton
            estimateId={estimateId}
            customerName={customerName}
            lineItems={allLineItems}
            addons={addons}
            total={total}
            notes={notes}
            createdAt={estimateCreatedAt}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd C:/Users/Devon/VolturaOS/volturaos
npx tsc --noEmit 2>&1 | head -40
```

Expected: Zero new errors introduced by the new file.

---

## Task 4: Replace `EstimateBuilder.tsx` with slimmed version

**Files:**
- Modify: `components/estimate-builder/EstimateBuilder.tsx`

- [ ] **Step 1: Overwrite EstimateBuilder.tsx with the slimmed version**

Replace the entire contents of `components/estimate-builder/EstimateBuilder.tsx` with:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PricebookEntry, LineItem, Addon, AIPageContext, Estimate } from '@/types'
import { CustomerSelector } from './CustomerSelector'
import { PresentMode } from '@/components/estimates/PresentMode'
import { SuggestedItems } from './SuggestedItems'
import { PrimaryJobSelector } from './PrimaryJobSelector'
import { CategoryGrid } from './CategoryGrid'
import { LineItemList } from './LineItemList'
import { AddOnsPanel } from './AddOnsPanel'
import { CustomLineItems } from './CustomLineItems'
import { SendSheet } from './SendSheet'
import { AIContextProvider } from './AIContextProvider'
import { dismissFollowUp } from '@/lib/actions/estimates'
import { QuickAddSheet } from './QuickAddSheet'
import { InPersonSignature } from '@/components/estimates/InPersonSignature'
import { DiscountsSection } from './DiscountsSection'
import { useEstimateEditor } from './useEstimateEditor'
import { EstimateBottomBar } from './EstimateBottomBar'

interface EstimateBuilderProps {
  estimateId: string
  pricebook: PricebookEntry[]
  initialRecents: PricebookEntry[]
  initialCustomerId?: string
  initialCustomerName?: string
  initialCustomerPhone?: string | null
  estimateCreatedAt?: string
  proposalCount: number
  proposalEstimates: Estimate[]
  linkedInvoiceId?: string | null
  initialEstimate?: {
    name: string
    status?: string
    line_items: LineItem[] | null
    addons: Addon[] | null
    notes: string | null
    includes_permit: boolean
    includes_cleanup: boolean
    includes_warranty: boolean
    follow_up_days?: number
    follow_up_sent_at?: string | null
    follow_up_dismissed?: boolean
    signed_at?: string | null
    signer_name?: string | null
  }
}

export function EstimateBuilder({
  estimateId,
  pricebook,
  initialRecents,
  initialCustomerId,
  initialCustomerName,
  initialCustomerPhone,
  estimateCreatedAt,
  proposalCount,
  proposalEstimates,
  linkedInvoiceId,
  initialEstimate,
}: EstimateBuilderProps) {
  const router = useRouter()

  const editor = useEstimateEditor({
    estimateId,
    pricebook,
    proposalCount,
    initialCustomerId,
    initialCustomerName,
    initialEstimate,
  })

  // Modal open/close states — UI only, stay in EstimateBuilder
  const [presenting, setPresenting] = useState(false)
  const [signingInPerson, setSigningInPerson] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [qaOpen, setQaOpen] = useState(false)

  const aiContext: AIPageContext = {
    mode: 'estimate',
    jobType: editor.primaryJobType ?? undefined,
    currentLineItems: editor.allLineItems,
  }

  return (
    <AIContextProvider context={aiContext}>
      <div className="px-4 pt-4 pb-40 space-y-6">

        {/* Estimate name + duplicate + delete */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={editor.estimateName}
              onChange={(e) => editor.setEstimateName(e.target.value)}
              onBlur={() => { if (!editor.estimateName.trim()) editor.setEstimateName('Estimate') }}
              maxLength={100}
              placeholder="Name this estimate…"
              className="bg-transparent text-white font-semibold text-lg w-full focus:outline-none placeholder:text-gray-600"
            />
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-500 text-xs">Follow up in</span>
              <input
                type="number"
                min={1}
                max={30}
                value={editor.followUpDays}
                onChange={e => editor.setFollowUpDays(Number(e.target.value))}
                className="w-12 bg-volturaNavy text-white text-xs rounded px-2 py-1 text-center"
              />
              <span className="text-gray-500 text-xs">days</span>
            </div>
          </div>
          <button
            onClick={editor.handleSaveAsTemplate}
            title="Save as template"
            className="text-gray-500 hover:text-volturaGold text-lg px-2 flex-shrink-0"
          >
            🔖
          </button>
          <button
            onClick={editor.handleDuplicate}
            disabled={editor.duplicating || proposalCount >= 3 || editor.saving}
            title={proposalCount >= 3 ? 'Max 3 per proposal' : 'Duplicate this estimate'}
            className="text-volturaGold text-xs font-semibold border border-volturaGold/40 px-2.5 py-1 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed ml-3 shrink-0"
          >
            {editor.duplicating ? 'Copying…' : 'Duplicate'}
          </button>
          <button
            onClick={editor.handleDelete}
            disabled={editor.deleting}
            className="text-red-400 text-xs font-semibold border border-red-400/30 px-2.5 py-1 rounded-lg disabled:opacity-40 ml-1 shrink-0"
          >
            {editor.deleting ? '…' : 'Delete'}
          </button>
        </div>

        {/* Follow-up banner */}
        {initialEstimate?.follow_up_sent_at && !initialEstimate?.follow_up_dismissed && (
          <div className="flex items-center justify-between bg-volturaNavy/80 rounded-xl px-4 py-2">
            <span className="text-yellow-400 text-xs">
              🔔 Follow-up sent {new Date(initialEstimate.follow_up_sent_at!).toLocaleDateString()}
            </span>
            <button
              onClick={async () => {
                await dismissFollowUp(estimateId)
                router.refresh()
              }}
              className="text-gray-500 text-xs ml-3"
            >
              Dismiss
            </button>
          </div>
        )}

        <CustomerSelector
          selectedId={editor.customerId}
          selectedName={editor.customerName}
          onSelect={(id, name) => { editor.setCustomerId(id); editor.setCustomerName(name) }}
        />

        {editor.customerId && (
          <div className="flex gap-2 -mt-4">
            <button
              type="button"
              onClick={() => router.push(`/jobs/new?customerId=${editor.customerId}`)}
              className="text-volturaGold text-xs border border-volturaGold/30 px-3 py-1.5 rounded-lg"
            >
              + Schedule Job
            </button>
            <button
              type="button"
              onClick={() => router.push(`/customers/${editor.customerId}`)}
              className="text-gray-400 text-xs border border-white/10 px-3 py-1.5 rounded-lg"
            >
              View Customer
            </button>
          </div>
        )}

        {!editor.primarySkipped && (
          <PrimaryJobSelector
            pricebook={pricebook}
            selected={editor.primaryJobType}
            onSelect={editor.handlePrimaryJobSelect}
            onSkip={() => editor.setPrimarySkipped(true)}
          />
        )}

        {editor.primarySkipped && !editor.primaryJobType && (
          <div className="bg-volturaNavy/30 rounded-xl p-3 flex items-center justify-between">
            <p className="text-gray-500 text-sm">No primary job selected</p>
            <button onClick={() => editor.setPrimarySkipped(false)} className="text-volturaGold text-xs">Add one</button>
          </div>
        )}

        {/* Quick Add — primary entry point */}
        <button
          onClick={() => setQaOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-volturaGold/10 border border-volturaGold/30 text-volturaGold font-semibold rounded-xl py-3 text-sm active:scale-[0.98] transition-transform"
        >
          <span>⚡</span> Quick Add Item
        </button>

        <QuickAddSheet
          open={qaOpen}
          onClose={() => setQaOpen(false)}
          onAdd={editor.handleQuickAdd}
          pricebook={pricebook}
          initialRecents={initialRecents}
        />

        <CategoryGrid pricebook={pricebook} onAddItem={editor.handleAddItem} />

        <SuggestedItems
          currentLineItems={editor.allLineItems}
          onAdd={editor.handleAddSuggestion}
        />

        <LineItemList
          items={editor.lineItems}
          pricebook={pricebook}
          onFootageChange={editor.handleFootageChange}
          onRemove={editor.handleRemoveItem}
          onPriceUpdate={editor.handlePriceUpdate}
        />

        {/* Badge toggles */}
        <div className="flex gap-2 flex-wrap mt-3 mb-2">
          {([
            { key: 'permit', label: '📋 Permit', value: editor.includesPermit, set: editor.setIncludesPermit },
            { key: 'cleanup', label: '🧹 Cleanup', value: editor.includesCleanup, set: editor.setIncludesCleanup },
            { key: 'warranty', label: '🛡 Warranty', value: editor.includesWarranty, set: editor.setIncludesWarranty },
          ] as const).map(({ key, label, value, set }) => (
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

        <AddOnsPanel
          addons={editor.addons}
          onToggle={editor.handleAddonToggle}
          onPriceChange={editor.handleAddonPriceChange}
        />
        <CustomLineItems
          items={editor.customItems}
          onAdd={editor.addCustomItem}
          onUpdate={editor.updateCustomItem}
          onRemove={editor.removeCustomItem}
        />
        <DiscountsSection subtotal={editor.positiveSubtotal} onAddDiscount={editor.addDiscount} />

        <div>
          <label className="block text-gray-400 text-sm mb-1">Notes</label>
          <textarea
            value={editor.notes}
            onChange={(e) => editor.setNotes(e.target.value)}
            rows={3}
            className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold"
            placeholder="Notes for this estimate..."
          />
        </div>
      </div>

      {/* Fixed bottom action bar */}
      <EstimateBottomBar
        total={editor.total}
        hasItems={editor.hasItems}
        lineItems={editor.lineItems}
        addons={editor.addons}
        customItems={editor.customItems}
        status={initialEstimate?.status}
        estimateId={estimateId}
        customerName={editor.customerName ?? 'Customer'}
        estimateCreatedAt={estimateCreatedAt}
        linkedInvoiceId={linkedInvoiceId}
        signedAt={initialEstimate?.signed_at ?? null}
        signerName={initialEstimate?.signer_name ?? null}
        saving={editor.saving}
        saved={editor.saved}
        invoicing={editor.invoicing}
        notes={editor.notes}
        onAddPhotoItems={(items) =>
          items.forEach((item) => editor.handleAddSuggestion(item.description, item.price))
        }
        onSave={editor.handleSave}
        onPresent={() => setPresenting(true)}
        onSign={() => setSigningInPerson(true)}
        onSend={() => setSendOpen(true)}
        onCreateInvoice={editor.handleCreateInvoice}
        onViewInvoice={() => router.push(`/invoices/${linkedInvoiceId}`)}
      />

      {/* Modals */}
      <SendSheet
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        estimateId={estimateId}
        total={editor.total}
        customerPhone={initialCustomerPhone ?? null}
        customerName={editor.customerName ?? 'Customer'}
      />

      {signingInPerson && (
        <InPersonSignature
          estimateId={estimateId}
          customerName={editor.customerName}
          total={editor.total}
          estimateName={editor.estimateName}
          onClose={() => setSigningInPerson(false)}
          onSigned={() => {
            setSigningInPerson(false)
            window.location.reload()
          }}
        />
      )}

      {presenting && (
        <PresentMode
          estimateId={estimateId}
          customerName={editor.customerName}
          proposalEstimates={proposalEstimates.map((e) =>
            e.id === estimateId
              ? {
                  ...e,
                  name: editor.estimateName,
                  line_items: editor.allLineItems,
                  addons: editor.addons,
                  total: editor.total,
                  includes_permit: editor.includesPermit,
                  includes_cleanup: editor.includesCleanup,
                  includes_warranty: editor.includesWarranty,
                }
              : e
          )}
          lineItems={editor.lineItems}
          addons={editor.addons}
          customItems={editor.customItems}
          includesPermit={editor.includesPermit}
          includesCleanup={editor.includesCleanup}
          includesWarranty={editor.includesWarranty}
          onClose={() => setPresenting(false)}
          onApproved={() => {
            setPresenting(false)
            window.location.reload()
          }}
        />
      )}

      {/* Save as Template modal */}
      {editor.templateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
          onClick={() => editor.setTemplateModalOpen(false)}
        >
          <div
            className="bg-volturaNavy w-full max-w-lg rounded-t-2xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-lg">Save as Template</h3>
            <p className="text-gray-400 text-sm">Give this template a name so you can reuse it on future estimates.</p>
            <input
              type="text"
              value={editor.templateDraftName}
              onChange={e => editor.setTemplateDraftName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && editor.handleConfirmSaveTemplate()}
              autoFocus
              placeholder="Template name…"
              className="w-full bg-white/7 text-white rounded-xl px-4 py-3 text-sm outline-none border border-white/10 focus:border-volturaGold/50"
            />
            <div className="flex gap-3">
              <button
                onClick={() => editor.setTemplateModalOpen(false)}
                className="flex-1 py-3 rounded-xl text-gray-400 text-sm font-semibold bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={editor.handleConfirmSaveTemplate}
                disabled={editor.templateSaving || !editor.templateDraftName.trim()}
                className="flex-1 py-3 rounded-xl text-volturaBlue text-sm font-bold bg-volturaGold disabled:opacity-50"
              >
                {editor.templateSaving ? 'Saving…' : '📋 Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AIContextProvider>
  )
}
```

- [ ] **Step 2: Run TypeScript check — must be clean**

```bash
cd C:/Users/Devon/VolturaOS/volturaos
npx tsc --noEmit 2>&1 | head -60
```

Expected: Zero errors. If there are errors, fix them before continuing — do NOT commit with TypeScript errors.

- [ ] **Step 3: Verify line counts**

```bash
wc -l components/estimate-builder/EstimateBuilder.tsx components/estimate-builder/useEstimateEditor.ts components/estimate-builder/EstimateBottomBar.tsx
```

Expected roughly: EstimateBuilder ~300, useEstimateEditor ~260, EstimateBottomBar ~130.

---

## Task 5: Commit and verify

- [ ] **Step 1: Commit the three changed/created files**

```bash
cd C:/Users/Devon/VolturaOS/volturaos
git add components/estimate-builder/EstimateBuilder.tsx \
        components/estimate-builder/useEstimateEditor.ts \
        components/estimate-builder/EstimateBottomBar.tsx
git commit -m "$(cat <<'EOF'
refactor: split EstimateBuilder into hook + BottomBar (Option B)

- useEstimateEditor.ts: all 27 state vars + 14 callbacks, useCallback memoized
- EstimateBottomBar.tsx: fixed bottom action bar with local margin calculator
- EstimateBuilder.tsx: slimmed from 685 → ~300 lines (orchestration only)
- Zero behavior changes, BACKUP.tsx retained as rollback

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 2: Manual verification checklist**

Open the live app (or `npm run dev` locally) and verify each of the following:

- [ ] Estimate builder page loads without errors
- [ ] Estimate name input works and saves
- [ ] Follow Up days input works
- [ ] Customer selector works
- [ ] Quick Add Item button opens the sheet
- [ ] Adding items via QuickAdd appears in the list
- [ ] Category grid adds items
- [ ] Remove item works
- [ ] Price override works
- [ ] Addons toggle on/off
- [ ] Permit / Cleanup / Warranty badges toggle
- [ ] Custom line items can be added
- [ ] Discounts section works
- [ ] Notes textarea saves
- [ ] Margin calculator toggle works (📊 button)
- [ ] Save Draft button saves (shows "Saved ✓")
- [ ] Present button opens Present mode
- [ ] Sign button opens InPersonSignature
- [ ] Send button opens SendSheet
- [ ] Duplicate button copies the estimate
- [ ] Delete button (with confirm dialog) deletes
- [ ] 🔖 Template button opens template modal
- [ ] Total updates correctly as items are added/removed
- [ ] On an Approved estimate: Create Invoice / View Invoice button appears

---

## Rollback Instructions

If anything breaks and needs to be reverted:

```bash
cd C:/Users/Devon/VolturaOS/volturaos
# Option 1: restore from backup file
cp components/estimate-builder/EstimateBuilder.BACKUP.tsx components/estimate-builder/EstimateBuilder.tsx
rm components/estimate-builder/useEstimateEditor.ts
rm components/estimate-builder/EstimateBottomBar.tsx

# Option 2: git reset to before the refactor commit
git log --oneline -5   # find the backup commit hash
git revert HEAD        # or git reset --hard <backup-commit-hash>
```
