import { getPublicEstimate } from '@/lib/actions/estimates'
import { PublicCompareView } from '@/components/estimates/PublicCompareView'
import { LineItemsList } from '@/components/estimates/LineItemsList'
import { BadgeRow } from '@/components/estimates/BadgeRow'
import { ProgressTracker } from '@/components/estimates/ProgressTracker'
import { ReferralForm } from '@/components/estimates/ReferralForm'
import { PublicFormView } from '@/components/forms/PublicFormView'
import { PrintButton } from '@/components/estimates/PrintButton'
import { notFound } from 'next/navigation'
import type { Addon, Form, LineItem } from '@/types'

export default async function PublicEstimateView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getPublicEstimate(id)
  if (!result) notFound()

  const { estimates, customer } = result
  const isProposal = estimates.length > 1

  // For solo view, use the first (and only) estimate
  const solo = estimates[0]

  // Form branch — render form view instead of estimate content
  const formType = (solo as unknown as Record<string, unknown>).form_type as string | null
  if (formType) {
    return (
      <div className="min-h-dvh bg-volturaBlue px-4 py-8 max-w-lg mx-auto">
        <header className="mb-8">
          <h1 className="text-volturaGold text-3xl font-bold tracking-widest">VOLTURA</h1>
          <p className="text-gray-400 text-sm">Power Group — Colorado Springs, CO</p>
          <p className="text-gray-400 text-xs mt-1">License #3001608</p>
        </header>
        <div className="bg-volturaNavy rounded-2xl p-5 mb-6">
          <p className="text-gray-400 text-sm mb-1">Document for</p>
          <p className="text-white text-xl font-bold">{customer.name}</p>
        </div>
        <PublicFormView form={solo as unknown as Form} customerName={customer.name} />
      </div>
    )
  }

  const lineItems = solo.line_items ?? []
  const addons = (solo.addons ?? []).filter((a: Addon) => a.selected)
  const total = solo.total ?? 0
  const validUntil = solo.valid_until ?? null
  const paymentTerms = solo.payment_terms ?? null

  // Expiration helpers
  const expirationBanner = (() => {
    if (!validUntil || solo.status === 'Approved') return null
    const days = Math.ceil((new Date(validUntil).getTime() - Date.now()) / 86400000)
    if (days < 0) return { text: 'This estimate has expired', urgent: true }
    if (days === 0) return { text: 'Expires today', urgent: true }
    return { text: `Valid for ${days} more day${days === 1 ? '' : 's'}`, urgent: days <= 3 }
  })()

  return (
    <div className="min-h-dvh bg-volturaBlue px-4 py-8 max-w-lg mx-auto">
      <header className="mb-8">
        <h1 className="text-volturaGold text-3xl font-bold tracking-widest">VOLTURA</h1>
        <p className="text-gray-400 text-sm">Power Group — Colorado Springs, CO</p>
        <p className="text-gray-400 text-xs mt-1">License #3001608</p>
      </header>

      <div className="bg-volturaNavy rounded-2xl p-5 mb-4">
        <p className="text-gray-400 text-sm mb-1">Estimate for</p>
        <p className="text-white text-xl font-bold">{customer.name}</p>
      </div>

      {/* Expiration banner */}
      {expirationBanner && (
        <div className={`rounded-xl px-4 py-3 mb-4 text-sm text-center font-medium ${expirationBanner.urgent ? 'bg-red-900/30 border border-red-500/30 text-red-400' : 'bg-volturaNavy/50 text-gray-400'}`}>
          {expirationBanner.text}
        </div>
      )}

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

          {/* Upsell suggestions — only when not yet approved */}
          {solo.status !== 'Approved' && solo.status !== 'Declined' && lineItems.length > 0 && (() => {
            const suggestions = [
              !lineItems.some((i: LineItem) => i.description.toLowerCase().includes('surge')) && {
                name: 'Whole-home surge protection',
                desc: 'Protects all devices from power surges — one strike can destroy thousands in electronics',
                price: 500,
              },
              !lineItems.some((i: LineItem) => i.description.toLowerCase().includes('afci')) && {
                name: 'AFCI breaker upgrade',
                desc: 'Arc-fault protection required by modern code — prevents electrical fires',
                price: 350,
              },
              !addons.some((a: Addon) => a.name.toLowerCase().includes('warranty')) && {
                name: '1-year labor warranty',
                desc: 'We stand behind our work — free callbacks for any issue in the first year',
                price: 200,
              },
            ].filter(Boolean) as { name: string; desc: string; price: number }[]

            if (suggestions.length === 0) return null
            return (
              <div className="bg-volturaNavy/30 rounded-2xl p-5 mb-6 border border-volturaGold/10 print:hidden">
                <p className="text-volturaGold text-sm font-semibold mb-3">💡 Customers also consider</p>
                <div className="space-y-3">
                  {suggestions.map(s => (
                    <div key={s.name} className="flex justify-between items-start gap-3">
                      <div>
                        <p className="text-white text-sm font-medium">{s.name}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{s.desc}</p>
                      </div>
                      <span className="text-volturaGold text-sm font-semibold shrink-0">+${s.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <p className="text-gray-500 text-xs mt-3">Call or text to add any of these to your estimate</p>
              </div>
            )
          })()}

          <div className="bg-volturaNavy rounded-2xl p-5 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total</span>
              <span className="text-volturaGold text-3xl font-bold">${total.toLocaleString()}</span>
            </div>
          </div>

          {/* Print/save button — only on approved estimates */}
          {solo.status === 'Approved' && (
            <div className="mb-4 print:hidden">
              <PrintButton />
            </div>
          )}
        </>
      )}

      <div className="bg-volturaNavy/50 rounded-2xl p-5 mb-6">
        <p className="text-gray-400 text-sm font-semibold mb-2">Payment Methods Accepted</p>
        <p className="text-white text-sm">Check · Zelle · Cash · Credit Card</p>
        {paymentTerms && (
          <p className="text-volturaGold text-sm mt-2 font-medium">{paymentTerms}</p>
        )}
      </div>

      {/* Referral capture — hidden on print */}
      <div className="mb-8 print:hidden">
        <ReferralForm estimateId={id} />
      </div>

      <footer className="text-center text-gray-500 text-sm print:hidden">
        <p>Questions? Call Dev</p>
        <p className="text-volturaGold">Voltura Power Group · Colorado Springs</p>
      </footer>
    </div>
  )
}
