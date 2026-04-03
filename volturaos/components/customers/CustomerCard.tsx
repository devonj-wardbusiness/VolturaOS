import Link from 'next/link'
import type { Customer } from '@/types'

export function CustomerCard({ customer }: { customer: Customer }) {
  return (
    <Link
      href={`/customers/${customer.id}`}
      className="block bg-volturaNavy/50 border border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-transform duration-100"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white font-semibold">{customer.name}</p>
          {customer.phone && <p className="text-gray-400 text-sm">{customer.phone}</p>}
          {customer.address && <p className="text-gray-500 text-xs mt-1">{customer.address}</p>}
        </div>
        <span className="text-xs bg-volturaNavy border border-white/5 px-2 py-0.5 rounded-full text-gray-400 capitalize">
          {customer.property_type}
        </span>
      </div>
    </Link>
  )
}
