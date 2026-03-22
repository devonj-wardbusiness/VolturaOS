import type { LineItem, Addon } from '@/types'
import { calculateTotal } from './EstimateBuilder'

export function LiveTotal({ lineItems, addons }: { lineItems: LineItem[]; addons: Addon[] }) {
  const total = calculateTotal(lineItems, addons)
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400 text-sm">Total</span>
      <span className="text-volturaGold text-2xl font-bold">${total.toLocaleString('en-US')}</span>
    </div>
  )
}
