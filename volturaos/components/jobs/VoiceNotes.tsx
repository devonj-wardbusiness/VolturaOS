'use client'

import { useState, useRef, useCallback } from 'react'
import { cleanupVoiceNotes } from '@/lib/actions/ai-tools'

interface VoiceNotesProps {
  jobType: string
  onTranscript: (text: string) => void
}

export function VoiceNotes({ jobType, onTranscript }: VoiceNotesProps) {
  const [listening, setListening] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef<unknown>(null)
  const rawRef = useRef('')

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setSupported(false); return }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SR() as any
    rec.continuous = true
    rec.interimResults = false
    rec.lang = 'en-US'
    rawRef.current = ''

    rec.onresult = (e: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const event = e as any
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          rawRef.current += ' ' + event.results[i][0].transcript
        }
      }
    }

    rec.onerror = () => { setListening(false) }
    rec.onend = async () => {
      setListening(false)
      const raw = rawRef.current.trim()
      if (!raw) return
      setCleaning(true)
      try {
        const cleaned = await cleanupVoiceNotes(raw, jobType)
        onTranscript(cleaned)
      } catch {
        onTranscript(raw)
      } finally {
        setCleaning(false)
      }
    }

    rec.start()
    recognitionRef.current = rec
    setListening(true)
  }, [jobType, onTranscript])

  const stopListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(recognitionRef.current as any)?.stop()
  }, [])

  if (!supported) return null

  return (
    <button
      type="button"
      onClick={listening ? stopListening : startListening}
      disabled={cleaning}
      title={listening ? 'Stop recording' : 'Voice note'}
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors ${
        listening
          ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
          : cleaning
          ? 'bg-volturaGold/10 text-volturaGold border border-volturaGold/30'
          : 'bg-white/5 text-gray-400 border border-white/10 hover:border-volturaGold/30 hover:text-volturaGold'
      }`}
    >
      {cleaning ? (
        <>
          <div className="w-3 h-3 border border-volturaGold border-t-transparent rounded-full animate-spin" />
          <span>Cleaning up…</span>
        </>
      ) : listening ? (
        <>
          <span className="w-2 h-2 bg-red-500 rounded-full" />
          <span>Stop</span>
        </>
      ) : (
        <>
          <span>🎙️</span>
          <span>Voice Note</span>
        </>
      )}
    </button>
  )
}
