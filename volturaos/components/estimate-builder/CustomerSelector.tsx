'use client'

import { useState, useTransition } from 'react'
import { searchCustomers, createCustomer } from '@/lib/actions/customers'
import type { Customer } from '@/types'

interface CustomerSelectorProps {
  selectedId: string | null
  selectedName: string | null
  onSelect: (id: string, name: string) => void
}

export function CustomerSelector({ selectedId, selectedName, onSelect }: CustomerSelectorProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [isPending, startTransition] = useTransition()
  const [quickAdd, setQuickAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')

  function handleSearch(q: string) {
    setQuery(q)
    startTransition(async () => {
      const data = await searchCustomers(q)
      setResults(data)
    })
  }

  function handleQuickAdd() {
    startTransition(async () => {
      const c = await createCustomer({ name: newName, phone: newPhone })
      onSelect(c.id, c.name)
      setOpen(false)
      setQuickAdd(false)
    })
  }

  if (!open) {
    return (
      <button onClick={() => { setOpen(true); handleSearch('') }} className="w-full bg-volturaNavy rounded-xl p-4 text-left">
        {selectedId ? (
          <><span className="text-gray-400 text-xs block">Customer</span><span className="text-white font-semibold">{selectedName}</span></>
        ) : (
          <span className="text-gray-400">Select customer...</span>
        )}
      </button>
    )
  }

  return (
    <div className="bg-volturaNavy rounded-xl p-4 space-y-3">
      <input type="text" value={query} onChange={(e) => handleSearch(e.target.value)} placeholder="Search customers..."
        className="w-full bg-volturaBlue text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-volturaGold" autoFocus />
      <div className="max-h-48 overflow-y-auto space-y-1">
        {results.map((c) => (
          <button key={c.id} onClick={() => { onSelect(c.id, c.name); setOpen(false) }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-volturaBlue text-white text-sm">{c.name} {c.phone && <span className="text-gray-500">&middot; {c.phone}</span>}</button>
        ))}
        {results.length === 0 && !isPending && <p className="text-gray-500 text-xs text-center py-2">No customers found</p>}
      </div>
      {!quickAdd ? (
        <div className="flex gap-2">
          <button onClick={() => setQuickAdd(true)} className="flex-1 bg-volturaGold/20 text-volturaGold py-2 rounded-lg text-sm font-semibold">+ Quick Add</button>
          <button onClick={() => setOpen(false)} className="text-gray-400 text-sm px-3">Cancel</button>
        </div>
      ) : (
        <div className="space-y-2 border-t border-volturaBlue pt-3">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name *"
            className="w-full bg-volturaBlue text-white rounded-lg px-3 py-2 text-sm" />
          <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Phone"
            className="w-full bg-volturaBlue text-white rounded-lg px-3 py-2 text-sm" />
          <button onClick={handleQuickAdd} disabled={!newName.trim() || isPending}
            className="w-full bg-volturaGold text-volturaBlue py-2 rounded-lg font-bold text-sm disabled:opacity-50">
            {isPending ? '...' : 'Add & Select'}
          </button>
        </div>
      )}
    </div>
  )
}
