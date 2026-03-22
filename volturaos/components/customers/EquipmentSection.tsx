'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { CustomerEquipment } from '@/types'
import { createEquipment, deleteEquipment } from '@/lib/actions/customers'

export function EquipmentSection({ customerId, equipment }: { customerId: string; equipment: CustomerEquipment[] }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({ type: '', brand: '', amperage: '', age_years: '', notes: '' })

  function handleAdd() {
    startTransition(async () => {
      await createEquipment({
        customer_id: customerId,
        type: form.type,
        brand: form.brand || undefined,
        amperage: form.amperage || undefined,
        age_years: form.age_years ? parseInt(form.age_years) : undefined,
        notes: form.notes || undefined,
      })
      setAdding(false)
      setForm({ type: '', brand: '', amperage: '', age_years: '', notes: '' })
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteEquipment(id)
      router.refresh()
    })
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">Equipment</h3>
        <button onClick={() => setAdding(true)} className="text-volturaGold text-sm">+ Add</button>
      </div>
      {equipment.length === 0 && !adding && (
        <p className="text-gray-500 text-sm">No equipment on file</p>
      )}
      {equipment.map((eq) => (
        <div key={eq.id} className="bg-volturaNavy/50 rounded-xl p-3 mb-2 flex items-start justify-between">
          <div>
            <p className="text-white text-sm font-medium">{eq.type}</p>
            {eq.brand && <p className="text-gray-400 text-xs">{eq.brand} {eq.amperage && `· ${eq.amperage}`}</p>}
            {eq.age_years && <p className="text-gray-500 text-xs">~{eq.age_years} years old</p>}
            {eq.notes && <p className="text-gray-500 text-xs mt-1">{eq.notes}</p>}
          </div>
          <button onClick={() => handleDelete(eq.id)} className="text-red-400 text-xs ml-2">&times;</button>
        </div>
      ))}
      {adding && (
        <div className="bg-volturaNavy/30 rounded-xl p-3 space-y-2">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full bg-volturaNavy text-white rounded-lg px-3 py-2 text-sm">
            <option value="">Select type...</option>
            <option value="Panel">Panel</option>
            <option value="EV Charger">EV Charger</option>
            <option value="Generator">Generator</option>
            <option value="Subpanel">Subpanel</option>
            <option value="Other">Other</option>
          </select>
          <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Brand"
            className="w-full bg-volturaNavy text-white rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input value={form.amperage} onChange={(e) => setForm({ ...form, amperage: e.target.value })} placeholder="Amperage"
              className="flex-1 bg-volturaNavy text-white rounded-lg px-3 py-2 text-sm" />
            <input type="number" value={form.age_years} onChange={(e) => setForm({ ...form, age_years: e.target.value })} placeholder="Age (yrs)"
              className="w-24 bg-volturaNavy text-white rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)} className="flex-1 bg-volturaNavy text-white py-2 rounded-lg text-sm">Cancel</button>
            <button onClick={handleAdd} disabled={!form.type || isPending} className="flex-1 bg-volturaGold text-volturaBlue py-2 rounded-lg font-bold text-sm disabled:opacity-50">
              {isPending ? '...' : 'Add'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
