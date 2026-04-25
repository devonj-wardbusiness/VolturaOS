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
    valid_until?: string | null
    payment_terms?: string | null
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
  const [validUntil, setValidUntil] = useState<string | null>(initialEstimate?.valid_until ?? null)
  const [paymentTerms, setPaymentTerms] = useState<string | null>(initialEstimate?.payment_terms ?? null)

  // Items — sync pricebook prices for non-overridden items on load
  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    const items = initialEstimate?.line_items ?? []
    return items.map(item => {
      if (item.is_override) return item
      const pbEntry = pricebook.find(p => p.job_type === item.description)
      if (!pbEntry) return item
      const currentPrice = pbEntry.price_better ?? pbEntry.price_good ?? 0
      return { ...item, price: currentPrice, original_price: currentPrice }
    })
  })
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
      { description: entry.job_type, price, is_override: false, original_price: price, category: entry.category, pricebook_description: entry.description_good ?? entry.description_better ?? undefined },
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
      pricebook_description: entry.description_good ?? undefined,
    }])
  }, [])

  const handleDescriptionUpdate = useCallback((index: number, desc: string) => {
    setLineItems((prev) => prev.map((item, i) =>
      i === index ? { ...item, pricebook_description: desc } : item
    ))
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

  const handleAddCustomAddon = useCallback((name: string, price: number) => {
    setAddons((prev) => [...prev, { name, price, selected: true, original_price: price }])
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
      validUntil,
      paymentTerms,
    })
  }, [estimateId, estimateName, addons, notes, includesPermit, includesCleanup, includesWarranty, followUpDays, validUntil, paymentTerms])

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
    validUntil, setValidUntil,
    paymentTerms, setPaymentTerms,
    // Items
    lineItems, addons, customItems,
    notes, setNotes,
    // Item callbacks
    handlePrimaryJobSelect,
    handleAddItem, handleQuickAdd,
    handleRemoveItem, handlePriceUpdate, handleFootageChange, handleDescriptionUpdate,
    handleAddonToggle, handleAddonPriceChange, handleAddCustomAddon,
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
