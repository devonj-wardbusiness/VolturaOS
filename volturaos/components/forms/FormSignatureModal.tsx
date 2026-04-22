'use client'

import { useState, useRef, useEffect } from 'react'
import { signEstimate } from '@/lib/actions/estimates'

interface FormSignatureModalProps {
  formId: string
  onClose: () => void
  onSigned: () => void
}

export function FormSignatureModal({ formId, onClose, onSigned }: FormSignatureModalProps) {
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

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      const ctx = canvas.getContext('2d')!
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
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
      await signEstimate(formId, signerName.trim(), dataUrl)
      setDone(true)
      setTimeout(() => onSigned(), 2000)
    } catch {
      alert('Failed to save signature. Please try again.')
      setSigning(false)
    }
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-[60] bg-volturaBlue flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl mb-4 block">✅</span>
          <p className="text-white text-xl font-semibold">Signed!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] bg-volturaBlue flex flex-col">
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <button onClick={onClose} className="text-gray-400 text-sm">Cancel</button>
        <h2 className="text-white font-semibold">Sign</h2>
        <div className="w-14" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <label className="text-gray-400 text-sm block mb-2">Print Name</label>
          <input
            className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 outline-none placeholder:text-gray-600"
            placeholder="Full name"
            value={signerName}
            onChange={e => setSignerName(e.target.value)}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-gray-400 text-sm">Signature</label>
            {hasSig && (
              <button onClick={clearSignature} className="text-gray-400 text-sm">Clear</button>
            )}
          </div>
          <canvas
            ref={canvasRef}
            className="w-full h-40 bg-volturaNavy rounded-xl touch-none"
            style={{ touchAction: 'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
          {!hasSig && (
            <p className="text-gray-600 text-xs text-center mt-1">Draw signature above</p>
          )}
        </div>
      </div>

      <div className="p-4">
        <button
          onClick={handleSign}
          disabled={!hasSig || !signerName.trim() || signing}
          className="w-full py-4 bg-volturaGold text-volturaBlue font-bold rounded-xl disabled:opacity-40 active:opacity-80"
        >
          {signing ? 'Saving…' : 'Submit Signature'}
        </button>
      </div>
    </div>
  )
}
