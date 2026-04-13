'use client'

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { LineItem, InvoicePayment } from '@/types'

const NAVY = '#161B2E'
const GOLD = '#C9A227'
const GRAY = '#6b7280'
const LIGHT = '#f3f4f6'
const GREEN = '#16a34a'
const RED = '#dc2626'
const GOLD_LIGHT = '#FDF3D0'

const styles = StyleSheet.create({
  page: { backgroundColor: '#ffffff', fontFamily: 'Helvetica', fontSize: 10, color: NAVY },

  // Header bar
  headerBar: { backgroundColor: NAVY, paddingHorizontal: 40, paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: GOLD, letterSpacing: 3 },
  brandSub: { fontSize: 7.5, color: '#9ca3af', marginTop: 2 },
  headerContact: { alignItems: 'flex-end' },
  headerContactText: { color: '#d1d5db', fontSize: 7.5, marginBottom: 2 },

  // Balance Due hero — top right gold box
  balanceHero: { backgroundColor: GOLD, borderRadius: 6, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', minWidth: 130 },
  balanceHeroLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: NAVY, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 3 },
  balanceHeroAmount: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: NAVY },
  balanceHeroPaid: { backgroundColor: GREEN, borderRadius: 6, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', minWidth: 130 },
  balanceHeroPaidText: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 2 },

  // Body
  body: { paddingHorizontal: 40, paddingTop: 20, paddingBottom: 90 },

  // Invoice meta row
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'flex-start' },
  invoiceNumber: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: NAVY },
  invoiceLabel: { fontSize: 7.5, color: GRAY, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 3 },
  metaValue: { fontSize: 10, color: NAVY },
  metaLabel: { fontSize: 7.5, color: GRAY, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  metaRight: { alignItems: 'flex-end', gap: 6 },
  metaItem: { alignItems: 'flex-end' },

  // Bill to / addresses
  addressRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  addressBlock: { flex: 1, backgroundColor: LIGHT, borderRadius: 4, padding: 10 },
  addressLabel: { fontSize: 7, color: GRAY, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 5 },
  addressName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 2 },
  addressInfo: { fontSize: 8.5, color: GRAY, marginBottom: 1.5 },

  // Permit badge
  permitBadge: { backgroundColor: '#EEF2FF', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 16, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  permitText: { fontSize: 8, color: '#4338CA', fontFamily: 'Helvetica-Bold' },

  // Line items table
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: NAVY, marginBottom: 2 },
  tableHeaderText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: GRAY, textTransform: 'uppercase', letterSpacing: 1 },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  lineDesc: { color: NAVY, fontSize: 9, flex: 1, paddingRight: 12 },
  lineSubDesc: { color: GRAY, fontSize: 7.5, marginTop: 2 },
  linePrice: { color: NAVY, fontFamily: 'Helvetica-Bold', fontSize: 10, width: 70, textAlign: 'right' },

  // Totals
  totalsSection: { marginTop: 10, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', marginBottom: 4 },
  totalLabel: { color: GRAY, fontSize: 9, width: 90, textAlign: 'right', marginRight: 16 },
  totalValue: { fontSize: 10, width: 70, textAlign: 'right' },
  balanceDivider: { borderTopWidth: 1.5, borderTopColor: GOLD, width: 176, marginBottom: 5 },
  balanceRow: { flexDirection: 'row' },
  balanceLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: NAVY, width: 90, textAlign: 'right', marginRight: 16 },
  balanceValue: { fontFamily: 'Helvetica-Bold', fontSize: 14, width: 70, textAlign: 'right' },

  // Payment history
  sectionTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: GRAY, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 16, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 4 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  payCell: { fontSize: 8.5, color: GRAY },
  payAmount: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: GREEN, width: 60, textAlign: 'right' },

  // Notes
  notesBox: { backgroundColor: LIGHT, borderRadius: 4, padding: 10, marginTop: 8 },
  notesText: { color: GRAY, fontSize: 8.5 },

  // Warranty banner
  warrantyBox: { backgroundColor: '#F0FDF4', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8, marginTop: 14, flexDirection: 'row', alignItems: 'center' },
  warrantyText: { fontSize: 8, color: '#166534' },

  // Signature block
  sigBlock: { marginTop: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  sigStatement: { fontSize: 7.5, color: GRAY, marginBottom: 12 },
  sigRow: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  sigField: { flex: 1 },
  sigFieldNarrow: { width: 120 },
  sigLine: { borderBottomWidth: 1, borderBottomColor: NAVY, height: 26, marginBottom: 4 },
  sigLabel: { fontSize: 7, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.8 },

  // PAID stamp
  paidStamp: { position: 'absolute', top: 108, right: 48, borderWidth: 3, borderColor: GREEN, paddingHorizontal: 10, paddingVertical: 5, transform: 'rotate(-15deg)' },
  paidText: { color: GREEN, fontFamily: 'Helvetica-Bold', fontSize: 22, letterSpacing: 3 },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: NAVY, paddingHorizontal: 40, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { color: '#9ca3af', fontSize: 7.5 },
  footerBrand: { color: GOLD, fontFamily: 'Helvetica-Bold', fontSize: 8.5, letterSpacing: 1 },
})

