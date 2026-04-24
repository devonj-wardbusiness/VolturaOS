'use client'

import { useRouter } from 'next/navigation'
import type { Customer } from '@/types'

interface CustomerHeaderProps {
  customer: Pick<Customer, 'name' | 'phone'>
}

export function CustomerHeader({ customer }: CustomerHeaderProps) {
  const router = useRouter()
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-[#0D0F1A]/95 backdrop-blur-sm border-b border-white/5 px-4"
      style={{ height: 'var(--header-h)', paddingTop: 'var(--sat)' }}
    >
      <div className="flex items-center gap-3 h-14">
        <button onClick={() => router.back()} className="text-volturaGold text-xl p-1 -ml-1 flex-shrink-0">
          ←
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-base truncate leading-tight">{customer.name}</p>
          {customer.phone && (
            <a href={`tel:${customer.phone}`} className="text-gray-500 text-xs truncate block">
              {customer.phone}
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
