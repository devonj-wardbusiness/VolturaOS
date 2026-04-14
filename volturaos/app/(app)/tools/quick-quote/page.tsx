'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import Link from 'next/link'

export default function QuickQuotePage() {
  const [jobDesc, setJobDesc] = useState('')
  const [hours, setHours] = useState(2)
  const [rate, setRate] = useState(125)
  const [materials, setMaterials] = useState(0)
  const [markup, setMarkup] = useState(20)

  const labor = hours * rate
  const materialsCost = materials
  const materialsWithMarkup = materialsCost * (1 + markup / 100)
  const total = labor + materialsWithMarkup

  const lowTotal = Math.round(total * 0.9)
  const highTotal = Math.round(total * 1.1)

  const marginPct = total > 0 ? Math.round(((total - materialsCost - labor * 0.5) / total) * 100) : 0

  function fmt(n: number) {
    return `$${Math.round(n).toLocaleString()}`
  }

  return (
    <>
      <PageHeader title="Quick Quote" backHref="back" />
      <div className="px-4 pt-14 pb-8 space-y-5">

        {/* Job description */}
        <div>
          <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">Job Description</label>
          <input
            type="text"
            value={jobDesc}
            onChange={e => setJobDesc(e.target.value)}
            placeholder="e.g. Panel upgrade 200A, 3 circuits..."
            className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold"
          />
        </div>

        {/* Hours + Rate */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">Est. Hours</label>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={hours}
              onChange={e => setHours(Number(e.target.value))}
              className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">Rate / hr</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                min={0}
                value={rate}
                onChange={e => setRate(Number(e.target.value))}
                className="w-full bg-volturaNavy text-white rounded-xl pl-7 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold"
              />
            </div>
          </div>
        </div>

        {/* Materials + Markup */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">Materials Cost</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                min={0}
                value={materials}
                onChange={e => setMaterials(Number(e.target.value))}
                className="w-full bg-volturaNavy text-white rounded-xl pl-7 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold"
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">Markup %</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={200}
                value={markup}
                onChange={e => setMarkup(Number(e.target.value))}
                className="w-full bg-volturaNavy text-white rounded-xl px-4 pr-8 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
          </div>
        </div>

        {/* Result card */}
        {total > 0 && (
          <div className="bg-volturaNavy/50 border border-volturaGold/30 rounded-2xl p-5 space-y-3"
            style={{ borderTop: '2px solid #C9A227' }}>

            {/* Price range */}
            <div className="text-center">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Quoted Range</p>
              <p className="text-volturaGold text-4xl font-bold tracking-wide">
                {fmt(lowTotal)} – {fmt(highTotal)}
              </p>
            </div>

            <div className="border-t border-white/5 pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Labor ({hours}h × {fmt(rate)}/hr)</span>
                <span className="text-white">{fmt(labor)}</span>
              </div>
              {materials > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Materials + {markup}% markup</span>
                  <span className="text-white">{fmt(materialsWithMarkup)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold border-t border-white/5 pt-2">
                <span className="text-gray-300">Midpoint</span>
                <span className="text-volturaGold">{fmt(total)}</span>
              </div>
            </div>

            {/* Per-day if multi-day */}
            {hours >= 8 && (
              <p className="text-gray-500 text-xs text-center">
                ≈ {fmt(total / Math.ceil(hours / 8))} per day · {Math.ceil(hours / 8)} day{Math.ceil(hours / 8) > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* CTA */}
        <Link
          href="/estimates/new"
          className="block w-full text-center bg-volturaGold text-volturaBlue font-bold py-3 rounded-xl text-base"
        >
          Build Full Estimate
        </Link>

        <p className="text-gray-600 text-xs text-center">
          Quick Quote is for phone ballparks only — not saved or sent to customer.
        </p>
      </div>
    </>
  )
}
