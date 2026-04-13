import Link from 'next/link'

interface AttentionItem {
  type: 'invoice' | 'job'
  id: string
  label: string
  href: string
  daysOverdue?: number
}

interface NeedsAttentionProps {
  items: AttentionItem[]
}

export function NeedsAttention({ items }: NeedsAttentionProps) {
  if (items.length === 0) return null

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-red-400 text-base">🚨</span>
        <h2 className="text-white font-semibold text-sm">Needs Attention</h2>
        <span className="ml-auto text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-semibold">
          {items.length}
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-center gap-3 bg-red-900/10 border border-red-500/20 rounded-xl px-4 py-3 active:scale-[0.98] transition-transform"
          >
            <span className="text-base flex-shrink-0">
              {item.type === 'invoice' ? '💸' : '📋'}
            </span>
            <p className="text-red-200 text-sm flex-1 min-w-0 truncate">{item.label}</p>
            {item.daysOverdue != null && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                item.daysOverdue >= 60
                  ? 'bg-red-600/30 text-red-300'
                  : item.daysOverdue >= 30
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-orange-500/20 text-orange-400'
              }`}>
                {item.daysOverdue}d
              </span>
            )}
            <span className="text-gray-600 text-xs flex-shrink-0">›</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
