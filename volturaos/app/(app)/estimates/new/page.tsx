import { createEstimate } from '@/lib/actions/estimates'
import { redirect } from 'next/navigation'

export default async function NewEstimatePage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  const { customerId } = await searchParams
  if (!customerId) {
    return redirect('/customers?returnTo=estimate')
  }
  const estimate = await createEstimate({ customerId })
  redirect(`/estimates/${estimate.id}`)
}
