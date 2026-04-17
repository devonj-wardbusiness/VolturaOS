'use client'

import { useState, useRef, useEffect } from 'react'
import type { PricebookEntry, LineItem } from '@/types'

interface VoiceLineItemsProps {
  pricebook: PricebookEntry[]
  onAdd: (items: LineItem[]) => void
  onFallback: () => void  // called when voice fails — parent switches to Search tab
}

export function VoiceLineItems({ pricebook, onAdd, onFallback }: VoiceLineItemsProps) {
  const [supported, setSupported] = useState(true)
  const [listening, setListening] = useState(false)
  const [displayTranscript, setDisplayTranscript] = useState('')
  const [proposed, setProposed] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null)
  // Use a ref for transcript so onend handler always reads the latest value
  const transcriptRef = useRef('')

  const pricebookRef = useRef(pricebook)
  pricebookRef.current = pricebook
  const onFallbackRef = useRef(onFallback)
  onFallbackRef.current = onFallback

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) { setSupported(false); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recog: any = new SR()
    recog.continuous = false
    recog.interimResults = true
    recog.lang = 'en-US'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recog.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = Array.from(e.results as any[]).map((r: any) => r[0].transcript).join(' ')
      transcriptRef.current = t
      setDisplayTranscript(t)
    }
    recog.onend = async () => {
      setListening(false)
      const t = transcriptRef.current  // read from ref — always fresh
      if (!t.trim()) return
      setLoading(true)
      setError(null)
      try {
        const slim = pricebookRef.current.map((e) => ({
          id: e.id,
          job_type: e.job_type,
          price_better: e.price_better,
          category: e.category,
        }))
        const res = await fetch('/api/voice-line-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: t, pricebook: slim }),
        })
        const { items, error: apiError } = await res.json()
        if (apiError || !items.length) {
          setError("Couldn't match — try typing instead")
          onFallbackRef.current()
        } else {
          setProposed(items)
        }
      } catch {
        setError("Couldn't match — try typing instead")
        onFallbackRef.current()
      } finally {
        setLoading(false)
      }
    }
    recogRef.current = recog
  }, [])  // empty deps — created once, refs keep values fresh

  if (!supported) {
    return <p className="text-gray-500 text-xs text-center py-4">Voice not available on this browser — use Search.</p>
  }

  function startListening() {
    transcriptRef.current = ''
    setDisplayTranscript('')
    setProposed([])
    setError(null)
    recogRef.current?.start()
    setListening(true)
  }

  function stopListening() {
    recogRef.current?.stop()
  }

  function handleConfirm() {
    onAdd(proposed)
    setProposed([])
    setDisplayTranscript('')
    transcriptRef.current = ''
  }

  return (
    <div className="space-y-3 py-2">
      <p className="text-gray-400 text-xs text-center">
        {listening ? 'Listening… let go when done' : 'Hold mic · say what you need · let go'}
      </p>

      <div className="flex justify-center">
        <button
          onTouchStart={startListening}
          onTouchEnd={stopListening}
          onMouseDown={startListening}
          onMouseUp={stopListening}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-volturaBlue font-bold text-2xl transition-all select-none ${
            listening
              ? 'bg-volturaGold scale-110 shadow-[0_0_0_12px_rgba(245,200,66,0.2)]'
              : 'bg-volturaGold shadow-[0_0_0_8px_rgba(245,200,66,0.12)]'
          }`}
          aria-label={listening ? 'Release to process' : 'Hold to speak'}
        >
          🎤
        </button>
      </div>

      {displayTranscript && (
        <div className="bg-white/5 rounded-xl px-4 py-3 text-sm text-white/70 italic text-center">
          &ldquo;{displayTranscript}&rdquo;
        </div>
      )}

      {loading && (
        <p className="text-gray-400 text-xs text-center animate-pulse">Matching to your pricebook…</p>
      )}

      {error && (
        <p className="text-red-400 text-xs text-center">{error}</p>
      )}

      {proposed.length > 0 && (
        <div className="space-y-2">
          <p className="text-gray-400 text-xs uppercase tracking-wider text-center">Matched to your pricebook</p>
          {proposed.map((item, i) => (
            <div key={i} className="flex justify-between items-center bg-volturaGold/8 border border-volturaGold/20 rounded-xl px-4 py-3">
              <span className="text-white text-sm">{item.description}</span>
              <span className="text-volturaGold font-bold text-sm">${item.price.toLocaleString()}</span>
            </div>
          ))}
          <button
            onClick={handleConfirm}
            className="w-full bg-volturaGold text-volturaBlue font-bold rounded-xl py-3 text-sm active:scale-[0.98] transition-transform"
          >
            Add {proposed.length} Item{proposed.length > 1 ? 's' : ''} →
          </button>
        </div>
      )}
    </div>
  )
}
