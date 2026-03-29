'use client'

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { LineItem, InvoicePayment } from '@/types'

const styles = StyleSheet.create({
  page: { backgroundColor: '#1A1F6E', padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#ffffff' },
  header: { marginBottom: 24 },
  brand: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#C9A227', letterSpacing: 4 },
  brandSub: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#2E4BA0', marginVertical: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: '#9ca3af', fontSize: 9 },
  value: { color: '#ffffff', fontSize: 10 },
  sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#9ca3af', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#2E4BA0' },
  lineDesc: { color: '#ffffff', fontSize: 9, flex: 1, paddingRight: 8 },
  linePrice: { color: '#C9A227', fontFamily: 'Helvetica-Bold', fontSize: 10, width: 70, textAlign: 'right' },
  summaryRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 },
  summaryLabel: { color: '#9ca3af', fontSize: 9, width: 80, textAlign: 'right', marginRight: 12 },
  summaryValue: { fontSize: 10, width: 70, textAlign: 'right' },
  balanceRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, paddingTop: 8, borderTopWidth: 2, borderTopColor: '#C9A227' },
  balanceLabel: { color: '#9ca3af', fontSize: 10, marginRight: 16 },
  balanceValue: { color: '#C9A227', fontFamily: 'Helvetica-Bold', fontSize: 14 },
  payment: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#2E4BA0' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { color: '#6b7280', fontSize: 8 },
  paidStamp: { position: 'absolute', top: 120, right: 40, borderWidth: 3, borderColor: '#22c55e', paddingHorizontal: 10, paddingVertical: 4, transform: 'rotate(-15deg)' },
  paidText: { color: '#22c55e', fontFamily: 'Helvetica-Bold', fontSize: 24, letterSpacing: 3 },
})

interface InvoicePDFProps {
  invoiceId: string
  customerName: string
  customerPhone?: string | null
  lineItems: LineItem[]
  total: number
  amountPaid: number
  balance: number
  status: string
  payments: InvoicePayment[]
  notes?: string | null
  createdAt: string
}

export function InvoicePDF({
  invoiceId,
  customerName,
  customerPhone,
  lineItems,
  total,
  amountPaid,
  balance,
  status,
  payments,
  notes,
  createdAt,
}: InvoicePDFProps) {
  const date = new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const shortId = invoiceId.slice(0, 8).toUpperCase()

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>VOLTURA</Text>
          <Text style={styles.brandSub}>Power Group  |  Colorado Springs, CO  |  volturapower.energy</Text>
        </View>

        {/* PAID stamp */}
        {status === 'Paid' && (
          <View style={styles.paidStamp}>
            <Text style={styles.paidText}>PAID</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Meta */}
        <View style={styles.row}>
          <View>
            <Text style={styles.label}>INVOICE</Text>
            <Text style={[styles.value, { fontSize: 13, fontFamily: 'Helvetica-Bold' }]}>#{shortId}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.label}>DATE</Text>
            <Text style={styles.value}>{date}</Text>
          </View>
        </View>

        {/* Customer */}
        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Bill To</Text>
        <Text style={[styles.value, { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 4 }]}>{customerName}</Text>
        {customerPhone && <Text style={styles.label}>{customerPhone}</Text>}

        {/* Line Items */}
        <Text style={styles.sectionTitle}>Services</Text>
        {lineItems.map((item, i) => (
          <View key={i} style={styles.lineItem}>
            <Text style={styles.lineDesc}>{item.description}</Text>
            <Text style={styles.linePrice}>${item.price.toLocaleString()}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={[styles.summaryRow, { marginTop: 12 }]}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={[styles.summaryValue, { color: '#ffffff' }]}>${total.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Paid</Text>
          <Text style={[styles.summaryValue, { color: '#22c55e' }]}>${amountPaid.toLocaleString()}</Text>
        </View>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>BALANCE DUE</Text>
          <Text style={[styles.balanceValue, balance === 0 ? { color: '#22c55e' } : {}]}>${balance.toLocaleString()}</Text>
        </View>

        {/* Payment History */}
        {payments.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Payment History</Text>
            {payments.map((p, i) => (
              <View key={i} style={styles.payment}>
                <Text style={{ color: '#9ca3af', fontSize: 8 }}>{new Date(p.paid_at).toLocaleDateString()}</Text>
                <Text style={{ color: '#9ca3af', fontSize: 8 }}>{p.payment_method}</Text>
                <Text style={{ color: '#22c55e', fontSize: 9, fontFamily: 'Helvetica-Bold' }}>${p.amount.toLocaleString()}</Text>
              </View>
            ))}
          </>
        )}

        {/* Notes */}
        {notes && (
          <>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={{ color: '#d1d5db', fontSize: 9, marginTop: 4 }}>{notes}</Text>
          </>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Thank you for choosing Voltura Power Group</Text>
          <Text style={styles.footerText}>Zelle · Cash · Check · Credit Card accepted</Text>
        </View>
      </Page>
    </Document>
  )
}
