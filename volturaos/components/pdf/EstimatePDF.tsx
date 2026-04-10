'use client'

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { LineItem, Addon } from '@/types'

const NAVY = '#161B2E'
const GOLD = '#C9A227'
const GRAY = '#6b7280'
const LIGHT = '#f3f4f6'

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

  // Meta row
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  estimateNumber: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: NAVY },
  metaLabel: { fontSize: 8, color: GRAY, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
  metaValue: { fontSize: 10, color: NAVY },

  // Customer card
  customerSection: { backgroundColor: LIGHT, borderRadius: 4, padding: 12, marginBottom: 20 },
  customerLabel: { fontSize: 7, color: GRAY, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
  customerName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 3 },
  customerInfo: { fontSize: 9, color: GRAY, marginBottom: 2 },

  // Line items table
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: NAVY, marginBottom: 2 },
  tableHeaderText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: GRAY, textTransform: 'uppercase', letterSpacing: 1 },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  lineDesc: { color: NAVY, fontSize: 9, flex: 1, paddingRight: 12 },
  linePrice: { color: NAVY, fontFamily: 'Helvetica-Bold', fontSize: 10, width: 70, textAlign: 'right' },

  // Total
  totalSection: { marginTop: 12, alignItems: 'flex-end' },
  totalDivider: { borderTopWidth: 1.5, borderTopColor: GOLD, width: 140, marginBottom: 6 },
  totalRow: { flexDirection: 'row' },
  totalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: NAVY, marginRight: 16 },
  totalValue: { color: GOLD, fontFamily: 'Helvetica-Bold', fontSize: 14, width: 70, textAlign: 'right' },

  // Notes
  sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: GRAY, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 20, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 4 },
  notesBox: { backgroundColor: LIGHT, borderRadius: 4, padding: 10 },
  notesText: { color: GRAY, fontSize: 8.5 },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: NAVY, paddingHorizontal: 40, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { color: '#9ca3af', fontSize: 8 },
  footerBrand: { color: GOLD, fontFamily: 'Helvetica-Bold', fontSize: 9, letterSpacing: 1 },

  // T&C page
  tcPage: { backgroundColor: '#ffffff', fontFamily: 'Helvetica', fontSize: 9, color: NAVY, padding: 40 },
  tcHeaderBar: { backgroundColor: NAVY, paddingHorizontal: 40, paddingVertical: 14, marginHorizontal: -40, marginTop: -40, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tcBrand: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: GOLD, letterSpacing: 2 },
  tcTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: NAVY, textAlign: 'center', marginBottom: 16 },
  tcSection: { marginBottom: 10 },
  tcSectionTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 3 },
  tcBody: { fontSize: 7.5, color: '#374151', lineHeight: 1.5 },
  tcFooter: { marginTop: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between' },
  tcFooterText: { fontSize: 7, color: GRAY },
})

const TC_SECTIONS = [
  {
    title: '1. Scope of Work',
    body: 'All services are limited to the scope described in this signed estimate. Voltura Power Group will not perform additional work beyond the agreed scope without a written and signed change order. Verbal agreements do not constitute authorization to proceed.',
  },
  {
    title: '2. Pricing & Payment',
    body: 'This quote is valid for 30 days from the date of issue. Payment is due in full upon completion of work unless otherwise agreed in writing. Accepted forms: cash, check, Zelle, and credit/debit card. Credit/debit card payments subject to a 3% processing fee. Returned checks subject to a $35 fee.',
  },
  {
    title: '3. Change Orders',
    body: 'Any change to the agreed scope — additions, deletions, or modifications — requires a signed change order with updated pricing before that work proceeds. Voltura Power Group is not liable for delays caused by unsigned or unapproved changes.',
  },
  {
    title: '4. Permits',
    body: 'Where electrical permits are required, Voltura Power Group will obtain them on behalf of the customer. Permit fees are itemized in the estimate if applicable. Customer is responsible for ensuring site access is available for all required inspections.',
  },
  {
    title: '5. Warranty',
    body: 'Voltura Power Group warrants all labor for 12 months from the date of job completion. Equipment and materials are covered by the manufacturer\'s warranty only. The labor warranty is void if the work is altered or repaired by any other party without prior written consent.',
  },
  {
    title: '6. Drywall & Wall Repairs',
    body: 'When electrical work requires opening walls, ceilings, or floors, Voltura Power Group will patch penetrations made by our crew. Exact cosmetic matching of existing textures, paint color, or finish is not guaranteed and may require a separate contractor. Drywall and paint services, when included in the estimate, are subject to these same limitations.',
  },
  {
    title: '7. Site Access & Conditions',
    body: 'Customer must provide safe, unobstructed access to all work areas and panels. If unsafe conditions are discovered (asbestos, mold, structural issues, hazardous materials), Voltura Power Group reserves the right to stop work until conditions are corrected at the customer\'s expense.',
  },
  {
    title: '8. Existing Conditions',
    body: 'Voltura Power Group is not responsible for pre-existing defects, code violations, or hidden conditions discovered during work. If such conditions require additional labor or materials, a change order will be issued before proceeding.',
  },
  {
    title: '9. Late Payment',
    body: 'Invoices unpaid after 30 days are subject to a finance charge of 1.5% per month (18% annually). Customer agrees to pay all reasonable costs of collection, including attorney fees, in the event of non-payment.',
  },
  {
    title: '10. Cancellations',
    body: 'Cancellations with less than 24 hours notice may be subject to a dispatch fee of up to $85. Materials ordered specifically for a project that cannot be returned are non-refundable. A trip charge applies for return visits caused by customer no-shows.',
  },
  {
    title: '11. Limitation of Liability',
    body: 'Voltura Power Group\'s total liability shall not exceed the total amount paid under this contract. We are not liable for indirect, consequential, incidental, punitive, or special damages, including loss of use or income.',
  },
  {
    title: '12. Governing Law & Disputes',
    body: 'Both parties agree to first attempt resolution through good-faith negotiation, then mediation before legal action. This agreement is governed by the laws of the State of Colorado. Venue for any legal proceedings shall be in El Paso County, Colorado.',
  },
]

