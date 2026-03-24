import { getDashboardData } from '@/lib/actions/dashboard'
import { KPICards } from '@/components/dashboard/KPICards'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import Link from 'next/link'

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="px-4 pt-6 pb-6">
      <header className="mb-5">
        <h1 className="text-volturaGold text-2xl font-bold tracking-widest">VOLTURA</h1>
        <p className="text-gray-400 text-sm">Power Group</p>
      </header>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <Link href="/customers/new" className="bg-volturaNavy rounded-xl p-3 text-center text-volturaGold font-bold text-sm">+ Customer</Link>
        <Link href="/estimates/new" className="bg-volturaNavy rounded-xl p-3 text-center text-volturaGold font-bold text-sm">+ Estimate</Link>
        <Link href="/jobs/new" className="bg-volturaNavy rounded-xl p-3 text-center text-volturaGold font-bold text-sm">+ Job</Link>
      </div>

      {/* KPIs */}
      <KPICards
        monthRevenue={data.monthRevenue}
        totalOutstanding={data.totalOutstanding}
        activeJobs={data.activeJobs}
        pendingEstimates={data.pendingEstimates}
        approvedValue={data.approvedValue}
        closeRate={data.closeRate}
      />

      {/* Recent Activity */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm">Recent Jobs</h2>
          <Link href="/jobs" className="text-volturaGold text-xs">View all</Link>
        </div>
        <RecentActivity jobs={data.recentJobs as { id: string; job_type: string; status: string; created_at: string; customer: { name: string } }[]} />
      </div>

      {/* Pricebook link */}
      <Link href="/settings/pricebook" className="block mt-5 text-center text-gray-500 text-xs underline">
        ⚙️ Pricebook Settings
      </Link>
    </div>
  )
}
