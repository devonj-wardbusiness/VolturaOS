'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { updateEstimateStatus } from '@/lib/actions/estimates'
import { calculateTotal } from '@/components/estimate-builder/LiveTotal'
import type { LineItem, Addon, Estimate } from '@/types'

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

interface PresentModeProps {
  estimateId: string
  customerName: string | null
  proposalEstimates: Estimate[]
  lineItems: LineItem[]
  addons: Addon[]
  customItems: LineItem[]
  onClose: () => void
  onApproved: () => void
}

export function PresentMode({
  estimateId,
  customerName,
  proposalEstimates,
  lineItems,
  addons,
  customItems,
  onClose,
  onApproved,
}: PresentModeProps) {
  const isProposal = proposalEstimates.length > 1
  // Proposal: compare → sign | Solo: scope → sign
  const [step, setStep] = useState<'compare' | 'scope' | 'sign'>(isProposal ? 'compare' : 'scope')
  const [selectedEstimateId, setSelectedEstimateId] = useState<string>(estimateId)
  const [signing, setSigning] = useState(false)
  const [approved, setApproved] = useState(false)
  const [hasSig, setHasSig] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const soloTotal = calculateTotal([], lineItems, addons, customItems)
  const selectedAddonList = addons.filter((a) => a.selected)
  const allSoloItems = [...lineItems, ...customItems]

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDrawing.current = true
    lastPos.current = getPos(e)
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath()
    ctx.strokeStyle = '#F5C518'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (lastPos.current) { ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y) }
    ctx.stroke()
    lastPos.current = pos
    setHasSig(true)
  }
  function onPointerUp() { isDrawing.current = false; lastPos.current = null }
  function clearSignature() {
    if (!canvasRef.current) return
    canvasRef.current.getContext('2d')!.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    setHasSig(false)
  }

  const handleApprove = useCallback(async () => {
    if (!hasSig) return
    setSigning(true)
    try {
      await updateEstimateStatus(selectedEstimateId, 'Approved')
      const siblings = proposalEstimates.filter((e) => e.id !== selectedEstimateId)
      await Promise.all(siblings.map((e) => updateEstimateStatus(e.id, 'Declined')))
      setApproved(true)
      setTimeout(() => onApproved(), 2200)
    } catch {
      alert('Failed to approve — please try again.')
      setSigning(false)
    }
  }, [hasSig, selectedEstimateId, proposalEstimates, onApproved])

  return (
    <div className="fixed inset-0 z-50 bg-volturaBlue flex flex-col" style={{ touchAction: 'none' }}>

      {/* ── Comparison step (multi-estimate proposals) ── */}
      {step === 'compare' && isProposal && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-6 pb-4">
            <button onClick={onClose} className="text-gray-500 text-sm">✕ Close</button>
            <span className="text-volturaGold font-bold tracking-widest text-xs uppercase">Voltura Power Group</span>
            <div className="w-16" />
          </div>
          <div className="px-6 pb-3">
            <p className="text-gray-400 text-sm">{customerName}</p>
            <h1 className="text-white text-xl font-bold mt-1">Choose Your Package</h1>
          </div>

          <div className="flex-1 flex overflow-x-auto snap-x snap-mandatory gap-3 px-4 pb-4" style={{ scrollbarWidth: 'none' }}>
            {proposalEstimates.map((est) => {
              const estTotal = est.total ?? 0
              const estItems = est.line_items ?? []
              const estAddons = (est.addons ?? []).filter((a: Addon) => a.selected)
              return (
                <div
                  key={est.id}
                  className="snap-center shrink-0 w-[85vw] max-w-sm bg-volturaNavy rounded-2xl flex flex-col overflow-hidden"
                >
                  <div className="px-5 pt-5 pb-3 border-b border-white/10">
                    <h2 className="text-volturaGold text-xl font-bold">{est.name}</h2>
                    <p className="text-white text-3xl font-bold mt-1">${estTotal.toLocaleString()}</p>
                  </div>
                  <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
                    {estItems.map((item: LineItem, i: number) => (
                      <ExpandableLineItem key={i} item={item} />
                    ))}
                    {estAddons.map((addon: Addon, i: number) => (
                      <div key={`addon-${i}`} className="flex justify-between gap-3">
                        <p className="text-gray-400 text-sm flex-1">{addon.name}</p>
                        <p className="text-gray-400 text-sm shrink-0">${addon.price.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-5 py-4 border-t border-white/10">
                    <button
                      onClick={() => { setSelectedEstimateId(est.id); setStep('sign') }}
                      className="w-full bg-volturaGold text-volturaBlue font-bold py-3 rounded-xl"
                    >
                      Choose {est.name}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-center gap-1.5 pb-4">
            {proposalEstimates.map((est) => (
              <div key={est.id} className="w-2 h-2 rounded-full bg-volturaNavy/60" />
            ))}
          </div>
        </div>
      )}

      {/* ── Scope step (solo estimate) ── */}
      {step === 'scope' && !isProposal && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-6 pb-4">
            <button onClick={onClose} className="text-gray-500 text-sm">✕ Close</button>
            <span className="text-volturaGold font-bold tracking-widest text-xs uppercase">Voltura Power Group</span>
            <div className="w-16" />
          </div>

          <div className="flex-1 overflow-y-auto px-5 space-y-5 pb-6">
            <div>
              <p className="text-gray-400 text-sm">{customerName}</p>
              <h1 className="text-white text-2xl font-bold mt-1">Your Estimate</h1>
            </div>

            {allSoloItems.length > 0 && (
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Scope of Work</p>
                <div className="bg-volturaNavy rounded-xl overflow-hidden divide-y divide-white/5 px-4">
                  {allSoloItems.map((item, i) => (
                    <ExpandableLineItem key={i} item={item} />
                  ))}
                </div>
              </div>
            )}

            {selectedAddonList.length > 0 && (
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Add-ons</p>
                <div className="bg-volturaNavy rounded-xl overflow-hidden divide-y divide-white/5">
                  {selectedAddonList.map((addon, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3 gap-4">
                      <p className="text-gray-300 text-sm flex-1">{addon.name}</p>
                      <p className="text-white font-semibold shrink-0">${addon.price.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-volturaGold/10 border border-volturaGold/30 rounded-2xl px-5 py-4 flex items-center justify-between">
              <span className="text-white font-semibold text-lg">Total</span>
              <span className="text-volturaGold font-bold text-3xl">${soloTotal.toLocaleString()}</span>
            </div>

            <p className="text-gray-500 text-xs text-center pb-2">
              Pricing valid 30 days · Licensed &amp; Insured · Colorado Springs, CO
            </p>
          </div>

          <div className="px-5 pb-6 border-t border-volturaNavy/50 pt-4">
            <button
              onClick={() => setStep('sign')}
              className="w-full bg-volturaGold text-volturaBlue font-bold py-4 rounded-2xl text-lg"
            >
              Approve &amp; Sign
            </button>
          </div>
        </div>
      )}

      {/* ── Sign step ── */}
      {step === 'sign' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-volturaNavy/50">
            <button
              onClick={() => isProposal ? setStep('compare') : setStep('scope')}
              className="text-gray-400 text-sm"
            >
              ← Back
            </button>
            <span className="text-white font-semibold">Sign to Approve</span>
            <div className="w-12" />
          </div>

          {approved ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center text-4xl">✅</div>
              <h2 className="text-white text-2xl font-bold">Approved!</h2>
              <p className="text-gray-400">Estimate approved for {customerName}.</p>
              <p className="text-gray-500 text-sm">We&apos;ll be in touch to schedule your service.</p>
            </div>
          ) : (
            <>
              <div className="flex-1 flex flex-col px-5 py-5 gap-4">
                <div className="text-center">
                  {isProposal && (
                    <p className="text-gray-400 text-sm">
                      {proposalEstimates.find((e) => e.id === selectedEstimateId)?.name ?? 'Estimate'}
                    </p>
                  )}
                  <p className="text-volturaGold text-3xl font-bold mt-1">
                    ${isProposal
                      ? (proposalEstimates.find((e) => e.id === selectedEstimateId)?.total ?? 0).toLocaleString()
                      : soloTotal.toLocaleString()
                    }
                  </p>
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400 text-sm">Sign below</p>
                    {hasSig && (
                      <button onClick={clearSignature} className="text-gray-500 text-xs underline">Clear</button>
                    )}
                  </div>
                  <div className="flex-1 rounded-2xl border-2 border-dashed border-volturaNavy overflow-hidden bg-volturaNavy/20">
                    <canvas
                      ref={canvasRef}
                      className="w-full h-full touch-none"
                      style={{ display: 'block' }}
                      onPointerDown={onPointerDown}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      onPointerLeave={onPointerUp}
                      width={typeof window !== 'undefined' ? window.innerWidth : 400}
                      height={260}
                    />
                  </div>
                  {!hasSig && (
                    <p className="text-gray-600 text-xs text-center">Use your finger or stylus to sign</p>
                  )}
                </div>

                <p className="text-gray-500 text-xs text-center leading-relaxed">
                  By signing, you authorize Voltura Power Group to proceed with the work described in this estimate.
                </p>
              </div>

              <div className="px-5 pb-6">
                <button
                  onClick={handleApprove}
                  disabled={!hasSig || signing}
                  className="w-full bg-volturaGold text-volturaBlue font-bold py-4 rounded-2xl text-lg disabled:opacity-40"
                >
                  {signing ? 'Approving...' : 'Approve Estimate'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
