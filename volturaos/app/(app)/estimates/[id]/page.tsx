export const dynamic = 'force-dynamic'

import { getEstimateById, getProposalEstimates, getLinkedInvoice } from '@/lib/actions/estimates'
import { getAllPricebook, getRecentPricebookItems } from '@/lib/actions/pricebook'
import { EstimateBuilder } from '@/components/estimate-builder/EstimateBuilder'
import { EstimateActions } from '@/components/estimates/EstimateActions'
import { StatusPill } from '@/components/ui/StatusPill'
import { ProgressTracker } from '@/components/estimates/ProgressTracker'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import Link from 'next/link'

export default async function EstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let estimate, pricebook, recents, proposal, linkedInvoice
  try {
    ;[estimate, pricebook, recents, proposal, linkedInvoice] = await Promise.all([
      getEstimateById(id),
      getAllPricebook(),
      getRecentPricebookItems(6),
      getProposalEstimates(id),
      getLinkedInvoice(id),
    ])
  } catch {
    notFound()
  }

  return (
    <>
      <PageHeader
        title={estimate.customer.name}
        backHref="/estimates"
        action={
          <Link
            href={`/estimates/new?customerId=${estimate.customer.id}&customerName=${encodeURIComponent(estimate.customer.name)}`}
            className="text-volturaGold text-xs font-semibold border border-volturaGold/40 px-2.5 py-1 rounded-lg mr-2"
          >
            + New
          </Link>
        }
      />
      <div className="min-h-dvh" style={{paddingTop: "var(--header-h)"}}>
        <ProgressTracker sentAt={estimate.sent_at} viewedAt={estimate.viewed_at} status={estimate.status} />
        <EstimateActions
          estimateId={id}
          customerId={estimate.customer.id}
          status={estimate.status}
        />
        <EstimateBuilder
          estimateId={id}
          pricebook={pricebook}
          initialRecents={recents}
          initialCustomerId={estimate.customer.id}
          initialCustomerName={estimate.customer.name}
          initialCustomerPhone={estimate.customer.phone}
          initialCustomerEmail={estimate.customer.email}
          estimateCreatedAt={estimate.created_at}
          proposalCount={proposal.length}
          proposalEstimates={proposal}
          linkedInvoiceId={linkedInvoice?.id ?? null}
          initialEstimate={{
            name: estimate.name ?? 'Estimate',
            status: estimate.status,
            line_items: estimate.line_items,
            addons: estimate.addons,
            notes: estimate.notes,
            includes_permit: estimate.includes_permit,
            includes_cleanup: estimate.includes_cleanup,
            includes_warranty: estimate.includes_warranty,
            follow_up_days: estimate.follow_up_days,
            follow_up_sent_at: estimate.follow_up_sent_at,
            follow_up_dismissed: estimate.follow_up_dismissed,
            signed_at: estimate.signed_at,
            signer_name: estimate.signer_name,
            valid_until: estimate.valid_until ?? null,
            payment_terms: estimate.payment_terms ?? null,
          }}
        />
      </div>
    </>
  )
}
