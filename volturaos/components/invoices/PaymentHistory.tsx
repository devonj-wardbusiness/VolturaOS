import type { InvoicePayment } from '@/types'

export function PaymentHistory({ payments }: { payments: InvoicePayment[] }) {
  if (payments.length === 0) {
    return <p className="text-gray-500 text-sm">No payments recorded yet.</p>
  }

  return (
    <div className="space-y-2">
      {payments.map((p) => (
        <div key={p.id} className="flex items-center justify-between bg-volturaBlue/50 rounded-lg px-3 py-2.5">
          <div>
            <p className="text-white text-sm font-medium">{p.payment_method}</p>
            <p className="text-gray-500 text-xs">
              {new Date(p.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {p.notes && ` · ${p.notes}`}
            </p>
          </div>
          <p className="text-green-400 font-bold text-sm">+${p.amount.toLocaleString()}</p>
        </div>
      ))}
    </div>
  )
}
