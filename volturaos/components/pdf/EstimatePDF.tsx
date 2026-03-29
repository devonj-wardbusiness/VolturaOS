'use client'

import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer'
import type { LineItem, Addon } from '@/types'

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
  lineTier: { color: '#C9A227', fontSize: 8, width: 40 },
  linePrice: { color: '#C9A227', fontFamily: 'Helvetica-Bold', fontSize: 10, width: 60, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, paddingTop: 8, borderTopWidth: 2, borderTopColor: '#C9A227' },
  totalLabel: { color: '#9ca3af', fontSize: 10, marginRight: 16 },
  totalValue: { color: '#C9A227', fontFamily: 'Helvetica-Bold', fontSize: 14 },
  notes: { color: '#d1d5db', fontSize: 9, marginTop: 8 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { color: '#6b7280', fontSize: 8 },
})

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
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>VOLTURA</Text>
          <Text style={styles.brandSub}>Power Group  |  Colorado Springs, CO  |  volturapower.energy</Text>
        </View>

        <View style={styles.divider} />

        {/* Meta */}
        <View style={styles.row}>
          <View>
            <Text style={styles.label}>ESTIMATE</Text>
            <Text style={[styles.value, { fontSize: 13, fontFamily: 'Helvetica-Bold' }]}>#{shortId}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.label}>DATE</Text>
            <Text style={styles.value}>{date}</Text>
          </View>
        </View>

        {/* Customer */}
        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Customer</Text>
        <Text style={[styles.value, { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 4 }]}>{customerName}</Text>
        {customerPhone && <Text style={styles.label}>{customerPhone}</Text>}
        {customerAddress && <Text style={styles.label}>{customerAddress}</Text>}

        {/* Line Items */}
        <Text style={styles.sectionTitle}>Scope of Work</Text>
        {allItems.map((item, i) => (
          <View key={i} style={styles.lineItem}>
            <Text style={styles.lineDesc}>{item.description}</Text>
            {'tier' in item && item.tier && <Text style={styles.lineTier}>{String(item.tier).toUpperCase()}</Text>}
            <Text style={styles.linePrice}>${item.price.toLocaleString()}</Text>
          </View>
        ))}

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>${total.toLocaleString()}</Text>
        </View>

        {/* Notes */}
        {notes && (
          <>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{notes}</Text>
          </>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Valid for 30 days from issue date</Text>
          <Text style={styles.footerText}>Voltura Power Group  |  (719) 000-0000</Text>
        </View>
      </Page>
    </Document>
  )
}
