export const dynamic = 'force-dynamic'

import { getCustomerById } from '@/lib/actions/customers'
import { getActiveAgreement } from '@/lib/actions/agreements'
import { listCustomerJobs } from '@/lib/actions/jobs'
import { listCustomerEstimates } from '@/lib/actions/estimates'
import { listCustomerInvoices } from '@/lib/actions/invoices'
import { CustomerProfile } from '@/components/profile/CustomerProfile'
import { notFound } from 'next/navigation'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let customer, agreement, jobs, estimates, invoices
  try {
    ;[customer, agreement, jobs, estimates, invoices] = await Promise.all([
      getCustomerById(id),
      getActiveAgreement(id),
      listCustomerJobs(id),
      listCustomerEstimates(id),
      listCustomerInvoices(id),
    ])
  } catch {
    notFound()
  }

  return (
    <CustomerProfile
      customer={customer}
      agreement={agreement}
      jobs={jobs}
      estimates={estimates}
      invoices={invoices}
    />
  )
}
