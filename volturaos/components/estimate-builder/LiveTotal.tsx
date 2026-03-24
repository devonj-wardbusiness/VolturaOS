import type { LineItem, Addon } from '@/types'

export function calculateTotal(
  primaryItems: LineItem[],
  additionalItems: LineItem[],
  addons: Addon[],
  customItems: LineItem[]
): number {
  const primary = primaryItems.reduce((sum, item) => sum + item.price, 0)
  const additional = additionalItems.reduce((sum, item) => sum + item.price, 0)
  const addonTotal = addons.filter((a) => a.selected).reduce((sum, a) => sum + a.price, 0)
  const custom = customItems.reduce((sum, item) => sum + item.price, 0)
  return primary + additional + addonTotal + custom
}

export function LiveTotal({
  primaryItems,
  additionalItems,
  addons,
  customItems,
}: {
  primaryItems: LineItem[]
  additionalItems: LineItem[]
  addons: Addon[]
  customItems: LineItem[]
}) {
  const total = calculateTotal(primaryItems, additionalItems, addons, customItems)
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400 text-sm">Total</span>
      <span className="text-volturaGold text-2xl font-bold">${total.toLocaleString('en-US')}</span>
    </div>
  )
}
