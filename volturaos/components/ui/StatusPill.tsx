const STATUS_COLORS: Record<string, string> = {
  Lead: 'bg-gray-600',
  Scheduled: 'bg-blue-600',
  'In Progress': 'bg-amber-600',
  Completed: 'bg-green-600',
  Invoiced: 'bg-purple-600',
  Paid: 'bg-emerald-600',
  Cancelled: 'bg-red-600',
  Draft: 'bg-gray-600',
  Sent: 'bg-blue-600',
  Viewed: 'bg-indigo-600',
  Approved: 'bg-green-600',
  Declined: 'bg-red-600',
  Unpaid: 'bg-red-600',
  Partial: 'bg-amber-600',
}

export function StatusPill({ status }: { status: string }) {
  const bg = STATUS_COLORS[status] ?? 'bg-gray-600'
  return (
    <span className={`${bg} text-white text-xs font-medium px-2.5 py-0.5 rounded-full`}>
      {status}
    </span>
  )
}
