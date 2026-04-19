export const dynamic = 'force-dynamic'

import { getAllPricebook } from '@/lib/actions/pricebook'
import { PricebookTable } from '@/components/settings/PricebookTable'
import { EmptyState } from '@/components/ui/EmptyState'

export default async function PricebookPage() {
  const entries = await getAllPricebook()
  return (
    <div className="px-4 pt-6 pb-6">
      <h1 className="text-volturaGold text-xl font-bold mb-1">Pricebook</h1>
      <p className="text-gray-400 text-sm mb-4">Tap any price to edit. Changes apply to all new estimates.</p>
      {entries.length === 0 ? (
        <EmptyState
          message="No pricebook items yet — add your first service or material"
          ctaLabel="+ Add Item"
          ctaHref="/settings/pricebook/new"
        />
      ) : (
        <PricebookTable entries={entries} />
      )}
    </div>
  )
}
