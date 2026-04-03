export const dynamic = 'force-dynamic'
import { getTemplates, createEstimate } from '@/lib/actions/estimates'
import { TemplatePicker } from '@/components/estimates/TemplatePicker'
import { NewEstimateFlow } from '@/components/estimates/NewEstimateFlow'
import { redirect } from 'next/navigation'

export default async function NewEstimatePage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  const { customerId } = await searchParams
  if (!customerId) {
    return <NewEstimateFlow />
  }

  const templates = await getTemplates()
  if (templates.length === 0) {
    const estimate = await createEstimate({ customerId })
    redirect(`/estimates/${estimate.id}`)
  }

  return <TemplatePicker templates={templates} customerId={customerId} />
}
