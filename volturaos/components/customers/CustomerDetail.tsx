'use client'

import { useState, useTransition } from 'react'
import type { Customer, MaintenanceAgreement } from '@/types'
import { updateCustomer, deleteCustomer } from '@/lib/actions/customers'
import { createAgreement, cancelAgreement } from '@/lib/actions/agreements'
import { useRouter } from 'next/navigation'

export function CustomerDetail({ customer, agreement }: { customer: Customer; agreement: MaintenanceAgreement | null }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: customer.name,
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    address: customer.address ?? '',
    city: customer.city,
    zip: customer.zip ?? '',
    property_type: customer.property_type,
    notes: customer.notes ?? '',
  })

  function handleSave() {
    startTransition(async () => {
      await updateCustomer(customer.id, form)
      setEditing(false)
      router.refresh()
    })
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${customer.name}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteCustomer(customer.id)
      router.push('/customers')
    } catch (err) {
      alert('Could not delete — customer may have existing estimates or jobs.')
      setDeleting(false)
    }
  }

  if (!editing) {
    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-2xl font-bold">{customer.name}</h2>
          <div className="flex gap-3">
            <button onClick={() => setEditing(true)} className="text-volturaGold text-sm">Edit</button>
            <button onClick={handleDelete} disabled={deleting} className="text-red-400 text-sm disabled:opacity-40">
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
        {customer.phone && <p className="text-gray-300">{customer.phone}</p>}
        {customer.email && <p className="text-gray-400 text-sm">{customer.email}</p>}
        {customer.address && <p className="text-gray-400 text-sm">{customer.address}, {customer.city} {customer.zip}</p>}
        <span className="inline-block bg-volturaNavy text-gray-400 text-xs px-2.5 py-1 rounded-full capitalize">{customer.property_type}</span>
        {customer.notes && <p className="text-gray-500 text-sm bg-volturaNavy/50 rounded-xl p-3 mt-2">{customer.notes}</p>}

        {/* Maintenance Agreement */}
        <div className="bg-volturaNavy/50 rounded-xl p-4 mt-4">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Maintenance Plan</p>
          {agreement ? (
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-400 text-sm font-semibold">🛡 Active — $199/yr</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Renews {new Date(agreement.renewal_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!window.confirm('Cancel maintenance plan?')) return
                    startTransition(async () => {
                      await cancelAgreement(agreement.id, customer.id)
                      router.refresh()
                    })
                  }}
                  disabled={isPending}
                  className="text-red-400 text-xs disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
              <ul className="mt-3 space-y-1">
                {['Annual panel inspection', 'Safety walkthrough / GFCI + AFCI test', 'Priority scheduling', '10% labor discount', 'Free Level 1 diagnostic'].map(item => (
                  <li key={item} className="text-gray-400 text-xs flex items-start gap-1">
                    <span className="text-green-400 mt-0.5">✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <button
              onClick={async () => {
                if (!window.confirm('Add annual maintenance plan for $199?')) return
                startTransition(async () => {
                  await createAgreement(customer.id)
                  router.refresh()
                })
              }}
              disabled={isPending}
              className="w-full bg-volturaGold/10 border border-volturaGold/30 text-volturaGold rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
            >
              {isPending ? 'Adding...' : '🛡 Add Maintenance Plan — $199/yr'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-3">
      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-volturaGold" />
      <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone"
        className="w-full bg-volturaNavy text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold" />
      <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email"
        className="w-full bg-volturaNavy text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold" />
      <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address"
        className="w-full bg-volturaNavy text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold" />
      <div className="flex gap-2">
        <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City"
          className="flex-1 bg-volturaNavy text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold" />
        <input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} placeholder="Zip"
          className="w-24 bg-volturaNavy text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold" />
      </div>
      <select value={form.property_type} onChange={(e) => setForm({ ...form, property_type: e.target.value as 'residential' | 'commercial' })}
        className="w-full bg-volturaNavy text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold">
        <option value="residential">Residential</option>
        <option value="commercial">Commercial</option>
      </select>
      <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" rows={3}
        className="w-full bg-volturaNavy text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold" />
      <div className="flex gap-2">
        <button onClick={() => setEditing(false)} className="flex-1 bg-volturaNavy text-white py-2.5 rounded-xl font-semibold text-sm">Cancel</button>
        <button onClick={handleSave} disabled={isPending} className="flex-1 bg-volturaGold text-volturaBlue py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
          {isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
