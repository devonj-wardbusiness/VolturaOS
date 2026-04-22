'use client'

import { useState, useTransition } from 'react'
import { saveMaterialList } from '@/lib/actions/forms'
import type { Form } from '@/types'

interface MaterialListSheetProps {
  form: Form
  onClose: () => void
  onSave: (items: { name: string; qty: string }[]) => void
}

export function MaterialListSheet({ form, onClose, onSave }: MaterialListSheetProps) {
  const [items, setItems] = useState<{ name: string; qty: string }[]>(
    (form.line_items as { name: string; qty: string }[] | null) ?? []
  )
  const [, startTransition] = useTransition()

  function persist(next: { name: string; qty: string }[]) {
    startTransition(async () => {
      await saveMaterialList(form.id, next)
      onSave(next)
    })
  }

  function addItem() {
    const next = [...items, { name: '', qty: '' }]
    setItems(next)
  }

  function updateItem(index: number, field: 'name' | 'qty', value: string) {
    const next = items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    setItems(next)
    persist(next)
  }

  function removeItem(index: number) {
    const next = items.filter((_, i) => i !== index)
    setItems(next)
    persist(next)
  }

  return (
    <div className="fixed inset-0 z-50 bg-volturaBlue flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <button onClick={onClose} className="text-volturaGold text-sm font-medium">Done</button>
        <h2 className="text-white font-semibold">📋 Material List</h2>
        <div className="w-12" />
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {items.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-10">
            No items yet. Tap + Add Item to start.
          </p>
        )}
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className="flex-1 bg-volturaNavy text-white rounded-xl px-3 py-3 text-sm outline-none placeholder:text-gray-600"
              placeholder="Item name"
              value={item.name}
              onChange={e => updateItem(i, 'name', e.target.value)}
            />
            <input
              className="w-20 bg-volturaNavy text-white rounded-xl px-3 py-3 text-sm outline-none text-center placeholder:text-gray-600"
              placeholder="Qty"
              value={item.qty}
              onChange={e => updateItem(i, 'qty', e.target.value)}
            />
            <button
              onClick={() => removeItem(i)}
              className="text-gray-500 text-2xl leading-none px-1 hover:text-gray-300"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={addItem}
          className="w-full py-3 rounded-xl border border-volturaGold/40 text-volturaGold text-sm font-medium active:opacity-70"
        >
          + Add Item
        </button>
      </div>
    </div>
  )
}
