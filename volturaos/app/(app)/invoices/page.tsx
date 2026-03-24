import { Suspense } from 'react'
import { listInvoices } from '@/lib/actions/invoices'
import { InvoiceList } from '@/components/invoices/InvoiceList'

export default async function InvoicesPage() {
  const invoices = await listInvoices()
  return (
    <div className="px-4 pt-6 pb-6">
      <h1 className="text-volturaGold text-xl font-bold mb-4">Invoices</h1>
      <Suspense>
        <InvoiceList invoices={invoices} />
      </Suspense>
    </div>
  )
}
