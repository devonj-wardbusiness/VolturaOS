import { getPublicEstimate } from '@/lib/actions/estimates'
import { notFound } from 'next/navigation'

export default async function PublicEstimateView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const estimate = await getPublicEstimate(id)
  if (!estimate) notFound()

  const lineItems = estimate.line_items ?? []
  const primaryItems = lineItems.filter((li) => li.is_primary)
  const additionalItems = lineItems.filter((li) => !li.is_primary)
  const addons = (estimate.addons ?? []).filter((a) => a.selected)
  const total = estimate.total ?? 0

  return (
    <div className="min-h-dvh bg-volturaBlue px-4 py-8 max-w-lg mx-auto">
      <header className="mb-8">
        <h1 className="text-volturaGold text-3xl font-bold tracking-widest">VOLTURA</h1>
        <p className="text-gray-400 text-sm">Power Group — Colorado Springs, CO</p>
        <p className="text-gray-400 text-xs mt-1">License #3001608</p>
      </header>

      <div className="bg-volturaNavy rounded-2xl p-5 mb-4">
        <p className="text-gray-400 text-sm mb-1">Estimate for</p>
        <p className="text-white text-xl font-bold">{estimate.customer.name}</p>
      </div>

      {/* Primary job */}
      {primaryItems.length > 0 && (
        <div className="mb-2">
          {primaryItems.map((item, i) => (
            <div key={i} className="flex justify-between items-start bg-volturaNavy rounded-xl px-4 py-3">
              <div className="flex-1 mr-4">
                <span className="text-white text-sm font-semibold">{item.description}</span>
                {item.footage && (
                  <span className="text-gray-400 text-xs block">{item.footage}ft</span>
                )}
              </div>
              <span className="text-volturaGold font-bold whitespace-nowrap">${item.price.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Additional items */}
      {additionalItems.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {additionalItems.map((item, i) => (
            <div key={i} className="flex justify-between items-start bg-volturaNavy/50 rounded-xl px-4 py-3">
              <div className="flex-1 mr-4">
                <span className="text-white text-sm">{item.description}</span>
                {item.footage && (
                  <span className="text-gray-400 text-xs block">{item.footage}ft</span>
                )}
              </div>
              <span className="text-volturaGold font-semibold whitespace-nowrap">${item.price.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add-ons */}
      {addons.length > 0 && (
        <div className="space-y-1.5 mb-6">
          {addons.map((addon, i) => (
            <div key={`a-${i}`} className="flex justify-between items-start bg-volturaNavy/30 rounded-xl px-4 py-3">
              <span className="text-gray-300 text-sm flex-1 mr-4">{addon.name}</span>
              <span className="text-volturaGold font-semibold whitespace-nowrap">+${addon.price.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-volturaNavy rounded-2xl p-5 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Total</span>
          <span className="text-volturaGold text-3xl font-bold">${total.toLocaleString()}</span>
        </div>
      </div>

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
