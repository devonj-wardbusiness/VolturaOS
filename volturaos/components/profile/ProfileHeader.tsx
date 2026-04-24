'use client'

import { useRouter } from 'next/navigation'
import { StatusPill } from '@/components/ui/StatusPill'
import type { JobStatus } from '@/types'

interface ProfileHeaderProps {
  customerName: string
  customerPhone: string | null
  jobType: string
  status: JobStatus
}

export function ProfileHeader({ customerName, customerPhone, jobType, status }: ProfileHeaderProps) {
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
          <p className="text-white font-bold text-base truncate leading-tight">{customerName}</p>
          <p className="text-gray-500 text-xs truncate">
            {customerPhone && <span className="mr-2">{customerPhone}</span>}
            <span>{jobType}</span>
          </p>
        </div>
        <StatusPill status={status} />
      </div>
    </header>
  )
}
