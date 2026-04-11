'use client'

import { useState, useRef, useEffect } from 'react'
import { signEstimate } from '@/lib/actions/estimates'
import { ChevronDown, ChevronUp } from 'lucide-react'

const TC_SECTIONS = [
  {
    title: '1. Scope of Work',
    body: 'Services are limited to the scope in this estimate. Additional work requires a signed change order — verbal agreements are not authorization to proceed.',
  },
  {
    title: '2. Pricing & Payment',
    body: 'Quote valid 30 days. Payment due upon completion. Credit/debit cards add 3% processing fee. Returned checks: $35 fee.',
  },
  {
    title: '3. Change Orders',
    body: 'Any change to scope — additions, deletions, or modifications — requires a signed change order with updated pricing before that work starts.',
  },
  {
    title: '4. Permits',
    body: 'Where required, Voltura pulls permits on your behalf. Permit fees are itemized in the estimate. You are responsible for site access during inspections.',
  },
  {
    title: '5. Warranty — 12 Months Labor',
    body: 'Voltura warrants all labor for 12 months from job completion. Equipment carries manufacturer\'s warranty only. Warranty is void if work is altered by others.',
  },
  {
    title: '6. Drywall & Paint',
    body: 'We patch penetrations we make. Exact texture or paint match is not guaranteed and may need a separate contractor unless specifically quoted.',
  },
  {
    title: '7. Site Access & Safety',
    body: 'You must provide safe, unobstructed access to all work areas. If unsafe conditions are found (asbestos, mold, etc.), we may stop work until resolved at your cost.',
  },
  {
    title: '8. Existing Conditions',
    body: 'We are not responsible for pre-existing defects or code violations found during work. Any required remediation will be quoted as a change order.',
  },
  {
    title: '9. Late Payment',
    body: 'Balances unpaid after 30 days: 1.5%/month (18%/yr). You agree to pay collection costs including attorney fees if necessary.',
  },
  {
    title: '10. Cancellations',
    body: 'Less than 24-hour cancellation: up to $85 trip fee. Non-returnable materials ordered for your job are non-refundable.',
  },
  {
    title: '11. Limitation of Liability',
    body: 'Our liability is limited to the amount you paid under this contract. We are not liable for indirect, consequential, or punitive damages.',
  },
  {
    title: '12. Governing Law',
    body: 'Good-faith negotiation first, then mediation before litigation. Governed by Colorado law. Venue: El Paso County, Colorado.',
  },
]

interface InPersonSignatureProps {
  estimateId: string
  customerName: string | null
  total: number
  estimateName: string
  onClose: () => void
  onSigned: () => void
}

