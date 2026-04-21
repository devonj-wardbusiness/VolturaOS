'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Zap, Wrench, Users, DollarSign } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const tabs: { href: string; label: string; Icon: LucideIcon; also?: string[] }[] = [
  { href: '/',          label: 'Home',      Icon: Zap },
  { href: '/jobs',      label: 'Today',     Icon: Wrench },
  { href: '/customers', label: 'Customers', Icon: Users },
  { href: '/invoices',  label: 'Money',     Icon: DollarSign, also: ['/estimates'] },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0D0F1A]/95 backdrop-blur-sm border-t border-white/5 z-40">
      <div className="flex h-full">
        {tabs.map(({ href, label, Icon, also }) => {
          const active =
            pathname === href ||
            (href !== '/' && pathname.startsWith(href)) ||
            (also?.some((p) => pathname.startsWith(p)) ?? false)
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5"
            >
              {/* Gold pill indicator */}
              <div className={`w-8 h-1 rounded-full mb-0.5 transition-opacity ${active ? 'bg-volturaGold opacity-100' : 'opacity-0'}`} />
              <Icon
                size={20}
                className={active ? 'text-volturaGold' : 'text-gray-500'}
              />
              <span className={`text-[10px] ${active ? 'text-volturaGold' : 'text-gray-500'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
