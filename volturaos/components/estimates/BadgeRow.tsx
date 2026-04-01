interface BadgeRowProps {
  includesPermit: boolean
  includesCleanup: boolean
  includesWarranty: boolean
}

export function BadgeRow({ includesPermit, includesCleanup, includesWarranty }: BadgeRowProps) {
  const badges = [
    includesPermit && '📋 Permit Included',
    includesCleanup && '🧹 Site Cleanup',
    includesWarranty && '🛡 1-Year Warranty',
  ].filter(Boolean) as string[]
  if (!badges.length) return null
  return (
    <div className="flex gap-2 flex-wrap mb-3">
      {badges.map(b => (
        <span key={b} className="bg-volturaNavy/80 text-volturaGold text-xs px-2 py-1 rounded-full border border-volturaGold/30">
          {b}
        </span>
      ))}
    </div>
  )
}