interface InvoicePDFProps {
  invoiceId: string
  customerName: string
  customerPhone?: string | null
  customerAddress?: string | null
  jobAddress?: string | null
  lineItems: LineItem[]
  total: number
  amountPaid: number
  balance: number
  status: string
  payments: InvoicePayment[]
  notes?: string | null
  createdAt: string
  dueDate?: string | null
  permitNumber?: string | null
}

export function InvoicePDF({
  invoiceId,
  customerName,
  customerPhone,
  customerAddress,
  jobAddress,
  lineItems,
  total,
  amountPaid,
  balance,
  status,
  payments,
  notes,
  createdAt,
  dueDate,
  permitNumber,
}: InvoicePDFProps) {
  const date = new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const shortId = invoiceId.slice(0, 8).toUpperCase()

  // Due date: use provided or default to Net 30
  const dueDateObj = dueDate
    ? new Date(dueDate + 'T00:00:00')
    : new Date(new Date(createdAt).getTime() + 30 * 86400000)
  const dueDateStr = dueDateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const isPaid = status === 'Paid'

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>

        {/* Header bar */}
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.brand}>VOLTURA</Text>
            <Text style={styles.brandSub}>POWER GROUP  ·  Colorado Springs, CO</Text>
            <Text style={[styles.brandSub, { marginTop: 2 }]}>volturapower.energy  ·  (719) 440-4528</Text>
            <Text style={[styles.brandSub, { marginTop: 1 }]}>License #EC.0202116</Text>
          </View>

          {/* Balance Due hero */}
          {isPaid ? (
            <View style={styles.balanceHeroPaid}>
              <Text style={styles.balanceHeroPaidText}>PAID IN FULL</Text>
            </View>
          ) : (
            <View style={styles.balanceHero}>
              <Text style={styles.balanceHeroLabel}>Balance Due</Text>
              <Text style={styles.balanceHeroAmount}>${balance.toLocaleString()}</Text>
            </View>
          )}
        </View>

        {/* PAID stamp */}
        {isPaid && (
          <View style={styles.paidStamp}>
            <Text style={styles.paidText}>PAID</Text>
          </View>
        )}

        <View style={styles.body}>

          {/* Invoice # and dates */}
          <View style={styles.metaRow}>
            <View>
              <Text style={styles.invoiceLabel}>Invoice</Text>
              <Text style={styles.invoiceNumber}>#{shortId}</Text>
            </View>
            <View style={styles.metaRight}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Date Issued</Text>
                <Text style={styles.metaValue}>{date}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: isPaid ? GRAY : '#dc2626' }]}>Due Date</Text>
                <Text style={[styles.metaValue, { fontFamily: 'Helvetica-Bold', color: isPaid ? NAVY : '#dc2626' }]}>{dueDateStr}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Status</Text>
                <Text style={[styles.metaValue, { fontFamily: 'Helvetica-Bold', color: isPaid ? GREEN : status === 'Partial' ? GOLD : RED }]}>{status}</Text>
              </View>
            </View>
          </View>

          {/* Permit badge */}
          {permitNumber && (
            <View style={styles.permitBadge}>
              <Text style={styles.permitText}>📋 Permit #{permitNumber}</Text>
            </View>
          )}

          {/* Addresses */}
          <View style={styles.addressRow}>
            <View style={styles.addressBlock}>
              <Text style={styles.addressLabel}>Bill To</Text>
              <Text style={styles.addressName}>{customerName}</Text>
              {customerAddress && <Text style={styles.addressInfo}>{customerAddress}</Text>}
              {customerPhone && <Text style={styles.addressInfo}>{customerPhone}</Text>}
            </View>
            {jobAddress && jobAddress !== customerAddress && (
              <View style={styles.addressBlock}>
                <Text style={styles.addressLabel}>Service Address</Text>
                <Text style={styles.addressName}>{customerName}</Text>
                <Text style={styles.addressInfo}>{jobAddress}</Text>
              </View>
            )}
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
            {amountPaid > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Amount Paid</Text>
                <Text style={[styles.totalValue, { color: GREEN }]}>-${amountPaid.toLocaleString()}</Text>
              </View>
            )}
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

          {/* Warranty statement */}
          <View style={styles.warrantyBox}>
            <Text style={styles.warrantyText}>
              ✓  All labor warranted 12 months from completion date. Materials under manufacturer warranty. Contact us for warranty service.
            </Text>
          </View>

          {/* Signature block — only shown when invoice is unpaid/partial */}
          {!isPaid && (
            <View style={styles.sigBlock}>
              <Text style={styles.sigStatement}>
                By signing below, I/we authorize payment of the balance due and confirm that all services listed above were completed to satisfaction. Unpaid balances after 30 days are subject to a 1.5% monthly finance charge.
              </Text>
              <View style={styles.sigRow}>
                <View style={styles.sigField}>
                  <View style={styles.sigLine} />
                  <Text style={styles.sigLabel}>Customer Signature</Text>
                </View>
                <View style={styles.sigFieldNarrow}>
                  <View style={styles.sigLine} />
                  <Text style={styles.sigLabel}>Date</Text>
                </View>
              </View>
              <View style={[styles.sigRow, { marginBottom: 0 }]}>
                <View style={styles.sigField}>
                  <View style={styles.sigLine} />
                  <Text style={styles.sigLabel}>Print Name</Text>
                </View>
                <View style={styles.sigFieldNarrow}>
                  <View style={styles.sigLine} />
                  <Text style={styles.sigLabel}>Phone / Email</Text>
                </View>
              </View>
            </View>
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
