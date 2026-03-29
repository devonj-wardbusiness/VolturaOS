import { getInvoiceById } from '@/lib/actions/invoices'
import { InvoiceDetail } from '@/components/invoices/InvoiceDetail'
import { notFound } from 'next/navigation'

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let invoice
  try {
    invoice = await getInvoiceById(id)
  } catch {
    notFound()
  }
  return (
    <div className="min-h-dvh bg-volturaBlue">
      <header className="px-4 pt-4 pb-2 flex items-center gap-3">
        <a href="/invoices" className="text-gray-400 text-sm">&larr; Invoices</a>
        <h1 className="text-white font-semibold flex-1 truncate">{invoice.customer.name}</h1>
      </header>

      <InvoiceDetail invoice={invoice} />
    </div>
  )
}
