'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { recordPayment } from '@/lib/actions/invoices'
import type { PaymentMethod } from '@/types'

const METHODS: PaymentMethod[] = ['Check', 'Zelle', 'Cash', 'Credit Card']

interface PaymentFormProps {
  open: boolean
  onClose: () => void
  invoiceId: string
  balance: number
}

export function PaymentForm({ open, onClose, invoiceId, balance }: PaymentFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState(balance.toString())
  const [method, setMethod] = useState<PaymentMethod>('Check')
  const [notes, setNotes] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) return

    startTransition(async () => {
      await recordPayment({
        invoiceId,
        amount: numAmount,
        paymentMethod: method,
        notes: notes || undefined,
      })
      onClose()
      router.refresh()
    })
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Record Payment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-400 text-sm mb-1">Amount</label>
          <div className="relative">
            <span className="absolute left-4 top-3 text-white/50">$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-volturaNavy text-white rounded-xl pl-8 pr-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-volturaGold/50"
            />
          </div>
          <p className="text-gray-500 text-xs mt-1">Balance: ${balance.toLocaleString()}</p>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Payment Method</label>
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  method === m
                    ? 'bg-volturaGold text-volturaBlue'
                    : 'bg-white/10 text-white/70'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Check #, Zelle ref, etc."
            className="w-full bg-volturaNavy text-white rounded-xl px-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-volturaGold/50"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-green-600 text-white font-bold py-3 rounded-xl text-base disabled:opacity-50"
        >
          {isPending ? 'Recording...' : `Record $${parseFloat(amount || '0').toLocaleString()} Payment`}
        </button>
      </form>
    </BottomSheet>
  )
}
