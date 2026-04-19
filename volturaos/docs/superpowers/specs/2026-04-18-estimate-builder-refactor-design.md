# EstimateBuilder Refactor — Design Spec

> **For agentic workers:** Use superpowers:executing-plans to implement this plan.

**Goal:** Break `EstimateBuilder.tsx` (685 lines, 27 state variables, 17 child components) into three focused files without changing any visible behavior or UI.

**Approach:** Option B — custom hook extraction + bottom bar component split. No context/reducer, no new features, no UI changes. Pure structural refactor.

**Risk mitigation:** File-copy backup created before any edits. Existing git commit is the second escape hatch.

---

## Files

### Created
- `components/estimate-builder/EstimateBuilder.BACKUP.tsx` — byte-for-byte copy of the original, committed before edits begin
- `components/estimate-builder/useEstimateEditor.ts` — custom hook: all state + callbacks + derived values
- `components/estimate-builder/EstimateBottomBar.tsx` — fixed bottom action bar component

### Modified
- `components/estimate-builder/EstimateBuilder.tsx` — slimmed from ~685 → ~300 lines (JSX only, no business logic)

### Untouched
Everything else. No changes to child components, server actions, types, pages, or other layouts.

---

## `useEstimateEditor` Hook

**File:** `components/estimate-builder/useEstimateEditor.ts`  
**Target size:** ~250 lines  
**Signature:**

```ts
export function useEstimateEditor(
  initialEstimate: Estimate,
  pricebook: PricebookEntry[]
)
```

**Returns a single object grouped into these namespaces:**

### Customer + metadata state
```ts
customerId: string | null
setCustomerId: (id: string | null) => void
customerName: string | null
setCustomerName: (name: string | null) => void
estimateName: string
setEstimateName: (name: string) => void
primaryJobType: string | null
setPrimaryJobType: (type: string | null) => void
primarySkipped: boolean
setPrimarySkipped: (v: boolean) => void
followUpDays: number
setFollowUpDays: (days: number) => void
```

### Line item state + callbacks
```ts
lineItems: LineItem[]
addons: Addon[]
customItems: LineItem[]
notes: string
setNotes: (notes: string) => void
handlePrimaryJobSelect: (jobType: string) => void
handleAddItem: (entry: PricebookEntry) => void
handleQuickAdd: (items: LineItem[]) => void
handleRemoveItem: (index: number) => void
handlePriceUpdate: (index: number, price: number) => void
handleFootageChange: (index: number, footage: number, price: number) => void
handleAddonToggle: (index: number) => void
handleAddonPriceChange: (index: number, price: number) => void
addCustomItem: () => void
updateCustomItem: (index: number, updates: Partial<LineItem>) => void
removeCustomItem: (index: number) => void
addDiscount: (description: string, amount: number) => void
handleAddSuggestion: (name: string, price: number) => void
```

### Badge toggles
```ts
includesPermit: boolean
setIncludesPermit: (v: boolean) => void
includesCleanup: boolean
setIncludesCleanup: (v: boolean) => void
includesWarranty: boolean
setIncludesWarranty: (v: boolean) => void
```

### Derived values (computed at render, not stored in state)
```ts
allLineItems: LineItem[]       // lineItems + customItems
total: number                  // calculateTotal(lineItems, addons, customItems)
positiveSubtotal: number       // total excluding negative-price items
hasItems: boolean              // allLineItems.length > 0 || addons.some(a => a.selected)
```

### Save / action states
```ts
saving: boolean
saved: boolean
handleSave: () => Promise<void>        // useCallback — depends on all item state
duplicating: boolean
handleDuplicate: () => Promise<void>   // useCallback — calls router.push internally
deleting: boolean
handleDelete: () => Promise<void>      // useCallback — calls router.push internally
invoicing: boolean
handleCreateInvoice: () => Promise<void> // useCallback — name matches source (not handleInvoice)
```

### Template state
```ts
templateModalOpen: boolean
setTemplateModalOpen: (v: boolean) => void
templateDraftName: string
setTemplateDraftName: (name: string) => void
templateSaving: boolean
handleSaveAsTemplate: () => void        // opens modal + pre-fills templateDraftName
handleConfirmSaveTemplate: () => Promise<void>  // performs the actual save action
```

**All logic currently in EstimateBuilder's callbacks moves here verbatim.** No behavior changes — only relocation.

**Router dependency:** The hook calls `useRouter()` internally for redirects after delete, duplicate, and invoice creation. No router prop needed on the hook — it is self-contained.

**Memoization:** All async action handlers (`handleSave`, `handleDuplicate`, `handleDelete`, `handleCreateInvoice`, `handleSaveAsTemplate`, `handleConfirmSaveTemplate`) must be wrapped in `useCallback` with their full dependency arrays. Item mutation callbacks (`handleAddItem`, `handleRemoveItem`, etc.) must also be `useCallback`-wrapped. This prevents unnecessary re-renders of child components that receive these as props.

