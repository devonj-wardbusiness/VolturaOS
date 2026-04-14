import { AlertCircle, Briefcase, FileText, CheckCircle, Target } from 'lucide-react'
import { SparklineChart } from './SparklineChart'
import Link from 'next/link'

interface KPICardsProps {
  monthRevenue: number
  lastMonthRevenue: number
  totalOutstanding: number
  activeJobs: number
  pendingEstimates: number
  approvedValue: number
  closeRate: number
  sparklineData: { date: string; amount: number }[]
}

export function KPICards(props: KPICardsProps) {
  const momDelta = props.lastMonthRevenue > 0
    ? Math.round(((props.monthRevenue - props.lastMonthRevenue) / props.lastMonthRevenue) * 100)
    : null
  const momUp = momDelta !== null && momDelta >= 0

  return (
    <div className="space-y-3">
      {/* Hero card — Monthly Revenue full width */}
      <div
        className="relative bg-volturaNavy/50 border border-volturaGold/30 rounded-2xl p-4 overflow-hidden"
        style={{ borderTop: '2px solid #C9A227' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-400 text-[11px] uppercase tracking-wider mb-1">Monthly Revenue</p>
            <p className="text-volturaGold text-4xl font-bold tracking-wide leading-none">
              ${props.monthRevenue.toLocaleString()}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-gray-500 text-xs">
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
              {momDelta !== null && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  momUp ? 'bg-green-900/40 text-green-400' : 'bg-red-900/30 text-red-400'
                }`}>
                  {momUp ? '↑' : '↓'} {Math.abs(momDelta)}% vs last mo
                </span>
              )}
            </div>
          </div>
          {props.totalOutstanding > 0 && (
            <Link href="/invoices?status=Unpaid" className="text-right">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Outstanding</p>
              <p className="text-red-400 font-bold text-lg">${props.totalOutstanding.toLocaleString()}</p>
              <p className="text-red-500/60 text-[10px]">tap to view</p>
            </Link>
          )}
        </div>
        <SparklineChart data={props.sparklineData} />
      </div>

      {/* 2-col grid for the rest */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/jobs?status=Lead"
          className="relative bg-volturaNavy/50 border border-white/5 rounded-2xl p-3 overflow-hidden active:scale-[0.98] transition-transform"
          style={{ borderTop: '2px solid #38bdf8' }}
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-gray-400 text-[11px] uppercase tracking-wider leading-tight">Active Jobs</p>
            <Briefcase size={14} className="text-sky-400 opacity-70 flex-shrink-0 mt-0.5" />
          </div>
          <p className="text-sky-400 text-2xl font-bold leading-none tracking-wide">{props.activeJobs}</p>
        </Link>

        <Link
          href="/estimates"
          className="relative bg-volturaNavy/50 border border-white/5 rounded-2xl p-3 overflow-hidden active:scale-[0.98] transition-transform"
          style={{ borderTop: '2px solid #facc15' }}
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-gray-400 text-[11px] uppercase tracking-wider leading-tight">Pending Estimates</p>
            <FileText size={14} className="text-yellow-400 opacity-70 flex-shrink-0 mt-0.5" />
          </div>
          <p className="text-yellow-400 text-2xl font-bold leading-none tracking-wide">{props.pendingEstimates}</p>
        </Link>

        <Link
          href="/estimates"
          className="relative bg-volturaNavy/50 border border-white/5 rounded-2xl p-3 overflow-hidden active:scale-[0.98] transition-transform"
          style={{ borderTop: '2px solid #34d399' }}
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-gray-400 text-[11px] uppercase tracking-wider leading-tight">Approved Pipeline</p>
            <CheckCircle size={14} className="text-emerald-400 opacity-70 flex-shrink-0 mt-0.5" />
          </div>
          <p className="text-emerald-400 text-2xl font-bold leading-none tracking-wide">${props.approvedValue.toLocaleString()}</p>
        </Link>

        <div
          className="relative bg-volturaNavy/50 border border-white/5 rounded-2xl p-3 overflow-hidden"
          style={{ borderTop: '2px solid #C9A227' }}
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-gray-400 text-[11px] uppercase tracking-wider leading-tight">Close Rate</p>
            <Target size={14} className="text-volturaGold opacity-70 flex-shrink-0 mt-0.5" />
          </div>
          <p className="text-volturaGold text-2xl font-bold leading-none tracking-wide">{props.closeRate}%</p>
        </div>
      </div>
    </div>
  )
}
