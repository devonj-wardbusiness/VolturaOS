interface ReferralStatsProps {
  stats: { source: string; count: number }[]
}

export function ReferralStats({ stats }: ReferralStatsProps) {
  if (stats.length === 0) return null

  const max = stats[0].count

  return (
    <div className="mt-5">
      <h2 className="text-white font-semibold text-sm mb-3">Lead Sources</h2>
      <div className="bg-volturaNavy/50 border border-white/5 rounded-2xl p-4 space-y-3">
        {stats.map(({ source, count }) => (
          <div key={source}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-300 text-sm">{source}</span>
              <span className="text-volturaGold text-xs font-bold">{count}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-volturaGold/60 rounded-full transition-all"
                style={{ width: `${Math.round((count / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
