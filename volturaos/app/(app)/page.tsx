import { getDashboardData } from '@/lib/actions/dashboard'
import { KPICards } from '@/components/dashboard/KPICards'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { PageHeader } from '@/components/ui/PageHeader'
import Link from 'next/link'

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <>
      <PageHeader title="VOLTURA" subtitle="Power Group" />
      <div className="px-4 pt-14 pb-6">
        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2 mb-5 mt-4">
          <Link href="/customers/new" className="bg-transparent border border-volturaGold rounded-2xl p-3 text-center text-volturaGold font-bold text-sm">+ Customer</Link>
          <Link href="/estimates/new" className="bg-transparent border border-volturaGold rounded-2xl p-3 text-center text-volturaGold font-bold text-sm">+ Estimate</Link>
          <Link href="/jobs/new" className="bg-transparent border border-volturaGold rounded-2xl p-3 text-center text-volturaGold font-bold text-sm">+ Job</Link>
        </div>

        {/* KPIs */}
        <KPICards
          monthRevenue={data.monthRevenue}
          totalOutstanding={data.totalOutstanding}
          activeJobs={data.activeJobs}
          pendingEstimates={data.pendingEstimates}
          approvedValue={data.approvedValue}
          closeRate={data.closeRate}
          sparklineData={data.sparklineData}
        />

        {/* Recent Activity */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold text-sm">Recent Jobs</h2>
            <Link href="/jobs" className="text-volturaGold text-xs">View all</Link>
          </div>
          <RecentActivity jobs={data.recentJobs as { id: string; job_type: string; status: string; created_at: string; customer: { name: string } }[]} />
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap gap-4 justify-center mt-5">
          <Link href="/settings/pricebook" className="text-gray-500 text-xs underline">⚙️ Pricebook</Link>
          <Link href="/settings/templates" className="text-gray-500 text-xs underline">🔖 Templates</Link>
          <Link href="/agreements" className="text-gray-500 text-xs underline">🛡 Agreements</Link>
          <Link href="/tools/load-calc" className="text-gray-500 text-xs underline">🧮 Load Calc</Link>
        </div>
      </div>
    </>
  )
}
