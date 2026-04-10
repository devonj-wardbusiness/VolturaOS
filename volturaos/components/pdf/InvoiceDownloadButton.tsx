'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { InvoicePDF } from './InvoicePDF'
import type { LineItem, InvoicePayment } from '@/types'

interface InvoiceDownloadButtonProps {
  invoiceId: string
  customerName: string
  customerPhone?: string | null
  customerAddress?: string | null
  lineItems: LineItem[]
  total: number
  amountPaid: number
  balance: number
  status: string
  payments: InvoicePayment[]
  notes?: string | null
  createdAt: string
}

export function InvoiceDownloadButton(props: InvoiceDownloadButtonProps) {
  const filename = `invoice-${props.invoiceId.slice(0, 8)}-${props.customerName.replace(/\s+/g, '-').toLowerCase()}.pdf`

  return (
    <PDFDownloadLink
      document={<InvoicePDF {...props} />}
      fileName={filename}
      style={{ display: 'block', width: '100%', textAlign: 'center', textDecoration: 'none' }}
    >
      {({ loading }) => (
        <span className="block w-full text-center bg-volturaNavy text-volturaGold font-bold py-3 rounded-xl text-sm">
          {loading ? 'Generating PDF...' : '📄 Download Invoice PDF'}
        </span>
      )}
    </PDFDownloadLink>
  )
}
