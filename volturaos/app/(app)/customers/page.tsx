export const dynamic = 'force-dynamic'

import { searchCustomers } from '@/lib/actions/customers'
import { CustomerSearch } from '@/components/customers/CustomerSearch'
import { CustomerCard } from '@/components/customers/CustomerCard'
import { EmptyState } from '@/components/ui/EmptyState'
import Link from 'next/link'

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const customers = await searchCustomers(q ?? '')

  return (
    <div className="px-4 pt-6 pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-volturaGold text-xl font-bold">Customers</h1>
        <Link href="/customers/new" className="bg-volturaGold text-volturaBlue font-bold px-4 py-2 rounded-xl text-sm">
          + Add
        </Link>
      </div>
      <CustomerSearch initialQuery={q ?? ''} />
      {customers.length === 0 ? (
        <EmptyState message="No customers yet — tap + to add one" ctaLabel="+ Add Customer" ctaHref="/customers/new" />
      ) : (
        <div className="space-y-2 mt-4">
          {customers.map((c) => <CustomerCard key={c.id} customer={c} />)}
        </div>
      )}
    </div>
  )
}
