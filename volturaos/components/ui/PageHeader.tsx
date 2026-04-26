'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Pass any truthy string to show the back chevron. Tapping always calls router.back(). */
  backHref?: string
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, backHref, action }: PageHeaderProps) {
  const router = useRouter()

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-[#0D0F1A]/90 backdrop-blur-sm border-b border-white/5 flex items-center"
      style={{ height: 'var(--header-h)', paddingTop: 'var(--sat)' }}
    >
      {/* Back button */}
      <div className="absolute left-0 pl-2">
        {backHref && (
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10"
            aria-label="Go back"
          >
            <ChevronLeft size={20} className="text-volturaGold" />
          </button>
        )}
      </div>

      {/* Title + subtitle (centered) */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <span className="text-white text-sm font-semibold font-display tracking-wide leading-tight">{title}</span>
        {subtitle && (
          <span className="text-gray-400 text-[10px] leading-tight">{subtitle}</span>
        )}
      </div>

      {/* Action slot — padded right to clear the global search icon */}
      <div className="absolute right-0 pr-10">
        {action}
      </div>
    </header>
  )
}