**Intentionally excluded from hook:** `myCost` and `showMargin` (margin calculator state) are pure UI — never persisted. They live as local `useState` inside `EstimateBottomBar`, not in the hook.

---

## `EstimateBottomBar` Component

**File:** `components/estimate-builder/EstimateBottomBar.tsx`  
**Target size:** ~150 lines

### Props interface
```ts
interface EstimateBottomBarProps {
  // Display data
  total: number
  hasItems: boolean
  lineItems: LineItem[]
  addons: Addon[]
  status: EstimateStatus
  estimateId: string
  linkedInvoiceId: string | null
  saving: boolean
  saved: boolean
  duplicating: boolean
  invoicing: boolean

  // Modal triggers (modals rendered in EstimateBuilder)
  onSave: () => void
  onPresent: () => void
  onSign: () => void
  onSend: () => void
  onInvoice: () => void
  onViewInvoice: () => void
}
```

### Renders (in order, top to bottom)
1. **Margin calculator row** — `myCost` input + calculated margin % display. Local state only (`useState` inside BottomBar), not lifted. Only visible when toggled.
2. **Total + icon buttons row** — `LiveTotal` on left, three icon-only buttons (SavingsCalculator, PhotoEstimate, MaterialList) on right
3. **Primary action buttons row** — Save Draft · Present · Sign/Send (conditional on `status`)
4. **Secondary action buttons** — Create Invoice (if `status === 'Approved'`), View Invoice (if `linkedInvoiceId`)

**Note:** The margin calculator's `myCost` and `showMargin` state moves INTO `EstimateBottomBar` as local state — it is pure UI (never saved to DB), so it does not belong in `useEstimateEditor`.

---

## Slimmed `EstimateBuilder.tsx`

**Target size:** ~300 lines  
**Responsibility:** Orchestration only — render layout, open/close modals, wire hook to children.

### What stays in EstimateBuilder
- `'use client'` directive and all imports
- The five modal open/close states: `presenting`, `signingInPerson`, `sendOpen`, `qaOpen`, `templateModalOpen`
- The `AIContextProvider` wrapper
- The scroll area with all item-collection child components (CategoryGrid, LineItemList, AddOnsPanel, etc.)
- Conditional rendering of modals (PresentMode, InPersonSignature, SendSheet, QuickAddSheet)
- The follow-up banner

### What moves out
- All 27 state variables + 14 callbacks → `useEstimateEditor`
- The entire fixed bottom bar JSX → `EstimateBottomBar`

### After refactor, the component reads like:
```tsx
export function EstimateBuilder({ estimate, pricebook, ... }) {
  const editor = useEstimateEditor(estimate, pricebook)
  const [presenting, setPresenting] = useState(false)
  const [signingInPerson, setSigningInPerson] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [qaOpen, setQaOpen] = useState(false)

  return (
    <AIContextProvider value={{ mode: 'estimate', jobType: editor.primaryJobType, currentLineItems: editor.allLineItems }}>
      {/* Follow-up banner */}
      {/* Scroll area: customer, job selector, line items, addons, etc. */}
      {/* Modals */}
      <EstimateBottomBar
        total={editor.total}
        hasItems={editor.hasItems}
        onSave={editor.handleSave}
        onPresent={() => setPresenting(true)}
        onSign={() => setSigningInPerson(true)}
        onSend={() => setSendOpen(true)}
        onInvoice={editor.handleCreateInvoice}
        {...}
      />
    </AIContextProvider>
  )
}
```

---

## Implementation Order

1. **Backup** — copy `EstimateBuilder.tsx` → `EstimateBuilder.BACKUP.tsx`, commit
2. **Create hook** — write `useEstimateEditor.ts` with all state + callbacks copied verbatim from EstimateBuilder. Do not change any logic.
3. **Wire hook** — update `EstimateBuilder.tsx` to use the hook. Run TypeScript check. Visually verify app still works.
4. **Create BottomBar** — write `EstimateBottomBar.tsx` by cutting the bottom bar JSX out of EstimateBuilder and pasting into the new component. Add props interface.
5. **Wire BottomBar** — replace bottom bar JSX in EstimateBuilder with `<EstimateBottomBar .../>`. Run TypeScript check. Visually verify.
6. **Commit** — single commit with all three files.

---

## Verification Checklist

After each step, verify:
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] Estimate builder opens and renders correctly
- [ ] Adding a line item works
- [ ] Save Draft saves
- [ ] Present mode opens
- [ ] Sign in person opens
- [ ] Send sheet opens
- [ ] Quick Add sheet opens
- [ ] Total updates correctly when items added/removed
- [ ] Margin calculator toggles
- [ ] Create Invoice button appears when status is Approved

---

## What This Does NOT Change

- Zero behavior changes
- Zero UI changes
- No new features
- No changes to child components
- No changes to server actions
- No changes to types
- No changes to any other page or route
