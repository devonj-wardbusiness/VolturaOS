import { getInvoiceById } from '@/lib/actions/invoices'
import { InvoiceDetail } from '@/components/invoices/InvoiceDetail'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let invoice
  try {
    invoice = await getInvoiceById(id)
  } catch {
    notFound()
  }
  return (
    <>
      <PageHeader title={invoice.customer.name} backHref="/invoices" />
      <div className="min-h-dvh pt-14">
        <InvoiceDetail invoice={invoice} />
      </div>
    </>
  )
}
