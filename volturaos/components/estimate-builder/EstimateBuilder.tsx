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
    valid_until?: string | null
    payment_terms?: string | null
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
          onDescriptionUpdate={editor.handleDescriptionUpdate}
          onQuantityChange={editor.handleQuantityChange}
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
          onAddCustom={editor.handleAddCustomAddon}
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

        <div>
          <label className="block text-gray-400 text-sm mb-1">Valid until <span className="text-gray-600">(optional)</span></label>
          <input
            type="date"
            value={editor.validUntil ?? ''}
            onChange={e => editor.setValidUntil(e.target.value || null)}
            className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold"
            style={{ colorScheme: 'dark' }}
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-2">Payment terms <span className="text-gray-600">(optional)</span></label>
          <div className="flex gap-2 flex-wrap mb-2">
            {['50% deposit to schedule', 'Full payment on completion', 'Net 15'].map(preset => (
              <button
                key={preset}
                onClick={() => editor.setPaymentTerms(preset)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${editor.paymentTerms === preset ? 'bg-volturaGold text-volturaBlue font-semibold' : 'bg-volturaNavy/50 text-gray-400'}`}
              >
                {preset}
              </button>
            ))}
          </div>
          <input
            value={editor.paymentTerms ?? ''}
            onChange={e => editor.setPaymentTerms(e.target.value || null)}
            placeholder="Custom terms..."
            className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold"
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
