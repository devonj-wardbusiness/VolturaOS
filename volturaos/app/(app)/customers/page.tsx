export const dynamic = 'force-dynamic'

import { searchCustomers } from '@/lib/actions/customers'
import { CustomerSearch } from '@/components/customers/CustomerSearch'
import { CustomerCard } from '@/components/customers/CustomerCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import Link from 'next/link'

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const customers = await searchCustomers(q ?? '')

  return (
    <>
      <PageHeader
        title="Customers"
        action={<Link href="/customers/new" className="text-volturaGold text-sm pr-4">+ New</Link>}
      />
      <div className="px-4 pb-6" style={{paddingTop: "var(--header-h)"}}>
        <CustomerSearch initialQuery={q ?? ''} />
        {customers.length === 0 ? (
          <EmptyState message="No customers yet — tap + to add one" ctaLabel="+ Add Customer" ctaHref="/customers/new" />
        ) : (
          <div className="space-y-2 mt-4">
            {customers.map((c) => <CustomerCard key={c.id} customer={c} jobCount={c.jobCount} />)}
          </div>
        )}
      </div>
    </>
  )
}
