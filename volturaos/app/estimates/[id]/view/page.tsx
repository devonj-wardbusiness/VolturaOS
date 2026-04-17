import { getPublicEstimate } from '@/lib/actions/estimates'
import { PublicCompareView } from '@/components/estimates/PublicCompareView'
import { LineItemsList } from '@/components/estimates/LineItemsList'
import { BadgeRow } from '@/components/estimates/BadgeRow'
import { ProgressTracker } from '@/components/estimates/ProgressTracker'
import { ReferralForm } from '@/components/estimates/ReferralForm'
import { notFound } from 'next/navigation'
import type { Addon } from '@/types'

export default async function PublicEstimateView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getPublicEstimate(id)
  if (!result) notFound()

  const { estimates, customer } = result
  const isProposal = estimates.length > 1

  // For solo view, use the first (and only) estimate
  const solo = estimates[0]
  const lineItems = solo.line_items ?? []
  const addons = (solo.addons ?? []).filter((a: Addon) => a.selected)
  const total = solo.total ?? 0

  return (
    <div className="min-h-dvh bg-volturaBlue px-4 py-8 max-w-lg mx-auto">
      <header className="mb-8">
        <h1 className="text-volturaGold text-3xl font-bold tracking-widest">VOLTURA</h1>
        <p className="text-gray-400 text-sm">Power Group — Colorado Springs, CO</p>
        <p className="text-gray-400 text-xs mt-1">License #3001608</p>
      </header>

      <div className="bg-volturaNavy rounded-2xl p-5 mb-6">
        <p className="text-gray-400 text-sm mb-1">Estimate for</p>
        <p className="text-white text-xl font-bold">{customer.name}</p>
      </div>

      {/* Multi-estimate proposal: swipeable comparison */}
      {isProposal && (
        <>
          <div className="bg-volturaNavy rounded-2xl mb-4">
            <ProgressTracker sentAt={estimates[0].sent_at} viewedAt={estimates[0].viewed_at} status={estimates[0].status} />
          </div>
          <div className="mb-6">
            <PublicCompareView estimates={estimates} customerName={customer.name} />
          </div>
        </>
      )}

      {/* Solo estimate: flat list */}
      {!isProposal && (
        <>
          <div className="bg-volturaNavy rounded-2xl mb-4">
            <ProgressTracker sentAt={solo.sent_at} viewedAt={solo.viewed_at} status={solo.status} />
          </div>
          <BadgeRow includesPermit={solo.includes_permit} includesCleanup={solo.includes_cleanup} includesWarranty={solo.includes_warranty} />
          {lineItems.length > 0 && (
            <div className="bg-volturaNavy/50 rounded-xl px-4 mb-4">
              <LineItemsList items={lineItems} />
            </div>
          )}

          {addons.length > 0 && (
            <div className="space-y-1.5 mb-6">
              {addons.map((addon: Addon, i: number) => (
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
        </>
      )}

      <div className="bg-volturaNavy/50 rounded-2xl p-5 mb-6">
        <p className="text-gray-400 text-sm font-semibold mb-2">Payment Methods Accepted</p>
        <p className="text-white text-sm">Check &middot; Zelle &middot; Cash &middot; Credit Card</p>
      </div>

      {/* Referral capture */}
      <div className="mb-8">
        <ReferralForm estimateId={id} />
      </div>

      <footer className="text-center text-gray-500 text-sm">
        <p>Questions? Call Dev</p>
        <p className="text-volturaGold">Voltura Power Group &middot; Colorado Springs</p>
      </footer>
    </div>
  )
}
