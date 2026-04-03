import { getCustomerById } from '@/lib/actions/customers'
import { getActiveAgreement } from '@/lib/actions/agreements'
import { notFound } from 'next/navigation'
import { EquipmentSection } from '@/components/customers/EquipmentSection'
import { CustomerDetail } from '@/components/customers/CustomerDetail'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let customer
  let agreement = null
  try {
    ;[customer, agreement] = await Promise.all([
      getCustomerById(id),
      getActiveAgreement(id),
    ])
  } catch {
    notFound()
  }

  return (
    <div className="px-4 pt-6 pb-6">
      <a href="/customers" className="text-gray-400 text-sm">&larr; Customers</a>
      <CustomerDetail customer={customer} agreement={agreement} />
      <EquipmentSection customerId={customer.id} equipment={customer.equipment} />
    </div>
  )
}