interface EstimatePDFProps {
  estimateId: string
  customerName: string
  customerPhone?: string | null
  customerAddress?: string | null
  lineItems: LineItem[]
  addons?: Addon[]
  total: number
  notes?: string | null
  createdAt: string
}

export function EstimatePDF({
  estimateId,
  customerName,
  customerPhone,
  customerAddress,
  lineItems,
  addons = [],
  total,
  notes,
  createdAt,
}: EstimatePDFProps) {
  const date = new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const shortId = estimateId.slice(0, 8).toUpperCase()
  const selectedAddons = addons.filter((a) => a.selected)
  const allItems = [...lineItems, ...selectedAddons.map((a) => ({ description: a.name, price: a.price, is_override: false, original_price: a.price }))]

  return (
    <Document>
      {/* Page 1 — Estimate */}
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

        <View style={styles.body}>
          {/* Estimate # and date */}
          <View style={styles.metaRow}>
            <View>
              <Text style={styles.metaLabel}>Estimate</Text>
              <Text style={styles.estimateNumber}>#{shortId}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.metaLabel}>Date Issued</Text>
              <Text style={styles.metaValue}>{date}</Text>
              <Text style={[styles.metaLabel, { marginTop: 8 }]}>Valid For</Text>
              <Text style={styles.metaValue}>30 days</Text>
            </View>
          </View>

          {/* Customer */}
          <View style={styles.customerSection}>
            <Text style={styles.customerLabel}>Prepared For</Text>
            <Text style={styles.customerName}>{customerName}</Text>
            {customerAddress && <Text style={styles.customerInfo}>{customerAddress}</Text>}
            {customerPhone && <Text style={styles.customerInfo}>{customerPhone}</Text>}
          </View>

          {/* Line Items */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Scope of Work</Text>
            <Text style={[styles.tableHeaderText, { width: 70, textAlign: 'right' }]}>Amount</Text>
          </View>
          {allItems.map((item, i) => (
            <View key={i} style={styles.lineItem}>
              <Text style={styles.lineDesc}>{item.description}</Text>
              <Text style={styles.linePrice}>${item.price.toLocaleString()}</Text>
            </View>
          ))}

          {/* Total */}
          <View style={styles.totalSection}>
            <View style={styles.totalDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${total.toLocaleString()}</Text>
            </View>
          </View>

          {/* Notes */}
          {notes && (
            <>
              <Text style={styles.sectionTitle}>Notes</Text>
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>{notes}</Text>
              </View>
            </>
          )}

          {/* T&C reference */}
          <Text style={[styles.notesText, { marginTop: 16, color: GRAY, fontSize: 7.5 }]}>
            By accepting this estimate, you agree to the Terms &amp; Conditions on page 2, including payment terms, warranty, and cancellation policy.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>See page 2 for full Terms &amp; Conditions</Text>
          <Text style={styles.footerBrand}>VOLTURA</Text>
          <Text style={styles.footerText}>Zelle · Cash · Check · Credit Card</Text>
        </View>
      </Page>

      {/* Page 2 — Terms & Conditions */}
      <Page size="LETTER" style={styles.tcPage}>
        <View style={styles.tcHeaderBar}>
          <Text style={styles.tcBrand}>VOLTURA POWER GROUP</Text>
          <Text style={{ color: '#9ca3af', fontSize: 8 }}>Colorado Springs, CO  ·  License #EC.0202116</Text>
        </View>

        <Text style={styles.tcTitle}>Terms &amp; Conditions</Text>

        {TC_SECTIONS.map((s, i) => (
          <View key={i} style={styles.tcSection}>
            <Text style={styles.tcSectionTitle}>{s.title}</Text>
            <Text style={styles.tcBody}>{s.body}</Text>
          </View>
        ))}

        <View style={styles.tcFooter}>
          <Text style={styles.tcFooterText}>Voltura Power Group  ·  volturapower.energy  ·  (719) 440-4528</Text>
          <Text style={styles.tcFooterText}>Last updated: April 2026</Text>
        </View>
      </Page>
    </Document>
  )
}
