'use client'

import { useState, useTransition } from 'react'
import { getNeighborhoodCustomers, sendBlitzSMS } from '@/lib/actions/jobs'

interface NeighborhoodBlitzProps {
  jobId: string
  jobType: string
  zip: string | null
}

type NearbyCustomer = { id: string; name: string; phone: string; address: string | null; zip: string | null }

export function NeighborhoodBlitz({ jobId, jobType, zip }: NeighborhoodBlitzProps) {
  const [open, setOpen] = useState(false)
  const [customers, setCustomers] = useState<NearbyCustomer[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!zip) return null

  async function handleOpen() {
    setOpen(true)
    if (customers.length) return
    setLoading(true)
    try {
      const nearby = await getNeighborhoodCustomers(jobId)
      setCustomers(nearby)
      setSelected(new Set(nearby.map((c) => c.id)))
    } catch {
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  function toggleCustomer(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleBlast() {
    const ids = Array.from(selected)
    if (!ids.length) return
    startTransition(async () => {
      const count = await sendBlitzSMS(ids, jobType, zip!)
      setSent(count)
    })
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="w-full flex items-center justify-center gap-2 bg-volturaNavy/60 border border-volturaGold/30 text-volturaGold font-semibold py-3 rounded-xl text-sm hover:bg-volturaGold/10 transition-colors"
      >
        <span>📡</span>
        <span>Blitz Nearby Customers</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center">
          <div className="bg-volturaNavy w-full max-w-lg rounded-t-2xl overflow-hidden max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div>
                <h2 className="text-white font-bold text-base">📡 Neighborhood Blitz</h2>
                <p className="text-gray-500 text-xs">Customers in {zip} — SMS blast after job</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 text-xl leading-none">✕</button>
            </div>

            {/* Customer list */}
            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center gap-3 py-10">
                  <div className="w-5 h-5 border-2 border-volturaGold border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-400 text-sm">Finding nearby customers…</span>
                </div>
              )}
              {!loading && customers.length === 0 && (
                <div className="text-center py-10 px-5">
                  <p className="text-gray-500 text-sm">No other customers found in zip code {zip}.</p>
                  <p className="text-gray-600 text-xs mt-1">Add zip codes to customer records to use this feature.</p>
                </div>
              )}
              {!loading && customers.length > 0 && (
                <div className="divide-y divide-white/5">
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => toggleCustomer(c.id)}
                      className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-white/5"
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                        selected.has(c.id)
                          ? 'bg-volturaGold border-volturaGold'
                          : 'border-gray-600'
                      }`}>
                        {selected.has(c.id) && <span className="text-volturaBlue text-xs font-bold">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{c.name}</p>
                        <p className="text-gray-500 text-xs">{c.phone}{c.address ? ` · ${c.address}` : ''}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pb-8 pt-4 border-t border-white/10 shrink-0 space-y-2">
              {sent !== null ? (
                <div className="text-center py-2">
                  <p className="text-green-400 font-bold text-lg">✓ Sent to {sent} customers</p>
                  <p className="text-gray-500 text-xs mt-1">SMS blast complete</p>
                </div>
              ) : (
                <>
                  <p className="text-gray-500 text-xs text-center">
                    {selected.size} of {customers.length} customers selected
                  </p>
                  <button
                    onClick={handleBlast}
                    disabled={!selected.size || isPending || customers.length === 0}
                    className="w-full bg-volturaGold text-volturaBlue font-bold py-3.5 rounded-xl text-sm disabled:opacity-40"
                  >
                    {isPending ? 'Sending…' : `Send Blitz SMS to ${selected.size} Customer${selected.size !== 1 ? 's' : ''}`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
