import { listEstimates } from '@/lib/actions/estimates'
import { StatusPill } from '@/components/ui/StatusPill'
import { EmptyState } from '@/components/ui/EmptyState'
import Link from 'next/link'

export default async function EstimatesPage() {
  const estimates = await listEstimates()
  return (
    <div className="px-4 pt-6 pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-volturaGold text-xl font-bold">Estimates</h1>
        <Link href="/estimates/new" className="bg-volturaGold text-volturaBlue font-bold px-4 py-2 rounded-xl text-sm">+ New</Link>
      </div>
      {estimates.length === 0 ? (
        <EmptyState message="No estimates yet — tap + to create one" ctaLabel="+ New Estimate" ctaHref="/estimates/new" />
      ) : (
        <div className="space-y-2">
          {estimates.map((est) => (
            <Link key={est.id} href={`/estimates/${est.id}`} className="block bg-volturaNavy/50 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-semibold">{est.customer?.name ?? 'Unknown'}</p>
                  {est.tier_selected && <p className="text-gray-400 text-xs capitalize">{est.tier_selected} tier</p>}
                </div>
                <div className="text-right">
                  <StatusPill status={est.status} />
                  {est.total && <p className="text-volturaGold font-bold text-sm mt-1">${est.total.toLocaleString()}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
