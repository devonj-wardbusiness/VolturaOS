import { TrendingUp, AlertCircle, Briefcase, FileText, CheckCircle, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SparklineChart } from './SparklineChart'

interface KPICardsProps {
  monthRevenue: number
  totalOutstanding: number
  activeJobs: number
  pendingEstimates: number
  approvedValue: number
  closeRate: number
  sparklineData: { date: string; amount: number }[]
}

interface CardDef {
  label: string
  value: string
  color: string
  accent: string
  Icon: LucideIcon
  sparkline?: React.ReactNode
}

export function KPICards(props: KPICardsProps) {
  const cards: CardDef[] = [
    {
      label: 'Monthly Revenue',
      value: `$${props.monthRevenue.toLocaleString()}`,
      color: 'text-volturaGold',
      accent: '#D4AF37',
      Icon: TrendingUp,
      sparkline: <SparklineChart data={props.sparklineData} />,
    },
    {
      label: 'Outstanding',
      value: `$${props.totalOutstanding.toLocaleString()}`,
      color: props.totalOutstanding > 0 ? 'text-red-400' : 'text-green-400',
      accent: props.totalOutstanding > 0 ? '#f87171' : '#4ade80',
      Icon: AlertCircle,
    },
    {
      label: 'Active Jobs',
      value: props.activeJobs.toString(),
      color: 'text-sky-400',
      accent: '#38bdf8',
      Icon: Briefcase,
    },
    {
      label: 'Pending Estimates',
      value: props.pendingEstimates.toString(),
      color: 'text-yellow-400',
      accent: '#facc15',
      Icon: FileText,
    },
    {
      label: 'Approved Pipeline',
      value: `$${props.approvedValue.toLocaleString()}`,
      color: 'text-emerald-400',
      accent: '#34d399',
      Icon: CheckCircle,
    },
    {
      label: 'Close Rate',
      value: `${props.closeRate}%`,
      color: 'text-volturaGold',
      accent: '#D4AF37',
      Icon: Target,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map(({ label, value, color, accent, Icon, sparkline }) => (
        <div
          key={label}
          className="relative bg-volturaNavy/50 border border-white/5 rounded-2xl p-3 overflow-hidden"
          style={{ borderTop: `2px solid ${accent}` }}
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-gray-400 text-[11px] uppercase tracking-wider leading-tight">{label}</p>
            <Icon size={14} className={`${color} opacity-70 flex-shrink-0 mt-0.5`} />
          </div>
          <p className={`font-display ${color} text-2xl font-bold leading-none tracking-wide`}>{value}</p>
          {sparkline}
        </div>
      ))}
    </div>
  )
}
