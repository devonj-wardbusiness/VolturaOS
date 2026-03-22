export default function DashboardPage() {
  return (
    <div className="px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-volturaGold text-2xl font-bold tracking-widest">VOLTURA</h1>
        <p className="text-gray-400 text-sm">Power Group</p>
      </header>
      <div className="grid grid-cols-2 gap-3">
        <a href="/customers/new" className="bg-volturaNavy rounded-xl p-4 text-center text-volturaGold font-bold">+ Customer</a>
        <a href="/estimates/new" className="bg-volturaNavy rounded-xl p-4 text-center text-volturaGold font-bold">+ Estimate</a>
        <a href="/jobs" className="bg-volturaNavy rounded-xl p-4 text-center text-volturaGold font-bold col-span-2">+ Job</a>
      </div>
      <p className="text-gray-500 text-xs mt-6 text-center">Dashboard KPIs — Phase 2</p>
    </div>
  )
}
