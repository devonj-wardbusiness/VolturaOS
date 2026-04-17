'use client'

import { useState, useRef, useEffect } from 'react'
import { signChangeOrder } from '@/lib/actions/change-orders'
import type { LineItem, ChangeOrder } from '@/types'

interface ChangeOrderSignClientProps {
  changeOrder: ChangeOrder
  originalLineItems: LineItem[]
  originalTotal: number
  customerName: string
}

export function ChangeOrderSignClient({
  changeOrder,
  originalLineItems,
  originalTotal,
  customerName,
}: ChangeOrderSignClientProps) {
  const [signed, setSigned] = useState(changeOrder.status === 'Signed')
  const [hasSig, setHasSig] = useState(false)
  const [signing, setSigning] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  const coItems = (changeOrder.line_items ?? []) as LineItem[]
  const combinedTotal = originalTotal + changeOrder.total

  // Size canvas on mount
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    const ctx = canvas.getContext('2d')!
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
  }, [])

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

  function onPointerUp() {
    isDrawing.current = false
    lastPos.current = null
  }

  function clearCanvas() {
    if (!canvasRef.current) return
    const c = canvasRef.current
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    setHasSig(false)
  }

  async function handleAuthorize() {
    if (!hasSig || signing) return
    setSigning(true)
    try {
      const dataUrl = canvasRef.current!.toDataURL('image/png')
      await signChangeOrder(changeOrder.id, dataUrl)
      setSigned(true)
    } catch {
      alert('Failed to save signature. Please try again.')
    } finally {
      setSigning(false)
    }
  }

  if (signed) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">✅</p>
        <p className="text-white font-bold text-xl mb-1">Change Order Authorized</p>
        <p className="text-gray-400 text-sm">Work can now proceed. Thank you, {customerName}!</p>
        <p className="text-volturaGold font-bold text-2xl mt-4">${combinedTotal.toLocaleString()}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-300 text-sm leading-relaxed">
        Additional work was found during your service. Please review and sign to authorize:
      </p>

      {/* Original items (greyed) */}
      {originalLineItems.length > 0 && (
        <div className="opacity-50">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Original (already authorized)</p>
          {originalLineItems.map((item, i) => (
            <div key={i} className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-gray-400 text-sm">{item.description}</span>
              <span className="text-gray-400 text-sm">${item.price.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* New change order items */}
      <div>
        <p className="text-volturaGold text-xs font-bold uppercase tracking-wider mb-2">Additional work</p>
        {coItems.map((item, i) => (
          <div key={i} className="flex justify-between py-2 border-b border-volturaGold/10">
            <span className="text-white text-sm">{item.description}</span>
            <span className="text-volturaGold font-semibold text-sm">${item.price.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* Combined total */}
      <div className="flex justify-between pt-2 border-t border-white/10">
        <span className="text-white font-bold">Total</span>
        <span className="text-volturaGold font-bold text-lg">${combinedTotal.toLocaleString()}</span>
      </div>

      {/* Inline signature canvas */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-400 text-xs">Sign to authorize additional work:</p>
          {hasSig && (
            <button onClick={clearCanvas} className="text-gray-500 text-xs">Clear</button>
          )}
        </div>
        <canvas
          ref={canvasRef}
          className="w-full h-28 bg-white/5 border border-white/15 rounded-xl touch-none"
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      </div>

      <button
        onClick={handleAuthorize}
        disabled={!hasSig || signing}
        className="w-full bg-volturaGold text-volturaBlue font-bold py-3 rounded-xl text-base disabled:opacity-40"
      >
        {signing ? 'Saving…' : 'Authorize Change Order'}
      </button>
    </div>
  )
}
