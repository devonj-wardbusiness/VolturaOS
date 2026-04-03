export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { listInvoices } from '@/lib/actions/invoices'
import { InvoiceList } from '@/components/invoices/InvoiceList'
import { PageHeader } from '@/components/ui/PageHeader'

export default async function InvoicesPage() {
  const invoices = await listInvoices()
  return (
    <>
      <PageHeader title="Invoices" />
      <div className="px-4 pt-14 pb-6">
        <Suspense>
          <InvoiceList invoices={invoices} />
        </Suspense>
      </div>
    </>
  )
}
