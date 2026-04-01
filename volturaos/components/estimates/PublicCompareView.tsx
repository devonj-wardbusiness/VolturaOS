'use client'

import { useState } from 'react'
import { approvePublicEstimate } from '@/lib/actions/estimates'
import { ExpandableLineItem } from '@/components/estimates/LineItemsList'
import type { Estimate, Addon, LineItem } from '@/types'

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
