'use client'

import dynamic from 'next/dynamic'
import type { LineItem, InvoicePayment } from '@/types'

const InvoiceDownloadButton = dynamic(
  () => import('./InvoiceDownloadButton').then((m) => m.InvoiceDownloadButton),
  { ssr: false, loading: () => null }
)

interface Props {
  invoiceId: string
  customerName: string
  customerPhone?: string | null
  lineItems: LineItem[]
  total: number
  amountPaid: number
  balance: number
  status: string
  payments: InvoicePayment[]
  notes?: string | null
  createdAt: string
}

export function InvoiceDownloadWrapper(props: Props) {
  return <InvoiceDownloadButton {...props} />
}