export function InPersonSignature({
  estimateId,
  customerName,
  total,
  estimateName,
  onClose,
  onSigned,
}: InPersonSignatureProps) {
  const [step, setStep] = useState<'tc' | 'sign'>('tc')
  const [openSection, setOpenSection] = useState<number | null>(null)
  const [signerName, setSignerName] = useState('')
  const [hasSig, setHasSig] = useState(false)
  const [signing, setSigning] = useState(false)
  const [done, setDone] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Size canvas once mounted
  useEffect(() => {
    if (step === 'sign' && canvasRef.current) {
      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      const ctx = canvas.getContext('2d')!
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
  }, [step])

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
    ctx.strokeStyle = '#C9A227'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (lastPos.current) {
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
    }
    ctx.stroke()
    lastPos.current = pos
    setHasSig(true)
  }
  function onPointerUp() { isDrawing.current = false; lastPos.current = null }

  function clearSignature() {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    setHasSig(false)
  }

  async function handleSign() {
    if (!hasSig || !signerName.trim() || signing) return
    setSigning(true)
    try {
      const dataUrl = canvasRef.current!.toDataURL('image/png')
      await signEstimate(estimateId, signerName.trim(), dataUrl)
      setDone(true)
      setTimeout(() => onSigned(), 2000)
    } catch {
      alert('Failed to save signature. Please try again.')
      setSigning(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-volturaBlue flex flex-col" style={{ touchAction: 'none' }}>

      {/* ── T&C Step ── */}
      {step === 'tc' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-volturaNavy/60">
            <button onClick={onClose} className="text-gray-500 text-sm">✕ Close</button>
            <span className="text-volturaGold font-bold tracking-widest text-xs uppercase">Terms &amp; Conditions</span>
            <div className="w-14" />
          </div>

          {/* Estimate summary */}
          <div className="px-5 py-4 bg-volturaNavy/40 border-b border-volturaNavy/60">
            <p className="text-gray-400 text-sm">{customerName} · {estimateName}</p>
            <p className="text-volturaGold text-2xl font-bold">${total.toLocaleString()}</p>
            <p className="text-gray-500 text-xs mt-1">Review each section below before signing</p>
          </div>

          {/* T&C accordion */}
          <div className="flex-1 overflow-y-auto divide-y divide-volturaNavy/40">
            {TC_SECTIONS.map((section, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenSection(openSection === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className={`text-sm font-semibold ${openSection === i ? 'text-volturaGold' : 'text-white'}`}>
                    {section.title}
                  </span>
                  {openSection === i
                    ? <ChevronUp size={16} className="text-volturaGold shrink-0" />
                    : <ChevronDown size={16} className="text-gray-500 shrink-0" />
                  }
                </button>
                {openSection === i && (
                  <div className="px-5 pb-4">
                    <p className="text-gray-300 text-sm leading-relaxed">{section.body}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="px-5 pb-8 pt-4 border-t border-volturaNavy/60">
            <p className="text-gray-500 text-xs text-center mb-3">
              Tap any section to expand. By continuing, you confirm you've had the opportunity to read and ask questions about these terms.
            </p>
            <button
              onClick={() => setStep('sign')}
              className="w-full bg-volturaGold text-volturaBlue font-bold py-4 rounded-2xl text-base"
            >
              Continue to Sign →
            </button>
          </div>
        </div>
      )}

      {/* ── Sign Step ── */}
      {step === 'sign' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-volturaNavy/60">
            <button onClick={() => setStep('tc')} className="text-gray-400 text-sm">← Back</button>
            <span className="text-white font-semibold text-sm">Sign &amp; Accept</span>
            <div className="w-12" />
          </div>

          {done ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center text-4xl">✅</div>
              <h2 className="text-white text-2xl font-bold">Signed!</h2>
              <p className="text-gray-400">Estimate accepted by {signerName}.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col px-5 py-5 gap-4 overflow-y-auto">
              {/* Amount summary */}
              <div className="text-center pb-2">
                <p className="text-gray-400 text-sm">{customerName} · {estimateName}</p>
                <p className="text-volturaGold text-3xl font-bold">${total.toLocaleString()}</p>
              </div>

              {/* Print name */}
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Print Name</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Customer's full name"
                  className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-volturaGold"
                  autoComplete="off"
                />
              </div>

              {/* Authorization statement */}
              <p className="text-gray-500 text-xs leading-relaxed bg-volturaNavy/30 rounded-xl px-4 py-3">
                By signing below, I authorize Voltura Power Group to proceed with the work described in this estimate ({estimateName}, ${total.toLocaleString()}), and I agree to the Terms &amp; Conditions reviewed on the previous screen, including payment terms, the 12-month labor warranty, and the cancellation policy.
              </p>

              {/* Signature canvas */}
              <div className="flex-1 min-h-[180px]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-400 text-xs uppercase tracking-wider">Signature</label>
                  {hasSig && (
                    <button onClick={clearSignature} className="text-gray-500 text-xs underline">Clear</button>
                  )}
                </div>
                <div className="rounded-2xl border-2 border-dashed border-volturaNavy overflow-hidden bg-volturaNavy/20 h-44 relative">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full touch-none block"
                    style={{ touchAction: 'none' }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerUp}
                  />
                  {!hasSig && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-gray-600 text-sm">Sign here with your finger</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sign button */}
              <button
                onClick={handleSign}
                disabled={!hasSig || !signerName.trim() || signing}
                className="w-full bg-volturaGold text-volturaBlue font-bold py-4 rounded-2xl text-lg disabled:opacity-40 mt-2"
              >
                {signing ? 'Saving Signature…' : 'Approve & Sign Estimate'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
