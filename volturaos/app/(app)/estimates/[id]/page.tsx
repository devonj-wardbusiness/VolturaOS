import { getEstimateById } from '@/lib/actions/estimates'
import { getAllPricebook } from '@/lib/actions/pricebook'
import { EstimateBuilder } from '@/components/estimate-builder/EstimateBuilder'
import { EstimateActions } from '@/components/estimates/EstimateActions'
import { StatusPill } from '@/components/ui/StatusPill'
import { notFound } from 'next/navigation'

export default async function EstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let estimate, pricebook
  try {
    ;[estimate, pricebook] = await Promise.all([getEstimateById(id), getAllPricebook()])
  } catch {
    notFound()
  }
  return (
    <div className="min-h-dvh bg-volturaBlue">
      <header className="px-4 pt-4 pb-2 flex items-center gap-3">
        <a href="/estimates" className="text-gray-400 text-sm">&larr; Estimates</a>
        <h1 className="text-white font-semibold flex-1 truncate">{estimate.customer.name}</h1>
        <StatusPill status={estimate.status} />
      </header>

      {/* Status-aware action bar for Approved/Sent estimates */}
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
      />
    </div>
  )
}
