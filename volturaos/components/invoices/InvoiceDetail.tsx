'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { Invoice, InvoicePayment } from '@/types'
import { StatusPill } from '@/components/ui/StatusPill'
import { PaymentForm } from './PaymentForm'
import { PaymentHistory } from './PaymentHistory'

const InvoiceDownloadButton = dynamic(
  () => import('@/components/pdf/InvoiceDownloadButton').then((m) => m.InvoiceDownloadButton),
  { ssr: false, loading: () => null }
)

interface InvoiceDetailProps {
  invoice: Invoice & {
    customer: { name: string; phone: string | null; address: string | null }
    payments: InvoicePayment[]
  }
}

export function InvoiceDetail({ invoice }: InvoiceDetailProps) {
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const lineItems = (invoice.line_items ?? [])

  async function handleShare() {
    const url = `${window.location.origin}/invoices/${invoice.id}/view`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'Invoice', url })
      }
    }
  }

  return (
    <div className="px-4 pb-8 space-y-4">
      {/* Customer */}
      <div className="bg-volturaNavy/50 rounded-xl p-4">
        <p className="text-white font-bold text-lg">{invoice.customer.name}</p>
        {invoice.customer.address && (
          <p className="text-gray-400 text-sm mt-0.5">📍 {invoice.customer.address}</p>
        )}
        {invoice.customer.phone && (
          <a href={`tel:${invoice.customer.phone}`} className="text-volturaGold text-sm block mt-1">
            📞 {invoice.customer.phone}
          </a>
        )}
      </div>

      {/* Totals */}
      <div className="bg-volturaNavy/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-400 text-sm">Status</span>
          <StatusPill status={invoice.status} />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Total</span>
            <span className="text-white font-bold">${invoice.total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Paid</span>
            <span className="text-green-400 font-bold">${invoice.amount_paid.toLocaleString()}</span>
          </div>
          <div className="border-t border-white/10 pt-2 flex justify-between">
            <span className="text-gray-400 text-sm font-semibold">Balance</span>
            <span className={`font-bold text-lg ${invoice.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
              ${invoice.balance.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Download PDF */}
      <InvoiceDownloadButton
        invoiceId={invoice.id}
        customerName={invoice.customer.name}
        customerPhone={invoice.customer.phone}
        customerAddress={invoice.customer.address}
        lineItems={invoice.line_items ?? []}
        total={invoice.total}
        amountPaid={invoice.amount_paid}
        balance={invoice.balance}
        status={invoice.status}
        payments={invoice.payments}
        notes={invoice.notes}
        createdAt={invoice.created_at}
      />

      {/* Share Invoice */}
      <button
        onClick={handleShare}
        className="w-full bg-volturaNavy border border-volturaGold/30 text-volturaGold font-semibold py-3 rounded-xl text-sm"
      >
        {copied ? '✓ Link Copied!' : '🔗 Share Invoice'}
      </button>

      {/* Record Payment button */}
      {invoice.status !== 'Paid' && (
        <button
          onClick={() => setPaymentOpen(true)}
          className="w-full bg-green-600 text-white font-bold py-3 rounded-xl text-base"
        >
          💵 Record Payment
        </button>
      )}

      {/* Line Items */}
      {lineItems.length > 0 && (
        <div className="bg-volturaNavy/50 rounded-xl p-4">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Services</p>
          <div className="space-y-3">
            {lineItems.map((item, i) => (
              <div key={i} className="flex justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm">{item.description}</p>
                  {item.pricebook_description && (
                    <p className="text-gray-500 text-xs mt-0.5 leading-snug">{item.pricebook_description}</p>
                  )}
                </div>
                <span className="text-volturaGold font-semibold text-sm flex-shrink-0">${item.price.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="bg-volturaNavy/50 rounded-xl p-4">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Payment History</p>
        <PaymentHistory payments={invoice.payments} />
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="bg-volturaNavy/50 rounded-xl p-4">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Notes</p>
          <p className="text-white/80 text-sm">{invoice.notes}</p>
        </div>
      )}

      <PaymentForm
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        invoiceId={invoice.id}
        balance={invoice.balance}
      />
    </div>
  )
}
