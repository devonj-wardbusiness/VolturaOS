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
