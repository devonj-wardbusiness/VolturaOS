'use client'
import Link from 'next/link'
import type { Job } from '@/types'
import { STATUS_ACCENT } from '@/lib/constants/jobStatus'

interface JobCalendarProps {
  jobs: (Job & { customer: { name: string } })[]
  year: number
  month: number
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function JobCalendar({ jobs, year, month }: JobCalendarProps) {
  // Month navigation — December-safe
  const prevDate = new Date(year, month - 2, 1) // month-2: JS 0-indexed, month is 1-indexed
  const nextDate = new Date(year, month, 1)
  const prevParam = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  const nextParam = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Today in local time (YYYY-MM-DD)
  const todayISO = new Date().toLocaleDateString('en-CA')

  // Build grid: first day of month and total days
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate()

  // Total cells: leading fillers + days + trailing fillers to fill complete rows
  const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7

  // Build a map: 'YYYY-MM-DD' → jobs[]
  const jobsByDate: Record<string, (Job & { customer: { name: string } })[]> = {}
  for (const job of jobs) {
    if (job.scheduled_date) {
      if (!jobsByDate[job.scheduled_date]) jobsByDate[job.scheduled_date] = []
      jobsByDate[job.scheduled_date].push(job)
    }
  }

  const mm = String(month).padStart(2, '0')

  return (
    <div className="mt-2">
      {/* Month navigation header */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href={`/jobs/calendar?month=${prevParam}`}
          className="text-gray-400 hover:text-volturaGold px-3 py-1 text-lg"
        >
          ←
        </Link>
        <span className="text-white font-semibold text-sm">{monthLabel}</span>
        <Link
          href={`/jobs/calendar?month=${nextParam}`}
          className="text-gray-400 hover:text-volturaGold px-3 py-1 text-lg"
        >
          →
        </Link>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-gray-500 text-[10px] uppercase tracking-wider py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/5 rounded-xl overflow-hidden">
        {Array.from({ length: totalCells }, (_, idx) => {
          const dayNum = idx - firstDayOfMonth + 1
          const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth

          if (!isCurrentMonth) {
            return (
              <div key={idx} className="bg-volturaBlue min-h-[80px] p-1">
                <span className="text-white/20 text-xs">
                  {dayNum <= 0
                    ? new Date(year, month - 1, dayNum).getDate()
                    : dayNum - daysInMonth}
                </span>
              </div>
            )
          }

          const dd = String(dayNum).padStart(2, '0')
          const dateKey = `${year}-${mm}-${dd}`
          const dayJobs = jobsByDate[dateKey] ?? []
          const isToday = dateKey === todayISO
          const visibleJobs = dayJobs.slice(0, 2)
          const extraCount = dayJobs.length - 2

          return (
            <div key={idx} className="bg-volturaNavy/80 min-h-[80px] p-1">
              {/* Day number */}
              <div className="flex justify-start mb-1">
                <span
                  className={`text-xs w-5 h-5 flex items-center justify-center ${
                    isToday
                      ? 'ring-1 ring-volturaGold rounded-full text-volturaGold font-bold'
                      : 'text-gray-400'
                  }`}
                >
                  {dayNum}
                </span>
              </div>

              {/* Job chips */}
              <div className="flex flex-col gap-0.5">
                {visibleJobs.map(job => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="block text-[10px] text-white truncate px-1 rounded border-l-2 bg-white/5"
                    style={{ borderLeftColor: STATUS_ACCENT[job.status] ?? '#4b5563' }}
                  >
                    {job.customer.name}
                  </Link>
                ))}
                {extraCount > 0 && (
                  <span className="text-gray-500 text-xs pl-1">+{extraCount} more</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
