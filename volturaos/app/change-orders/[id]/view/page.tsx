import { notFound } from 'next/navigation'
import { getChangeOrder } from '@/lib/actions/change-orders'
import { ChangeOrderSignClient } from '@/components/jobs/ChangeOrderSignClient'
import type { LineItem } from '@/types'

export default async function ChangeOrderViewPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const co = await getChangeOrder(id).catch(() => null)
  if (!co) notFound()

  const originalLineItems = (co.originalEstimate?.line_items ?? []) as LineItem[]

  return (
    <div className="min-h-dvh bg-volturaBlue px-4 py-8 max-w-lg mx-auto">
      <header className="mb-8">
        <h1 className="text-volturaGold text-3xl font-bold tracking-widest">VOLTURA</h1>
        <p className="text-gray-400 text-sm">Power Group — Colorado Springs, CO</p>
        <p className="text-gray-400 text-xs mt-1">License #3001608</p>
      </header>

      <div className="bg-volturaNavy rounded-2xl p-5 mb-6">
        <p className="text-gray-400 text-sm mb-1">Change Order for</p>
        <p className="text-white text-xl font-bold">{co.customer.name}</p>
      </div>

      <div className="bg-volturaNavy rounded-2xl p-5">
        <ChangeOrderSignClient
          changeOrder={co}
          originalLineItems={originalLineItems}
          originalTotal={co.originalEstimate?.total ?? 0}
          customerName={co.customer.name}
        />
      </div>

      <footer className="text-center text-gray-500 text-sm mt-8">
        <p className="text-volturaGold">Voltura Power Group · Colorado Springs</p>
      </footer>
    </div>
  )
}
