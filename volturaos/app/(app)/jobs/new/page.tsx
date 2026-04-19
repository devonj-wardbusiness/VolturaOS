export const dynamic = 'force-dynamic'

import { getEstimatesByCustomer } from '@/lib/actions/estimates'
import { getCustomerById } from '@/lib/actions/customers'
import { JobForm } from '@/components/jobs/JobForm'

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>
}) {
  const { customerId } = await searchParams

  let initialCustomerId: string | undefined
  let initialCustomerName: string | undefined
  let customerEstimates: Awaited<ReturnType<typeof getEstimatesByCustomer>> = []

  if (customerId) {
    try {
      const [customer, estimates] = await Promise.all([
        getCustomerById(customerId),
        getEstimatesByCustomer(customerId),
      ])
      initialCustomerId = customer.id
      initialCustomerName = customer.name
      customerEstimates = estimates
    } catch {
      // ignore — form still works without pre-fill
    }
  }

  return (
    <div className="min-h-dvh bg-volturaBlue">
      <header className="px-4 pt-4 pb-2 flex items-center gap-3">
        <a href="/jobs" className="text-gray-400 text-sm">&larr; Jobs</a>
        <h1 className="text-white font-semibold">New Job</h1>
      </header>
      <JobForm
        initialCustomerId={initialCustomerId}
        initialCustomerName={initialCustomerName}
        customerEstimates={customerEstimates}
      />
    </div>
  )
}
