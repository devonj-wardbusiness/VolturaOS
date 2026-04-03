interface KPICardsProps {
  monthRevenue: number
  totalOutstanding: number
  activeJobs: number
  pendingEstimates: number
  approvedValue: number
  closeRate: number
}

export function KPICards(props: KPICardsProps) {
  const cards = [
    { label: 'Monthly Revenue', value: `$${props.monthRevenue.toLocaleString()}`, color: 'text-volturaGold' },
    { label: 'Outstanding', value: `$${props.totalOutstanding.toLocaleString()}`, color: props.totalOutstanding > 0 ? 'text-red-400' : 'text-green-400' },
    { label: 'Active Jobs', value: props.activeJobs.toString(), color: 'text-blue-400' },
    { label: 'Pending Estimates', value: props.pendingEstimates.toString(), color: 'text-yellow-400' },
    { label: 'Approved Pipeline', value: `$${props.approvedValue.toLocaleString()}`, color: 'text-green-400' },
    { label: 'Close Rate', value: `${props.closeRate}%`, color: 'text-volturaGold' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="bg-volturaNavy/50 border border-white/5 rounded-2xl p-3">
          <p className="text-gray-400 text-xs mb-1">{card.label}</p>
          <p className={`${card.color} text-xl font-bold`}>{card.value}</p>
        </div>
      ))}
    </div>
  )
}
