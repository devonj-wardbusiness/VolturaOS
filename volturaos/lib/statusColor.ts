export function statusColor(status: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    'Draft':       { bg: 'bg-gray-800',       text: 'text-gray-400' },
    'Sent':        { bg: 'bg-blue-900/50',     text: 'text-blue-300' },
    'Viewed':      { bg: 'bg-indigo-900/50',   text: 'text-indigo-300' },
    'Approved':    { bg: 'bg-emerald-900/50',  text: 'text-emerald-300' },
    'Declined':    { bg: 'bg-red-900/50',      text: 'text-red-300' },
    'Lead':        { bg: 'bg-gray-700',        text: 'text-gray-300' },
    'Scheduled':   { bg: 'bg-sky-900/50',      text: 'text-sky-300' },
    'In Progress': { bg: 'bg-amber-900/50',    text: 'text-amber-300' },
    'Completed':   { bg: 'bg-green-900/50',    text: 'text-green-300' },
    'Invoiced':    { bg: 'bg-purple-900/50',   text: 'text-purple-300' },
    'Unpaid':      { bg: 'bg-orange-900/50',   text: 'text-orange-300' },
    'Partial':     { bg: 'bg-yellow-900/50',   text: 'text-yellow-300' },
    'Paid':        { bg: 'bg-teal-900/50',     text: 'text-teal-300' },
    'Cancelled':   { bg: 'bg-gray-800',        text: 'text-gray-400' },
    'Active':      { bg: 'bg-emerald-900/50',  text: 'text-emerald-300' },
    'Expired':     { bg: 'bg-red-900/50',      text: 'text-red-300' },
  }
  return map[status] ?? { bg: 'bg-gray-800', text: 'text-gray-400' }
}
