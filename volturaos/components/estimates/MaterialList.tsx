'use client'

import { useState } from 'react'
import { generateMaterialList } from '@/lib/actions/ai-tools'
import type { LineItem } from '@/types'

interface MaterialListProps {
  lineItems: LineItem[]
}

export function MaterialList({ lineItems }: MaterialListProps) {
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleOpen() {
    setOpen(true)
    if (list) return
    setLoading(true)
    try {
      const result = await generateMaterialList(lineItems)
      setList(result)
    } catch {
      setList('Failed to generate list. Check your AI connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={!lineItems.length}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-volturaGold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        title="Generate parts list from line items"
      >
        <span>📦</span>
        <span>Parts List</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center p-4">
          <div className="bg-volturaNavy w-full max-w-lg rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <h2 className="text-white font-bold text-base">Material Takeoff</h2>
                <p className="text-gray-500 text-xs">AI-generated from estimate line items</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 text-xl leading-none">✕</button>
            </div>

            {/* Content */}
            <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="flex items-center gap-3 py-8 justify-center">
                  <div className="w-5 h-5 border-2 border-volturaGold border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-400 text-sm">Generating parts list…</span>
                </div>
              ) : list ? (
                <pre className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap font-mono">
                  {list}
                </pre>
              ) : null}
            </div>

            {/* Copy button */}
            {list && !loading && (
              <div className="px-5 pb-5">
                <button
                  onClick={() => { navigator.clipboard.writeText(list); }}
                  className="w-full bg-volturaGold/10 border border-volturaGold/40 text-volturaGold font-semibold py-3 rounded-xl text-sm hover:bg-volturaGold/20 transition-colors"
                >
                  Copy to Clipboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
