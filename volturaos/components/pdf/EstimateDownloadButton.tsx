'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { EstimatePDF } from './EstimatePDF'
import type { LineItem, Addon } from '@/types'

interface EstimateDownloadButtonProps {
  estimateId: string
  customerName: string
  customerPhone?: string | null
  customerAddress?: string | null
  lineItems: LineItem[]
  addons?: Addon[]
  total: number
  notes?: string | null
  createdAt: string
}

export function EstimateDownloadButton(props: EstimateDownloadButtonProps) {
  const filename = `estimate-${props.estimateId.slice(0, 8)}-${props.customerName.replace(/\s+/g, '-').toLowerCase()}.pdf`

  return (
    <PDFDownloadLink
      document={<EstimatePDF {...props} />}
      fileName={filename}
      style={{ display: 'block', width: '100%', textAlign: 'center', textDecoration: 'none' }}
    >
      {({ loading }) => (
        <span className="block w-full text-center bg-volturaNavy text-volturaGold font-bold py-3 rounded-xl text-sm">
          {loading ? 'Generating PDF...' : '📄 Download Estimate PDF'}
        </span>
      )}
    </PDFDownloadLink>
  )
}
