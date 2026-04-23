'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { EstimateStatus, LineItem, Addon } from '@/types'

type EstimateSlice = {
  id: string
  name: string
  total: number | null
  status: EstimateStatus
  line_items: LineItem[] | null
  addons: Addon[] | null
  created_at: string
}

interface EstimatesTabProps {
  estimates: EstimateSlice[]
  customerId: string
}

const STATUS_COLORS: Record<EstimateStatus, { bg: string; text: string }> = {
  Draft:    { bg: '#1e2538', text: '#8a93b0' },
  Sent:     { bg: '#162a3d', text: '#3ab8ff' },
  Viewed:   { bg: '#162a3d', text: '#3ab8ff' },
  Approved: { bg: '#12281a', text: '#3fd47a' },
  Declined: { bg: '#2d1a1a', text: '#ef4444' },
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export function EstimatesTab({ estimates, customerId }: EstimatesTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const totalPrice = estimates.reduce((sum, e) => sum + (e.total ?? 0), 0)
  const totalSavings = totalPrice * 0.1

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100dvh - 56px - 64px)' }}>
      {/* Action buttons */}
      <div className="px-4 pt-4 pb-3">
        <Link
          href={`/estimates/new?customerId=${customerId}`}
          className="block w-full text-center border border-white/10 text-gray-400 text-[11px] py-2.5 rounded-full uppercase tracking-wide font-bold"
        >
          + New Estimate
        </Link>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-4">
        {estimates.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-8">No estimates yet</p>
        )}

        {estimates.map(est => {
          const sc = STATUS_COLORS[est.status] ?? STATUS_COLORS.Draft
          const itemCount = (est.line_items ?? []).length
          const isExpanded = expandedId === est.id

          return (
            <div
              key={est.id}
              onClick={() => setExpandedId(isExpanded ? null : est.id)}
              className="rounded-xl p-4 cursor-pointer"
              style={{
                background: '#161b29',
                border: `1.5px solid ${isExpanded ? '#C9A227' : '#1e2538'}`,
                boxShadow: isExpanded ? '0 0 0 3px rgba(201,162,39,0.12)' : 'none',
              }}
            >
              {/* Title + status + menu */}
              <div className="flex items-start justify-between mb-2 gap-2">
                <span className="text-white font-semibold text-sm flex-1 leading-snug">
                  {est.name}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className="text-[9px] font-bold uppercase rounded px-1.5 py-0.5 tracking-wide"
                    style={{ background: sc.bg, color: sc.text }}
                  >
                    {est.status}
                  </span>
                  <span className="text-gray-600 text-base">⋮</span>
                </div>
              </div>

              {/* Items badge */}
              <span className="text-[10px] font-semibold rounded px-2 py-0.5 bg-white/5 text-gray-500">
                {itemCount} Items
              </span>

              {/* Divider */}
              <div className="h-px bg-white/5 my-3" />

              {/* Price row */}
              <div className="flex">
                <div className="flex-1">
                  <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mb-1">
                    Regular Price
                  </p>
                  <p className="text-white font-bold text-base">{fmt(est.total ?? 0)}</p>
                </div>
                <div className="w-px bg-white/5 mx-3 self-stretch" />
                <div className="flex-1">
                  <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mb-1">
                    Potential Savings
                  </p>
                  <p className="font-bold text-base" style={{ color: '#C9A227' }}>
                    {fmt((est.total ?? 0) * 0.1)}
                  </p>
                </div>
              </div>

              {/* Expanded inline actions */}
              {isExpanded && (
                <div
                  className="mt-3 flex gap-2"
                  onClick={e => e.stopPropagation()}
                >
                  {(['Edit', 'Present', 'Send', 'Convert'] as const).map(action => (
                    <Link
                      key={action}
                      href={
                        action === 'Edit'
                          ? `/estimates/${est.id}`
                          : action === 'Present'
                          ? `/estimates/${est.id}?present=true`
                          : action === 'Send'
                          ? `/estimates/${est.id}?send=true`
                          : `/invoices/new?estimateId=${est.id}`
                      }
                      className="flex-1 text-center text-[10px] font-bold py-2 rounded-lg"
                      style={{
                        background: action === 'Convert' ? '#C9A227' : '#1e2538',
                        color: action === 'Convert' ? '#0f1117' : '#8a93b0',
                      }}
                    >
                      {action}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer totals bar */}
      {estimates.length > 0 && (
        <div
          className="px-4 py-3 flex items-center justify-between flex-shrink-0"
          style={{ background: '#0c0f1a', borderTop: '1px solid #1a1f2e' }}
        >
          <div>
            <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mb-0.5">
              Total ({estimates.length} Estimate{estimates.length !== 1 ? 's' : ''})
            </p>
            <p className="font-black text-lg" style={{ color: '#C9A227' }}>
              {fmt(totalPrice)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mb-0.5">
              Total Savings
            </p>
            <p className="font-bold text-base text-green-400">{fmt(totalSavings)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
