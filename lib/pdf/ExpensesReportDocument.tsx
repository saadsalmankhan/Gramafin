import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { PDF_COLORS, formatPKR } from './theme'
import { PdfHeader, PdfFooter, PdfTable, PdfColumn } from './components'
import type { Expense } from '@/types'

const styles = StyleSheet.create({
  page: { padding: 40, paddingBottom: 70, fontFamily: 'Helvetica', fontSize: 9 },
  empty: { fontSize: 8, color: PDF_COLORS.inkMuted, fontStyle: 'italic', marginVertical: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, paddingRight: 5 },
  totalLabel: { fontSize: 8.5, color: PDF_COLORS.inkMuted, marginRight: 8 },
  totalValue: { fontSize: 10, fontWeight: 700, color: PDF_COLORS.inkPrimary },
})

export interface ExpensesReportData {
  userName: string
  filterSummary: string
  generatedAt: string
  expenses: Expense[]
}

export default function ExpensesReportDocument({ data }: { data: ExpensesReportData }) {
  const total = data.expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <Document title="Gramafin Expenses Report" author="Gramafin">
      <Page size="A4" style={styles.page}>
        <PdfHeader title="Expenses Report" subtitle={`${data.filterSummary} · ${data.userName} · Generated ${data.generatedAt}`} />

        {data.expenses.length === 0 ? (
          <Text style={styles.empty}>No expenses match this view.</Text>
        ) : (
          <>
            <PdfTable
              columns={
                [
                  { key: 'description', header: 'Description', width: '32%', render: e => e.description },
                  { key: 'category', header: 'Category', width: '18%', render: e => e.category, muted: true },
                  { key: 'account', header: 'Account', width: '20%', render: e => e.account || 'Cash', muted: true },
                  { key: 'date', header: 'Date', width: '15%', render: e => e.date, muted: true },
                  { key: 'amount', header: 'Amount', width: '15%', align: 'right', render: e => formatPKR(e.amount) },
                ] as PdfColumn<Expense>[]
              }
              rows={data.expenses}
            />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total · {data.expenses.length} transaction{data.expenses.length === 1 ? '' : 's'}</Text>
              <Text style={styles.totalValue}>{formatPKR(total)}</Text>
            </View>
          </>
        )}

        <PdfFooter />
      </Page>
    </Document>
  )
}
