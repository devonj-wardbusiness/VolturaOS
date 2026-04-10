'use client'

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { LineItem, InvoicePayment } from '@/types'

const NAVY = '#161B2E'
const GOLD = '#C9A227'
const GRAY = '#6b7280'
const LIGHT = '#f3f4f6'
const GREEN = '#16a34a'
const RED = '#dc2626'

const styles = StyleSheet.create({
  page: { backgroundColor: '#ffffff', fontFamily: 'Helvetica', fontSize: 10, color: NAVY },

  // Header bar
  headerBar: { backgroundColor: NAVY, paddingHorizontal: 40, paddingVertical: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  brand: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: GOLD, letterSpacing: 3 },
  brandSub: { fontSize: 8, color: '#9ca3af', marginTop: 3 },
  headerContact: { alignItems: 'flex-end' },
  headerContactText: { color: '#d1d5db', fontSize: 8, marginBottom: 2 },

  // Body
  body: { paddingHorizontal: 40, paddingTop: 24, paddingBottom: 80 },

  // Invoice meta row
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  invoiceNumber: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: NAVY },
  invoiceLabel: { fontSize: 8, color: GRAY, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  metaValue: { fontSize: 10, color: NAVY },
  metaLabel: { fontSize: 8, color: GRAY, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },

  // Bill to
  billSection: { backgroundColor: LIGHT, borderRadius: 4, padding: 12, marginBottom: 20 },
  billLabel: { fontSize: 7, color: GRAY, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
  billName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 3 },
  billInfo: { fontSize: 9, color: GRAY, marginBottom: 2 },

  // Line items table
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: NAVY, marginBottom: 2 },
  tableHeaderText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: GRAY, textTransform: 'uppercase', letterSpacing: 1 },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  lineDesc: { color: NAVY, fontSize: 9, flex: 1, paddingRight: 12 },
  lineSubDesc: { color: GRAY, fontSize: 8, marginTop: 2 },
  linePrice: { color: NAVY, fontFamily: 'Helvetica-Bold', fontSize: 10, width: 70, textAlign: 'right' },

  // Totals
  totalsSection: { marginTop: 12, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', marginBottom: 5 },
  totalLabel: { color: GRAY, fontSize: 9, width: 90, textAlign: 'right', marginRight: 16 },
  totalValue: { fontSize: 10, width: 70, textAlign: 'right' },
  balanceDivider: { borderTopWidth: 1.5, borderTopColor: GOLD, width: 176, marginBottom: 6 },
  balanceRow: { flexDirection: 'row' },
  balanceLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: NAVY, width: 90, textAlign: 'right', marginRight: 16 },
  balanceValue: { fontFamily: 'Helvetica-Bold', fontSize: 14, width: 70, textAlign: 'right' },

  // Payment history
  sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: GRAY, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 20, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 4 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  payCell: { fontSize: 8.5, color: GRAY },
  payAmount: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: GREEN, width: 60, textAlign: 'right' },

  // Notes
  notesBox: { backgroundColor: LIGHT, borderRadius: 4, padding: 10, marginTop: 8 },
  notesText: { color: GRAY, fontSize: 8.5 },

  // PAID stamp
  paidStamp: { position: 'absolute', top: 110, right: 48, borderWidth: 3, borderColor: GREEN, paddingHorizontal: 10, paddingVertical: 5, transform: 'rotate(-15deg)' },
  paidText: { color: GREEN, fontFamily: 'Helvetica-Bold', fontSize: 22, letterSpacing: 3 },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: NAVY, paddingHorizontal: 40, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { color: '#9ca3af', fontSize: 8 },
  footerBrand: { color: GOLD, fontFamily: 'Helvetica-Bold', fontSize: 9, letterSpacing: 1 },
})

interface InvoicePDFProps {
  invoiceId: string
  customerName: string
  customerPhone?: string | null
  customerAddress?: string | null
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
  customerAddress,
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
        {/* Header bar */}
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.brand}>VOLTURA</Text>
            <Text style={styles.brandSub}>POWER GROUP  ·  Colorado Springs, CO</Text>
          </View>
          <View style={styles.headerContact}>
            <Text style={styles.headerContactText}>volturapower.energy</Text>
            <Text style={styles.headerContactText}>(719) 440-4528</Text>
            <Text style={styles.headerContactText}>License #EC.0202116</Text>
          </View>
        </View>

        {/* PAID stamp */}
        {status === 'Paid' && (
          <View style={styles.paidStamp}>
            <Text style={styles.paidText}>PAID</Text>
          </View>
        )}

        <View style={styles.body}>
          {/* Invoice # and date */}
          <View style={styles.metaRow}>
            <View>
              <Text style={styles.invoiceLabel}>Invoice</Text>
              <Text style={styles.invoiceNumber}>#{shortId}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.metaLabel}>Date Issued</Text>
              <Text style={styles.metaValue}>{date}</Text>
              <Text style={[styles.metaLabel, { marginTop: 8 }]}>Status</Text>
              <Text style={[styles.metaValue, { fontFamily: 'Helvetica-Bold', color: status === 'Paid' ? GREEN : status === 'Partial' ? GOLD : RED }]}>{status}</Text>
            </View>
          </View>

          {/* Bill To */}
          <View style={styles.billSection}>
            <Text style={styles.billLabel}>Bill To</Text>
            <Text style={styles.billName}>{customerName}</Text>
            {customerAddress && <Text style={styles.billInfo}>{customerAddress}</Text>}
            {customerPhone && <Text style={styles.billInfo}>{customerPhone}</Text>}
          </View>

          {/* Line Items */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Description</Text>
            <Text style={[styles.tableHeaderText, { width: 70, textAlign: 'right' }]}>Amount</Text>
          </View>
          {lineItems.map((item, i) => (
            <View key={i} style={styles.lineItem}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.lineDesc}>{item.description}</Text>
                {item.pricebook_description && (
                  <Text style={styles.lineSubDesc}>{item.pricebook_description}</Text>
                )}
              </View>
              <Text style={styles.linePrice}>${item.price.toLocaleString()}</Text>
            </View>
          ))}

          {/* Totals */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={[styles.totalValue, { color: NAVY }]}>${total.toLocaleString()}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Amount Paid</Text>
              <Text style={[styles.totalValue, { color: GREEN }]}>-${amountPaid.toLocaleString()}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Balance Due</Text>
              <Text style={[styles.balanceValue, { color: balance === 0 ? GREEN : RED }]}>${balance.toLocaleString()}</Text>
            </View>
          </View>

          {/* Payment History */}
          {payments.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Payment History</Text>
              {payments.map((p, i) => (
                <View key={i} style={styles.payRow}>
                  <Text style={styles.payCell}>{new Date(p.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                  <Text style={styles.payCell}>{p.payment_method}</Text>
                  {p.notes ? <Text style={[styles.payCell, { flex: 1, marginHorizontal: 8 }]}>{p.notes}</Text> : <Text style={{ flex: 1 }} />}
                  <Text style={styles.payAmount}>${p.amount.toLocaleString()}</Text>
                </View>
              ))}
            </>
          )}

          {/* Notes */}
          {notes && (
            <>
              <Text style={styles.sectionTitle}>Notes</Text>
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>{notes}</Text>
              </View>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Thank you for choosing Voltura Power Group</Text>
          <Text style={styles.footerBrand}>VOLTURA</Text>
          <Text style={styles.footerText}>Zelle · Cash · Check · Credit Card</Text>
        </View>
      </Page>
    </Document>
  )
}
