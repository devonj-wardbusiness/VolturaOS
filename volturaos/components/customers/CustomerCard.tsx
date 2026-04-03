import Link from 'next/link'
import type { Customer } from '@/types'

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

export function CustomerCard({ customer }: { customer: Customer }) {
  const initials = getInitials(customer.name || '?')

  return (
    <Link
      href={`/customers/${customer.id}`}
      className="flex items-center gap-3 bg-volturaNavy/50 border border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-transform duration-100"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full border border-volturaGold/40 bg-volturaBlue flex items-center justify-center flex-shrink-0">
        <span className="text-volturaGold font-semibold text-sm leading-none">{initials}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold truncate">{customer.name}</p>
        {customer.phone && <p className="text-gray-400 text-sm">{customer.phone}</p>}
        {customer.address && <p className="text-gray-500 text-xs mt-0.5 truncate">{customer.address}</p>}
      </div>

      {/* Badge */}
      <span className="text-xs bg-volturaNavy border border-white/5 px-2 py-0.5 rounded-full text-gray-400 capitalize flex-shrink-0">
        {customer.property_type}
      </span>
    </Link>
  )
}
