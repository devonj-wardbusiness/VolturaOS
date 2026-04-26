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
      <header
        className="fixed top-0 left-0 right-0 z-50 bg-[#0D0F1A]/90 backdrop-blur-sm border-b border-white/5 px-4 flex items-center gap-3"
        style={{ height: 'var(--header-h)', paddingTop: 'var(--sat)' }}
      >
        <a href="/invoices" className="text-volturaGold text-xl p-1 -ml-1">←</a>
        <h1 className="text-white font-bold text-base">New Invoice</h1>
      </header>
      <div style={{ paddingTop: 'var(--header-h)' }} />
      <NewInvoiceForm
        jobId={params.jobId}
        customerId={params.customerId}
        estimateId={params.estimateId}
      />
    </div>
  )
}
