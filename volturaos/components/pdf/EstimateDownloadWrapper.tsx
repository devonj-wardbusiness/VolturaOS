'use client'

import dynamic from 'next/dynamic'
import type { LineItem, Addon } from '@/types'

const EstimateDownloadButton = dynamic(
  () => import('./EstimateDownloadButton').then((m) => m.EstimateDownloadButton),
  { ssr: false, loading: () => null }
)

interface Props {
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

export function EstimateDownloadWrapper(props: Props) {
  return <EstimateDownloadButton {...props} />
}
