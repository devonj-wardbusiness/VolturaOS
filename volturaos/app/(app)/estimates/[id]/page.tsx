import { getEstimateById, getProposalEstimates } from '@/lib/actions/estimates'
import { getAllPricebook } from '@/lib/actions/pricebook'
import { EstimateBuilder } from '@/components/estimate-builder/EstimateBuilder'
import { EstimateActions } from '@/components/estimates/EstimateActions'
import { StatusPill } from '@/components/ui/StatusPill'
import { ProgressTracker } from '@/components/estimates/ProgressTracker'
import { notFound } from 'next/navigation'

export default async function EstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let estimate, pricebook, proposal
  try {
    ;[estimate, pricebook, proposal] = await Promise.all([
      getEstimateById(id),
      getAllPricebook(),
      getProposalEstimates(id),
    ])
  } catch {
    notFound()
  }

  return (
    <div className="min-h-dvh bg-volturaBlue">
      <header className="px-4 pt-4 pb-2 flex items-center gap-3">
        <a href="/estimates" className="text-gray-400 text-sm">&larr; Estimates</a>
        <h1 className="text-white font-semibold flex-1 truncate">{estimate.customer.name}</h1>
        <StatusPill status={estimate.status} />
        <a
          href={`/estimates/new?customerId=${estimate.customer.id}&customerName=${encodeURIComponent(estimate.customer.name)}`}
          className="text-volturaGold text-xs font-semibold border border-volturaGold/40 px-2.5 py-1 rounded-lg"
        >
          + New
        </a>
      </header>

      <ProgressTracker sentAt={estimate.sent_at} viewedAt={estimate.viewed_at} status={estimate.status} />

      <EstimateActions
        estimateId={id}
        customerId={estimate.customer.id}
        status={estimate.status}
      />

      <EstimateBuilder
        estimateId={id}
        pricebook={pricebook}
        initialCustomerId={estimate.customer.id}
        initialCustomerName={estimate.customer.name}
        estimateCreatedAt={estimate.created_at}
        proposalCount={proposal.length}
        proposalEstimates={proposal}
        initialEstimate={{
          name: estimate.name ?? 'Estimate',
          line_items: estimate.line_items,
          addons: estimate.addons,
          notes: estimate.notes,
          includes_permit: estimate.includes_permit,
          includes_cleanup: estimate.includes_cleanup,
          includes_warranty: estimate.includes_warranty,
        }}
      />
    </div>
  )
}
