export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { listInvoices } from '@/lib/actions/invoices'
import { InvoiceList } from '@/components/invoices/InvoiceList'
import { PageHeader } from '@/components/ui/PageHeader'
import Link from 'next/link'

export default async function InvoicesPage() {
  const invoices = await listInvoices()

  const totalOutstanding = invoices
    .filter(inv => inv.status !== 'Paid')
    .reduce((sum, inv) => sum + inv.balance, 0)

  return (
    <>
      <PageHeader title="Money" />
      <div className="px-4 pt-14 pb-6">

        {/* Quick nav: Estimates shortcut */}
        <div className="flex gap-2 mb-4">
          <Link
            href="/invoices"
            className="flex-1 text-center py-2 rounded-xl text-xs font-semibold bg-volturaGold text-volturaBlue"
          >
            Invoices
          </Link>
          <Link
            href="/estimates"
            className="flex-1 text-center py-2 rounded-xl text-xs font-semibold bg-white/10 text-gray-300"
          >
            Estimates
          </Link>
          <Link
            href="/invoices/new"
            className="flex-1 text-center py-2 rounded-xl text-xs font-semibold bg-white/10 text-volturaGold"
          >
            + Invoice
          </Link>
        </div>

        {/* Outstanding banner */}
        {totalOutstanding > 0 && (
          <div className="bg-volturaNavy/60 border border-volturaGold/20 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
            <span className="text-gray-400 text-sm">Outstanding</span>
            <span className="text-volturaGold font-bold text-lg">${totalOutstanding.toLocaleString()}</span>
          </div>
        )}

        <Suspense>
          <InvoiceList invoices={invoices} />
        </Suspense>
      </div>
    </>
  )
}
