import Link from 'next/link'
import { Wrench, DollarSign, FileText } from 'lucide-react'
import { StatusPill } from '@/components/ui/StatusPill'

interface HistoryItem {
  type: 'job' | 'invoice' | 'estimate'
  id: string
  title: string
  status: string
  amount?: number
  date: string
  href: string
}

interface CustomerHistoryProps {
  items: HistoryItem[]
}

const TYPE_ICON = {
  job: Wrench,
  invoice: DollarSign,
  estimate: FileText,
}

const TYPE_COLOR = {
  job: '#38bdf8',
  invoice: '#D4AF37',
  estimate: '#a78bfa',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function CustomerHistory({ items }: CustomerHistoryProps) {
  if (items.length === 0) return null

  return (
    <div className="mt-6">
      <p className="text-gray-500 text-[11px] uppercase tracking-widest mb-3">History</p>
      <div className="divide-y divide-white/5">
        {items.map(item => {
          const Icon = TYPE_ICON[item.type]
          const color = TYPE_COLOR[item.type]
          return (
            <Link
              key={`${item.type}-${item.id}`}
              href={item.href}
              className="flex items-center gap-3 py-3"
            >
              <div
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${color}20` }}
              >
                <Icon size={14} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{item.title}</p>
                <p className="text-gray-500 text-xs">{formatDate(item.date)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusPill status={item.status} />
                {item.amount !== undefined && (
                  <span className="text-volturaGold text-sm font-semibold">
                    ${item.amount.toLocaleString()}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
