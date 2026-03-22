'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/', label: 'Home', icon: '⚡' },
  { href: '/jobs', label: 'Jobs', icon: '🔧' },
  { href: '/customers', label: 'Customers', icon: '👤' },
  { href: '/estimates', label: 'Estimates', icon: '📋' },
  { href: '/settings/pricebook', label: 'More', icon: '⚙️' },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-volturaBlue border-t border-volturaNavy z-40">
      <div className="flex">
        {tabs.map((tab) => {
          const active = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
                active ? 'text-volturaGold' : 'text-gray-500'
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
