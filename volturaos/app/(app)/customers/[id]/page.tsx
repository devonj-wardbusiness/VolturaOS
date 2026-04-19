export const dynamic = 'force-dynamic'

import { getCustomerById, getCustomerHistory } from '@/lib/actions/customers'
import { getActiveAgreement } from '@/lib/actions/agreements'
import { notFound } from 'next/navigation'
import { EquipmentSection } from '@/components/customers/EquipmentSection'
import { CustomerDetail } from '@/components/customers/CustomerDetail'
import { CustomerHistory } from '@/components/customers/CustomerHistory'
import { PageHeader } from '@/components/ui/PageHeader'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let customer, agreement, history
  try {
    ;[customer, agreement, history] = await Promise.all([
      getCustomerById(id),
      getActiveAgreement(id),
      getCustomerHistory(id),
    ])
  } catch {
    notFound()
  }

  return (
    <>
      <PageHeader title={customer.name} backHref="/customers" />
      <div className="px-4 pt-14 pb-6">
        <CustomerDetail customer={customer} agreement={agreement} />
        <EquipmentSection customerId={customer.id} equipment={customer.equipment} />
        <CustomerHistory items={history} />
      </div>
    </>
  )
}
