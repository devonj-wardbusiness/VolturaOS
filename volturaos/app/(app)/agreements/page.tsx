export const dynamic = 'force-dynamic'

import { listAgreements } from '@/lib/actions/agreements'
import { AgreementsList } from '@/components/agreements/AgreementsList'

export default async function AgreementsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter } = await searchParams
  const validFilter = ['Active', 'Expired', 'Cancelled', 'Expiring'].includes(filter ?? '')
    ? (filter as 'Active' | 'Expired' | 'Cancelled' | 'Expiring')
    : undefined
  const agreements = await listAgreements(validFilter)
  return <AgreementsList agreements={agreements} currentFilter={filter} />
}
