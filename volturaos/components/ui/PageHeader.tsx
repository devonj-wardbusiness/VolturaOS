'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, backHref, action }: PageHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#0D0F1A]/90 backdrop-blur-sm border-b border-white/5 flex items-center">
      {/* Back button */}
      <div className="absolute left-0 pl-2">
        {backHref && (
          <Link href={backHref} className="flex items-center justify-center w-10 h-10">
            <ChevronLeft size={20} className="text-volturaGold" />
          </Link>
        )}
      </div>

      {/* Title + subtitle (centered) */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <span className="text-white text-sm font-semibold tracking-wide leading-tight">{title}</span>
        {subtitle && (
          <span className="text-gray-400 text-[10px] leading-tight">{subtitle}</span>
        )}
      </div>

      {/* Action slot */}
      <div className="absolute right-0 pr-1">
        {action}
      </div>
    </header>
  )
}
