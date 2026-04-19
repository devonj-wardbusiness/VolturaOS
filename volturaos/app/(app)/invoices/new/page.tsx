export const dynamic = 'force-dynamic'

import { NewInvoiceForm } from '@/components/invoices/NewInvoiceForm'

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string; customerId?: string; estimateId?: string }>
}) {
  const params = await searchParams
  return (
    <div className="min-h-dvh bg-volturaBlue">
      <header className="px-4 pt-4 pb-2 flex items-center gap-3">
        <a href="/invoices" className="text-gray-400 text-sm">&larr; Invoices</a>
        <h1 className="text-volturaGold text-xl font-bold">New Invoice</h1>
      </header>
      <NewInvoiceForm
        jobId={params.jobId}
        customerId={params.customerId}
        estimateId={params.estimateId}
      />
    </div>
  )
}
