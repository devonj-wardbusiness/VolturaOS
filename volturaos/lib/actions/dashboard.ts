'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

async function requireAuth() { // auth disabled
  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user) redirect("/login")
}

export async function getDashboardData() {
  await requireAuth()
  const admin = createAdminClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const today = new Date().toISOString().slice(0, 10)

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const [invoices, jobs, estimates, recentJobs, payments, todayJobs, unpaidInvoices, stuckLeadsRes] = await Promise.all([
    admin.from('invoices').select('total, amount_paid, status, created_at'),
    admin.from('jobs').select('status, created_at'),
    admin.from('estimates').select('status, total, created_at'),
    admin.from('jobs').select('*, customers(name)').order('created_at', { ascending: false }).limit(5),
    admin.from('invoice_payments').select('amount, paid_at').gte('paid_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    admin.from('jobs').select('id, job_type, status, scheduled_date, scheduled_time, customers(name, phone)').eq('scheduled_date', today).not('status', 'in', '("Cancelled","Paid","Completed")').order('scheduled_time', { ascending: true }),
    admin.from('invoices').select('id, total, balance, status, due_date, created_at, customers(name)').in('status', ['Unpaid', 'Partial']),
    admin.from('jobs').select('id, job_type, status, created_at, customers(name)').eq('status', 'Lead').lt('created_at', sevenDaysAgo).limit(10),
  ])

  const allInvoices = (invoices.data ?? []) as Record<string, unknown>[]
  const allPayments = (payments.data ?? []) as { amount: number; paid_at: string }[]
  const sparklineData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10)
    const amount = allPayments
      .filter(p => p.paid_at.startsWith(date))
      .reduce((sum, p) => sum + (p.amount ?? 0), 0)
    return { date, amount }
  })
  const allJobs = (jobs.data ?? []) as Record<string, unknown>[]
  const allEstimates = (estimates.data ?? []) as Record<string, unknown>[]

  // This month's revenue (amount paid this month)
  const monthRevenue = allInvoices
    .filter(i => (i.created_at as string) >= monthStart)
    .reduce((sum, i) => sum + ((i.amount_paid as number) || 0), 0)

  // Total outstanding balance
  const totalOutstanding = allInvoices
    .filter(i => i.status !== 'Paid')
    .reduce((sum, i) => sum + ((i.total as number) - ((i.amount_paid as number) || 0)), 0)

  // Active jobs
  const activeJobs = allJobs.filter(j =>
    !['Completed', 'Invoiced', 'Paid', 'Cancelled'].includes(j.status as string)
  ).length

  // Pending estimates
  const pendingEstimates = allEstimates.filter(e =>
    ['Draft', 'Sent', 'Viewed'].includes(e.status as string)
  ).length

  // Approved pipeline value
  const approvedValue = allEstimates
    .filter(e => e.status === 'Approved')
    .reduce((sum, e) => sum + ((e.total as number) || 0), 0)

  // Close rate
  const sentOrBetter = allEstimates.filter(e =>
    ['Sent', 'Viewed', 'Approved', 'Declined'].includes(e.status as string)
  ).length
  const approved = allEstimates.filter(e => e.status === 'Approved').length
  const closeRate = sentOrBetter > 0 ? Math.round((approved / sentOrBetter) * 100) : 0

  // Build attention items
  type AttentionItem = { type: 'invoice' | 'job'; id: string; label: string; href: string; daysOverdue?: number }
  const nowMs = Date.now()

  const overdueInvoiceItems = ((unpaidInvoices.data ?? []) as Record<string, unknown>[])
    .map((inv) => {
      const dueMs = inv.due_date
        ? new Date((inv.due_date as string) + 'T00:00:00').getTime()
        : new Date(inv.created_at as string).getTime() + 30 * 86400000
      const daysOverdue = Math.floor((nowMs - dueMs) / 86400000)
      if (daysOverdue <= 0) return null
      const cust = inv.customers as { name: string } | null
      const balance = ((inv.balance as number | null) ?? (inv.total as number))
      const item: AttentionItem = {
        type: 'invoice',
        id: inv.id as string,
        label: `${cust?.name ?? 'Unknown'} — $${balance.toLocaleString()} overdue`,
        href: `/invoices/${inv.id as string}`,
        daysOverdue,
      }
      return item
    })
    .filter((x): x is AttentionItem => x !== null)
    .sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0))

  const stuckLeadItems: AttentionItem[] = ((stuckLeadsRes.data ?? []) as Record<string, unknown>[]).map((job) => {
    const cust = job.customers as { name: string } | null
    const daysStuck = Math.floor((nowMs - new Date(job.created_at as string).getTime()) / 86400000)
    return {
      type: 'job',
      id: job.id as string,
      label: `${cust?.name ?? 'Unknown'} — ${job.job_type as string} (${daysStuck}d as Lead)`,
      href: `/jobs/${job.id as string}`,
    }
  })

  const attentionItems = [...overdueInvoiceItems, ...stuckLeadItems].slice(0, 6)

  return {
    monthRevenue,
    totalOutstanding,
    activeJobs,
    pendingEstimates,
    approvedValue,
    closeRate,
    sparklineData,
    attentionItems,
    recentJobs: (recentJobs.data ?? []).map((row) => {
      const { customers, ...j } = row as Record<string, unknown>
      return { ...j, customer: customers }
    }),
    todayJobs: (todayJobs.data ?? []).map((row) => {
      const { customers, ...j } = row as Record<string, unknown>
      return { ...j, customer: customers }
    }),
  }
}
