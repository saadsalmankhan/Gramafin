import type { ReactNode } from 'react'
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { PDF_COLORS, DISCLOSURE_TEXT } from './theme'
import { LOGO_MARK_BASE64 } from './logoBase64'

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: PDF_COLORS.brand600,
    paddingBottom: 12,
    marginBottom: 16,
  },
  logo: { width: 28, height: 26 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandName: { fontSize: 14, fontWeight: 700, color: PDF_COLORS.inkPrimary },
  docTitle: { fontSize: 16, fontWeight: 700, color: PDF_COLORS.inkPrimary, textAlign: 'right' },
  docSubtitle: { fontSize: 9, color: PDF_COLORS.inkMuted, textAlign: 'right', marginTop: 2 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.border,
    paddingTop: 8,
  },
  disclosure: { fontSize: 6.5, color: PDF_COLORS.inkMuted, lineHeight: 1.4 },
  pageNumber: { fontSize: 7, color: PDF_COLORS.inkMuted, marginTop: 4, textAlign: 'center' },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: PDF_COLORS.inkPrimary,
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
})

export function PdfHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.logoRow}>
        <Image src={LOGO_MARK_BASE64} style={styles.logo} />
        <Text style={styles.brandName}>Gramafin</Text>
      </View>
      <View>
        <Text style={styles.docTitle}>{title}</Text>
        <Text style={styles.docSubtitle}>{subtitle}</Text>
      </View>
    </View>
  )
}

export function PdfFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.disclosure}>{DISCLOSURE_TEXT}</Text>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  )
}

export function PdfSectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>
}

const tableStyles = StyleSheet.create({
  table: { borderWidth: 1, borderColor: PDF_COLORS.border, borderRadius: 2 },
  headerRow: { flexDirection: 'row', backgroundColor: PDF_COLORS.surface0, borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border },
  lastRow: { flexDirection: 'row' },
  headerCell: { fontSize: 7.5, fontWeight: 700, color: PDF_COLORS.inkMuted, padding: 5, textTransform: 'uppercase' },
  cell: { fontSize: 8.5, color: PDF_COLORS.inkPrimary, padding: 5 },
  cellMuted: { fontSize: 8.5, color: PDF_COLORS.inkMuted, padding: 5 },
})

export interface PdfColumn<T> {
  key: string
  header: string
  width: string | number
  align?: 'left' | 'right' | 'center'
  render: (row: T) => string
  muted?: boolean
}

export function PdfTable<T>({ columns, rows }: { columns: PdfColumn<T>[]; rows: T[] }) {
  return (
    <View style={tableStyles.table}>
      <View style={tableStyles.headerRow}>
        {columns.map(col => (
          <Text key={col.key} style={[tableStyles.headerCell, { width: col.width, textAlign: col.align ?? 'left' }]}>
            {col.header}
          </Text>
        ))}
      </View>
      {rows.map((row, i) => (
        <View key={i} style={i === rows.length - 1 ? tableStyles.lastRow : tableStyles.row}>
          {columns.map(col => (
            <Text
              key={col.key}
              style={[col.muted ? tableStyles.cellMuted : tableStyles.cell, { width: col.width, textAlign: col.align ?? 'left' }]}
            >
              {col.render(row)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  )
}

const summaryStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  card: { flexGrow: 1, flexBasis: '30%', backgroundColor: PDF_COLORS.surface0, borderRadius: 3, padding: 8 },
  label: { fontSize: 7, color: PDF_COLORS.inkMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 },
  value: { fontSize: 12, fontWeight: 700, color: PDF_COLORS.inkPrimary },
})

export function PdfSummaryGrid({ items }: { items: { label: string; value: string; tone?: 'positive' | 'negative' }[] }) {
  return (
    <View style={summaryStyles.grid}>
      {items.map(item => (
        <View key={item.label} style={summaryStyles.card}>
          <Text style={summaryStyles.label}>{item.label}</Text>
          <Text
            style={[
              summaryStyles.value,
              item.tone === 'positive' ? { color: PDF_COLORS.brand600 } : item.tone === 'negative' ? { color: PDF_COLORS.danger } : {},
            ]}
          >
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  )
}
