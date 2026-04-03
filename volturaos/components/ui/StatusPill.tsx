import { statusColor } from '@/lib/statusColor'

export function StatusPill({ status }: { status: string }) {
  const { bg, text } = statusColor(status)
  return (
    <span className={`${bg} ${text} rounded-full px-2 py-0.5 text-xs font-medium`}>
      {status}
    </span>
  )
}
