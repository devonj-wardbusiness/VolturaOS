import { getPublicInvoice } from '@/lib/actions/invoices'
import { notFound } from 'next/navigation'
import type { LineItem } from '@/types'

export const dynamic = 'force-dynamic'

export default async function PublicInvoiceView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getPublicInvoice(id)
  if (!result) notFound()

  const { invoice, customer } = result
  const lineItems = (invoice.line_items ?? []) as LineItem[]

  return (
    <div className="min-h-dvh bg-volturaBlue px-4 py-8 max-w-lg mx-auto">
      <header className="mb-8">
        <h1 className="text-volturaGold text-3xl font-bold tracking-widest">VOLTURA</h1>
        <p className="text-gray-400 text-sm">Power Group — Colorado Springs, CO</p>
        <p className="text-gray-400 text-xs mt-1">License #3001608</p>
      </header>

      <div className="bg-volturaNavy rounded-2xl p-5 mb-6">
        <p className="text-gray-400 text-sm mb-1">Invoice for</p>
        <p className="text-white text-xl font-bold">{customer.name}</p>
        {customer.address && <p className="text-gray-400 text-sm mt-1">{customer.address}</p>}
      </div>

      {lineItems.length > 0 && (
        <div className="bg-volturaNavy/50 rounded-xl px-4 mb-4">
          <div className="divide-y divide-white/5">
            {lineItems.map((item, i) => (
              <div key={i} className="flex justify-between items-start py-3">
                <span className="text-gray-300 text-sm flex-1 mr-4">{item.description}</span>
                <span className="text-volturaGold font-semibold whitespace-nowrap">${item.price.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-volturaNavy rounded-2xl p-5 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Total</span>
          <span className="text-volturaGold text-3xl font-bold">${invoice.total.toLocaleString()}</span>
        </div>
        {invoice.balance > 0 && invoice.status !== 'Paid' && (
          <div className="flex justify-between items-center border-t border-white/10 pt-2">
            <span className="text-gray-400 text-sm">Balance Due</span>
            <span className="text-red-400 font-semibold">${invoice.balance.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Pay Online placeholder */}
      <button
        disabled
        className="w-full bg-white/5 border border-white/10 text-gray-500 font-bold py-3 rounded-2xl text-base mb-6 cursor-not-allowed"
      >
        Pay Online — Coming Soon
      </button>

      <div className="bg-volturaNavy/50 rounded-2xl p-5 mb-8">
        <p className="text-gray-400 text-sm font-semibold mb-2">Payment Methods Accepted</p>
        <p className="text-white text-sm">Check &middot; Zelle &middot; Cash &middot; Credit Card</p>
      </div>

      <footer className="text-center text-gray-500 text-sm">
        <p>Questions? Call Dev</p>
        <p className="text-volturaGold">Voltura Power Group &middot; Colorado Springs</p>
      </footer>
    </div>
  )
}
