'use client'

import { useState, useRef, useEffect } from 'react'
import { signEstimate } from '@/lib/actions/estimates'
import { FORM_TEMPLATES } from '@/lib/form-templates'
import type { Form } from '@/types'

interface PublicFormViewProps {
  form: Form
  customerName: string
}

export function PublicFormView({ form, customerName }: PublicFormViewProps) {
  const [showSign, setShowSign] = useState(false)
  const [signerName, setSignerName] = useState(customerName)
  const [hasSig, setHasSig] = useState(false)
  const [signing, setSigning] = useState(false)
  const [done, setDone] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  const template = FORM_TEMPLATES[form.form_type]
  const isSigned = form.status === 'Approved'

  useEffect(() => {
    if (showSign && canvasRef.current) {
      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      const ctx = canvas.getContext('2d')!
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
  }, [showSign])

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
    canvasRef.current.getContext('2d')!.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    setHasSig(false)
  }

  async function handleSign() {
    if (!hasSig || !signerName.trim() || signing) return
    setSigning(true)
    try {
      const dataUrl = canvasRef.current!.toDataURL('image/png')
      await signEstimate(form.id, signerName.trim(), dataUrl)
      setDone(true)
    } catch {
      alert('Failed to save. Please try again.')
      setSigning(false)
    }
  }

  if (done) {
    return (
      <div className="text-center py-12">
        <span className="text-6xl mb-4 block">✅</span>
        <p className="text-white text-xl font-semibold">Signed!</p>
        <p className="text-gray-400 text-sm mt-2">Thank you, {signerName}.</p>
      </div>
    )
  }

  if (isSigned) {
    return (
      <div className="bg-green-900/30 border border-green-700/30 rounded-xl p-4">
        <p className="text-green-400 font-semibold">✅ Already signed by {form.signer_name}</p>
        {form.signed_at && (
          <p className="text-gray-400 text-sm mt-1">
            {new Date(form.signed_at).toLocaleDateString()}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="bg-volturaNavy rounded-xl p-4">
        <p className="text-gray-300 text-sm leading-relaxed">{template?.body}</p>
      </div>

      {!showSign ? (
        <button
          onClick={() => setShowSign(true)}
          className="w-full py-4 bg-volturaGold text-volturaBlue font-bold rounded-xl active:opacity-80"
        >
          Sign
        </button>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm block mb-2">Print Name</label>
            <input
              className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 outline-none"
              value={signerName}
              onChange={e => setSignerName(e.target.value)}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-gray-400 text-sm">Signature</label>
              {hasSig && <button onClick={clearSignature} className="text-gray-400 text-sm">Clear</button>}
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
          <button
            onClick={handleSign}
            disabled={!hasSig || !signerName.trim() || signing}
            className="w-full py-4 bg-volturaGold text-volturaBlue font-bold rounded-xl disabled:opacity-40 active:opacity-80"
          >
            {signing ? 'Saving…' : 'Submit Signature'}
          </button>
        </div>
      )}
    </div>
  )
}
