'use client'

import { useState } from 'react'
import type { LineItem, PricebookEntry } from '@/types'
import { FootageInput } from './FootageInput'
import { updatePricebookPrice } from '@/lib/actions/pricebook'

interface LineItemRowProps {
  item: LineItem
  pricebookEntry?: PricebookEntry
  onFootageChange: (footage: number | null, price: number) => void
  onRemove: () => void
  onPriceUpdate?: (price: number, pricebookId?: string) => void
  onDescriptionUpdate?: (desc: string) => void
}

export function LineItemRow({ item, pricebookEntry, onFootageChange, onRemove, onPriceUpdate, onDescriptionUpdate }: LineItemRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [editingPrice, setEditingPrice] = useState(false)
  const [draftPrice, setDraftPrice] = useState(String(item.price))
  const [savingPricebook, setSavingPricebook] = useState(false)

  const isFootage = pricebookEntry?.is_footage_item ?? false
  const brackets = isFootage && pricebookEntry
    ? [
        { label: '0-25ft', price: pricebookEntry.price_good ?? 0 },
        { label: '25-50ft', price: pricebookEntry.price_better ?? 0 },
        { label: '50-100ft', price: pricebookEntry.price_best ?? 0 },
      ]
    : []

  function handlePriceTap(e: React.MouseEvent) {
    if (!onPriceUpdate || isFootage) return
    e.stopPropagation()
    setDraftPrice(String(item.price))
    setEditingPrice(true)
  }

  function handlePriceSave() {
    const parsed = parseFloat(draftPrice)
    if (isNaN(parsed) || parsed < 0) { setEditingPrice(false); return }
    onPriceUpdate?.(parsed)
    setEditingPrice(false)
  }

  async function handleSaveAndUpdatePricebook() {
    if (!pricebookEntry || !onPriceUpdate) return
    const parsed = parseFloat(draftPrice)
    if (isNaN(parsed) || parsed < 0) return
    setSavingPricebook(true)
    try {
      await updatePricebookPrice(pricebookEntry.id, 'price_better', parsed)
      onPriceUpdate(parsed, pricebookEntry.id)
      setEditingPrice(false)
    } finally {
      setSavingPricebook(false)
    }
  }

  return (
    <div className="bg-volturaNavy/30 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
        onClick={() => isFootage ? setExpanded(!expanded) : undefined}
      >
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm truncate">{item.description}</p>
          {item.footage && (
            <p className="text-gray-500 text-xs">{item.footage}ft</p>
          )}
          {item.pricebook_description !== undefined && onDescriptionUpdate && (
            <input
              type="text"
              value={item.pricebook_description}
              onChange={(e) => onDescriptionUpdate(e.target.value)}
              placeholder="Add customer description…"
              className="w-full text-xs text-gray-400 bg-transparent outline-none placeholder-gray-600 focus:text-gray-300 mt-0.5"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>

        {editingPrice ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <span className="text-volturaGold text-sm">$</span>
            <input
              type="number"
              value={draftPrice}
              onChange={(e) => setDraftPrice(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePriceSave(); if (e.key === 'Escape') setEditingPrice(false) }}
              autoFocus
              className="w-20 bg-volturaNavy text-volturaGold font-semibold text-sm text-right rounded-lg px-2 py-1 outline-none border border-volturaGold/40"
            />
            <button onClick={handlePriceSave} className="text-green-400 text-sm font-bold px-1">✓</button>
            <button onClick={() => setEditingPrice(false)} className="text-gray-500 text-sm px-1">✕</button>
          </div>
        ) : (
          <button
            onClick={handlePriceTap}
            className={`text-volturaGold font-semibold text-sm whitespace-nowrap ${onPriceUpdate && !isFootage ? 'underline decoration-dotted decoration-volturaGold/40' : ''}`}
            title={onPriceUpdate && !isFootage ? 'Tap to edit price' : undefined}
          >
            ${item.price.toLocaleString()}
          </button>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="text-red-400/60 hover:text-red-400 text-lg leading-none px-1"
        >
          &times;
        </button>
      </div>

      {/* Pricebook update prompt — appears after editing price */}
      {editingPrice && pricebookEntry && onPriceUpdate && (
        <div className="px-3 pb-3 border-t border-volturaNavy/50 pt-2 flex gap-2">
          <button
            onClick={handlePriceSave}
            className="flex-1 text-xs text-gray-400 bg-white/5 rounded-lg py-1.5"
          >
            This estimate only
          </button>
          <button
            onClick={handleSaveAndUpdatePricebook}
            disabled={savingPricebook}
            className="flex-1 text-xs text-volturaGold bg-volturaGold/10 border border-volturaGold/30 rounded-lg py-1.5 font-semibold disabled:opacity-50"
          >
            {savingPricebook ? 'Saving…' : '+ Update pricebook'}
          </button>
        </div>
      )}

      {expanded && isFootage && pricebookEntry && (
        <div className="px-3 pb-3 border-t border-volturaNavy/50 pt-2">
          <FootageInput
            footageGroup={pricebookEntry.footage_group ?? ''}
            brackets={brackets}
            perFootRate={pricebookEntry.per_foot_rate ?? 0}
            selectedBracketIndex={null}
            customFootage={item.footage ?? null}
            onBracketSelect={(_idx, price) => onFootageChange(null, price)}
            onCustomFootage={(ft, price) => onFootageChange(ft, price)}
          />
        </div>
      )}
    </div>
  )
}
