import type { JobStatus } from '@/types'

export const STATUS_ACCENT: Record<JobStatus, string> = {
  'Lead':        '#6b7280',
  'Scheduled':   '#38bdf8',
  'In Progress': '#f59e0b',
  'Completed':   '#4ade80',
  'Invoiced':    '#a78bfa',
  'Paid':        '#4ade80',
  'Cancelled':   '#f87171',
}
