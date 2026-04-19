'use client'

import { useState, useRef } from 'react'
import { analyzePhotoForEstimate } from '@/lib/actions/ai-tools'

interface SuggestedItem {
  description: string
  price: number
  category: string
}

interface PhotoEstimateProps {
  onAddItems: (items: SuggestedItem[]) => void
}

export function PhotoEstimate({ onAddItems }: PhotoEstimateProps) {
  const [open, setOpen] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<SuggestedItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setSuggestions([])

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      setPreview(dataUrl)
      setAnalyzing(true)

      try {
        // Strip the data URL prefix to get raw base64
        const [header, base64] = dataUrl.split(',')
        const mimeMatch = header.match(/:(.*?);/)
        const mime = (mimeMatch?.[1] ?? 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp'
        const items = await analyzePhotoForEstimate(base64, mime)
        setSuggestions(items)
        setSelected(new Set(items.map((_, i) => i)))
      } catch {
        setError('Analysis failed — check your connection and try again.')
      } finally {
        setAnalyzing(false)
      }
    }
    reader.readAsDataURL(file)
  }

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function handleAdd() {
    const items = suggestions.filter((_, i) => selected.has(i))
    onAddItems(items)
    setOpen(false)
    setSuggestions([])
    setPreview(null)
    setSelected(new Set())
  }

  function handleReset() {
    setSuggestions([])
    setPreview(null)
    setSelected(new Set())
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-9 h-9 text-base text-gray-400 hover:text-volturaGold transition-colors rounded-lg hover:bg-white/5"
        title="Photo estimate — AI reads the job site"
        aria-label="Photo estimate"
      >
        📷
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center">
          <div className="bg-volturaNavy w-full max-w-lg rounded-t-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div>
                <h2 className="text-white font-bold text-base">📷 Photo Estimate</h2>
                <p className="text-gray-500 text-xs">Take a photo — AI identifies the work needed</p>
              </div>
              <button onClick={() => { setOpen(false); handleReset() }} className="text-gray-500 text-xl">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Photo upload */}
              {!preview && (
                <div
                  onClick={() => inputRef.current?.click()}
                  className="border-2 border-dashed border-volturaNavy/80 rounded-2xl h-44 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-volturaGold/40 transition-colors"
                >
                  <span className="text-4xl">📸</span>
                  <p className="text-gray-400 text-sm font-semibold">Tap to take photo or upload</p>
                  <p className="text-gray-600 text-xs">Panel, meter, wiring, violations</p>
                </div>
              )}

              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Preview */}
              {preview && (
                <div className="relative rounded-2xl overflow-hidden h-48">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Job site" className="w-full h-full object-cover" />
                  {!analyzing && (
                    <button
                      onClick={handleReset}
                      className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg"
                    >
                      Retake
                    </button>
                  )}
                  {analyzing && (
                    <div className="absolute inset-0 bg-volturaBlue/80 flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-2 border-volturaGold border-t-transparent rounded-full animate-spin" />
                      <p className="text-volturaGold text-sm font-semibold">Analyzing photo…</p>
                      <p className="text-gray-400 text-xs">Claude is reading the site</p>
                    </div>
                  )}
                </div>
              )}

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Suggested Line Items</p>
                  <div className="space-y-2">
                    {suggestions.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => toggle(i)}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${
                          selected.has(i)
                            ? 'bg-volturaGold/10 border-volturaGold/40'
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border shrink-0 mt-0.5 flex items-center justify-center ${
                          selected.has(i) ? 'bg-volturaGold border-volturaGold' : 'border-gray-600'
                        }`}>
                          {selected.has(i) && <span className="text-volturaBlue text-xs font-bold">✓</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold leading-snug">{item.description}</p>
                          <p className="text-gray-500 text-xs mt-0.5">{item.category}</p>
                        </div>
                        <p className="text-volturaGold text-sm font-bold shrink-0">${item.price.toLocaleString()}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {suggestions.length > 0 && (
              <div className="px-5 pb-8 pt-3 border-t border-white/10 shrink-0">
                <button
                  onClick={handleAdd}
                  disabled={!selected.size}
                  className="w-full bg-volturaGold text-volturaBlue font-bold py-3.5 rounded-xl text-sm disabled:opacity-40"
                >
                  Add {selected.size} Item{selected.size !== 1 ? 's' : ''} to Estimate
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
