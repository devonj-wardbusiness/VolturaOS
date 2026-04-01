'use client'

import { useState } from 'react'
import { approvePublicEstimate } from '@/lib/actions/estimates'
import type { Estimate, Addon, LineItem } from '@/types'

function ExpandableLineItem({ item }: { item: LineItem }) {
  const [open, setOpen] = useState(false)
  const hasDesc = !!item.pricebook_description
  return (
    <div>
      <button
        className="w-full flex items-center justify-between py-2 text-left min-h-[44px]"
        onClick={() => hasDesc && setOpen(o => !o)}
        style={{ cursor: hasDesc ? 'pointer' : 'default' }}
      >
        <span className="text-white/80 text-sm">
          {item.description}{item.footage ? ` (${item.footage}ft)` : ''}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="text-volturaGold text-sm">${item.price.toLocaleString()}</span>
          {hasDesc && (
            <span className={`text-gray-500 text-xs transition-transform inline-block ${open ? 'rotate-90' : ''}`}>›</span>
          )}
        </span>
      </button>
      {open && item.pricebook_description && (
        <p className="text-gray-400 text-xs pb-2 pr-6 leading-relaxed">{item.pricebook_description}</p>
      )}
    </div>
  )
}

interface PublicCompareViewProps {
  estimates: Estimate[]
  customerName: string
}

export function PublicCompareView({ estimates, customerName }: PublicCompareViewProps) {
  const [approvedId, setApprovedId] = useState<string | null>(
    estimates.find((e) => e.status === 'Approved')?.id ?? null
  )
  const [loading, setLoading] = useState(false)

  const alreadySettled = estimates.some((e) => e.status === 'Approved' || e.status === 'Declined')

  async function handleApprove(id: string) {
    if (loading || alreadySettled) return
    setLoading(true)
    try {
      await approvePublicEstimate(id)
      setApprovedId(id)
    } catch {
      alert('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <p className="text-gray-400 text-sm mb-4">{customerName} — choose your package</p>
      <div className="flex overflow-x-auto gap-3 pb-2 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
        {estimates.map((est) => {
          const items = est.line_items ?? []
          const addons = (est.addons ?? []).filter((a: Addon) => a.selected)
          const total = est.total ?? 0
          const isApproved = approvedId === est.id
          const isDeclined = approvedId !== null && approvedId !== est.id

          return (
            <div
              key={est.id}
              className={`snap-center shrink-0 w-[85vw] max-w-sm rounded-2xl flex flex-col overflow-hidden border-2 transition-all ${
                isApproved ? 'border-volturaGold bg-volturaNavy' :
                isDeclined ? 'border-transparent bg-volturaNavy/30 opacity-50' :
                'border-volturaNavy bg-volturaNavy'
              }`}
            >
              <div className="px-5 pt-5 pb-3 border-b border-white/10">
                <h2 className="text-volturaGold text-xl font-bold">{est.name}</h2>
                <p className="text-white text-3xl font-bold mt-1">${total.toLocaleString()}</p>
              </div>
              <div className="flex-1 px-5 py-3 space-y-2">
                {items.map((item: LineItem, i: number) => (
                  <ExpandableLineItem key={i} item={item} />
                ))}
                {addons.map((addon: Addon, i: number) => (
                  <div key={`a-${i}`} className="flex justify-between gap-3">
                    <p className="text-gray-400 text-sm flex-1">{addon.name}</p>
                    <p className="text-gray-400 text-sm shrink-0">+${addon.price.toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="px-5 py-4 border-t border-white/10">
                {isApproved ? (
                  <div className="w-full text-center py-3 text-volturaGold font-bold">✓ Approved</div>
                ) : isDeclined ? (
                  <div className="w-full text-center py-3 text-gray-500">Declined</div>
                ) : (
                  <button
                    onClick={() => handleApprove(est.id)}
                    disabled={loading}
                    className="w-full bg-volturaGold text-volturaBlue font-bold py-3 rounded-xl disabled:opacity-50"
                  >
                    {loading ? 'Processing…' : `Choose ${est.name}`}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex justify-center gap-1.5 mt-3">
        {estimates.map((est) => (
          <div key={est.id} className="w-2 h-2 rounded-full bg-volturaNavy/60" />
        ))}
      </div>
    </div>
  )
}
