import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { PDF_COLORS, formatPKR } from './theme'
import { PdfHeader, PdfFooter, PdfSectionTitle, PdfTable, PdfSummaryGrid, PdfColumn } from './components'
import { PdfDonutChart } from './PdfDonutChart'
import type { NetWorthBreakdown } from '@/lib/networth'
import type { BankAccount, Asset, Investment, MutualFund, Income, ExpenseCategory } from '@/types'
import { bankAccountLabel, CATEGORY_COLORS, INVESTMENT_TYPE_COLORS } from '@/types'

// Mutual funds are tracked in their own table (not the InvestmentType union),
// so the portfolio-allocation chart needs one more color beyond
// INVESTMENT_TYPE_COLORS's four — picked to not repeat any of them.
const MUTUAL_FUNDS_SLICE_COLOR = '#1baf7a'

const styles = StyleSheet.create({
  page: { padding: 40, paddingBottom: 70, fontFamily: 'Helvetica', fontSize: 9 },
  empty: { fontSize: 8, color: PDF_COLORS.inkMuted, fontStyle: 'italic', marginVertical: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6, paddingRight: 5 },
  totalLabel: { fontSize: 8.5, color: PDF_COLORS.inkMuted, marginRight: 8 },
  totalValue: { fontSize: 9.5, fontWeight: 700, color: PDF_COLORS.inkPrimary },
})

export interface WealthStatementData {
  userName: string
  monthLabel: string
  generatedAt: string
  netWorth: NetWorthBreakdown
  bankAccounts: BankAccount[]
  assets: Asset[]
  investments: Investment[]
  mutualFunds: MutualFund[]
  monthExpenses: { category: ExpenseCategory; amount: number }[]
  monthExpenseTotal: number
  monthIncome: Income[]
  budgets: { category: string; limit: number; spent: number }[]
}

function fundValue(f: MutualFund): number {
  const nav = f.navOverride ?? f.currentNav
  return f.unitsHeld * nav
}

export default function WealthStatementDocument({ data }: { data: WealthStatementData }) {
  const nonCreditAccounts = data.bankAccounts.filter(b => b.type !== 'Credit Card')
  const creditCards = data.bankAccounts.filter(b => b.type === 'Credit Card')
  const liabilities = data.assets.filter(a => a.category === 'Liability')
  const nonLiabilityAssets = data.assets.filter(a => a.category !== 'Liability')
  const monthIncomeTotal = data.monthIncome.reduce((s, i) => s + i.amount, 0)

  const investmentsByType = data.investments.reduce<Record<string, number>>((acc, i) => {
    acc[i.type] = (acc[i.type] ?? 0) + i.currentValue
    return acc
  }, {})
  const mutualFundsTotal = data.mutualFunds.reduce((s, f) => s + fundValue(f), 0)
  const portfolioAllocation = [
    ...Object.entries(investmentsByType).map(([type, value]) => ({
      label: type,
      value,
      color: INVESTMENT_TYPE_COLORS[type as keyof typeof INVESTMENT_TYPE_COLORS] ?? PDF_COLORS.inkMuted,
    })),
    ...(mutualFundsTotal > 0 ? [{ label: 'Mutual Funds', value: mutualFundsTotal, color: MUTUAL_FUNDS_SLICE_COLOR }] : []),
  ]

  const expensesByCategory = data.monthExpenses.map(e => ({
    label: e.category,
    value: e.amount,
    color: CATEGORY_COLORS[e.category] ?? PDF_COLORS.inkMuted,
  }))

  return (
    <Document title={`Gramafin Wealth Statement — ${data.monthLabel}`} author="Gramafin">
      <Page size="A4" style={styles.page}>
        <PdfHeader title="Wealth Statement" subtitle={`${data.monthLabel} · ${data.userName} · Generated ${data.generatedAt}`} />

        <PdfSectionTitle>Net worth summary</PdfSectionTitle>
        <PdfSummaryGrid
          items={[
            { label: 'Net worth', value: formatPKR(data.netWorth.netWorth), tone: data.netWorth.netWorth >= 0 ? 'positive' : 'negative' },
            { label: 'Bank accounts', value: formatPKR(data.netWorth.bankAccounts) },
            { label: 'Investments', value: formatPKR(data.netWorth.investments) },
            { label: 'Mutual funds', value: formatPKR(data.netWorth.mutualFunds) },
            { label: 'Other assets', value: formatPKR(data.netWorth.cashAndAssets) },
            { label: 'Liabilities', value: formatPKR(data.netWorth.liabilities), tone: 'negative' },
          ]}
        />

        {portfolioAllocation.some(d => d.value > 0) && (
          <>
            <PdfSectionTitle>Portfolio allocation</PdfSectionTitle>
            <PdfDonutChart
              data={portfolioAllocation}
              centerLabel="Total"
              centerValue={formatPKR(data.netWorth.investments + data.netWorth.mutualFunds)}
            />
          </>
        )}

        <PdfSectionTitle>Bank accounts</PdfSectionTitle>
        {nonCreditAccounts.length === 0 ? (
          <Text style={styles.empty}>No bank accounts on file.</Text>
        ) : (
          <PdfTable
            columns={
              [
                { key: 'name', header: 'Account', width: '40%', render: b => bankAccountLabel(b) },
                { key: 'bank', header: 'Bank', width: '30%', render: b => b.bank, muted: true },
                { key: 'type', header: 'Type', width: '15%', render: b => b.type, muted: true },
                { key: 'balance', header: 'Balance', width: '15%', align: 'right', render: b => formatPKR(b.startingBalance) },
              ] as PdfColumn<BankAccount>[]
            }
            rows={nonCreditAccounts}
          />
        )}

        <PdfSectionTitle>Credit cards</PdfSectionTitle>
        {creditCards.length === 0 ? (
          <Text style={styles.empty}>No credit cards on file.</Text>
        ) : (
          <PdfTable
            columns={
              [
                { key: 'name', header: 'Card', width: '35%', render: b => bankAccountLabel(b) },
                { key: 'bank', header: 'Bank', width: '25%', render: b => b.bank, muted: true },
                { key: 'limit', header: 'Limit', width: '20%', align: 'right', render: b => (b.creditLimit ? formatPKR(b.creditLimit) : '—'), muted: true },
                { key: 'balance', header: 'Balance', width: '20%', align: 'right', render: b => formatPKR(b.startingBalance) },
              ] as PdfColumn<BankAccount>[]
            }
            rows={creditCards}
          />
        )}

        <PdfSectionTitle>Investments</PdfSectionTitle>
        {data.investments.length === 0 ? (
          <Text style={styles.empty}>No investments on file.</Text>
        ) : (
          <PdfTable
            columns={
              [
                { key: 'name', header: 'Name', width: '30%', render: i => i.name },
                { key: 'type', header: 'Type', width: '15%', render: i => i.type, muted: true },
                { key: 'invested', header: 'Invested', width: '18%', align: 'right', render: i => formatPKR(i.amountInvested), muted: true },
                { key: 'current', header: 'Current value', width: '19%', align: 'right', render: i => formatPKR(i.currentValue) },
                {
                  key: 'gain',
                  header: 'Gain/Loss',
                  width: '18%',
                  align: 'right',
                  render: i => {
                    const g = i.currentValue - i.amountInvested
                    // Plain ASCII hyphen, not the Unicode minus sign (U+2212) —
                    // Helvetica's standard PDF encoding (WinAnsi) has no glyph
                    // for U+2212 and silently drops it, so a loss rendered with
                    // no sign at all instead of a dash.
                    return `${g >= 0 ? '+' : '-'}${formatPKR(Math.abs(g))}`
                  },
                },
              ] as PdfColumn<Investment>[]
            }
            rows={data.investments}
          />
        )}

        <PdfSectionTitle>Mutual funds</PdfSectionTitle>
        {data.mutualFunds.length === 0 ? (
          <Text style={styles.empty}>No mutual funds on file.</Text>
        ) : (
          <PdfTable
            columns={
              [
                { key: 'name', header: 'Fund', width: '34%', render: f => f.name },
                { key: 'type', header: 'Type', width: '18%', render: f => f.fundType, muted: true },
                { key: 'units', header: 'Units', width: '16%', align: 'right', render: f => f.unitsHeld.toLocaleString('en-US'), muted: true },
                { key: 'nav', header: 'NAV', width: '14%', align: 'right', render: f => formatPKR(f.navOverride ?? f.currentNav), muted: true },
                { key: 'value', header: 'Value', width: '18%', align: 'right', render: f => formatPKR(fundValue(f)) },
              ] as PdfColumn<MutualFund>[]
            }
            rows={data.mutualFunds}
          />
        )}

        <PdfSectionTitle>Other assets &amp; liabilities</PdfSectionTitle>
        {nonLiabilityAssets.length === 0 && liabilities.length === 0 ? (
          <Text style={styles.empty}>No other assets or liabilities on file.</Text>
        ) : (
          <PdfTable
            columns={
              [
                { key: 'name', header: 'Name', width: '45%', render: a => a.name },
                { key: 'category', header: 'Category', width: '30%', render: a => a.category, muted: true },
                { key: 'value', header: 'Value', width: '25%', align: 'right', render: a => formatPKR(a.value) },
              ] as PdfColumn<Asset>[]
            }
            rows={[...nonLiabilityAssets, ...liabilities]}
          />
        )}

        <PdfFooter />
      </Page>

      <Page size="A4" style={styles.page}>
        <PdfHeader title="Wealth Statement" subtitle={`${data.monthLabel} · ${data.userName} · Generated ${data.generatedAt}`} />

        <PdfSectionTitle>{data.monthLabel} spending by category</PdfSectionTitle>
        {data.monthExpenses.length === 0 ? (
          <Text style={styles.empty}>No expenses logged this month.</Text>
        ) : (
          <>
            <PdfDonutChart data={expensesByCategory} centerLabel="Spent" centerValue={formatPKR(data.monthExpenseTotal)} />
            <PdfTable
              columns={
                [
                  { key: 'category', header: 'Category', width: '70%', render: e => e.category },
                  { key: 'amount', header: 'Spent', width: '30%', align: 'right', render: e => formatPKR(e.amount) },
                ] as PdfColumn<{ category: ExpenseCategory; amount: number }>[]
              }
              rows={data.monthExpenses}
            />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total spent</Text>
              <Text style={styles.totalValue}>{formatPKR(data.monthExpenseTotal)}</Text>
            </View>
          </>
        )}

        <PdfSectionTitle>{data.monthLabel} budgets</PdfSectionTitle>
        {data.budgets.length === 0 ? (
          <Text style={styles.empty}>No budgets set.</Text>
        ) : (
          <PdfTable
            columns={
              [
                { key: 'category', header: 'Category', width: '34%', render: b => b.category },
                { key: 'limit', header: 'Budget', width: '22%', align: 'right', render: b => formatPKR(b.limit), muted: true },
                { key: 'spent', header: 'Spent', width: '22%', align: 'right', render: b => formatPKR(b.spent) },
                {
                  key: 'status',
                  header: 'Status',
                  width: '22%',
                  align: 'right',
                  render: b => (b.spent > b.limit ? 'Over budget' : `${Math.round((b.spent / (b.limit || 1)) * 100)}% used`),
                },
              ] as PdfColumn<{ category: string; limit: number; spent: number }>[]
            }
            rows={data.budgets}
          />
        )}

        <PdfSectionTitle>{data.monthLabel} income</PdfSectionTitle>
        {data.monthIncome.length === 0 ? (
          <Text style={styles.empty}>No income logged this month.</Text>
        ) : (
          <>
            <PdfTable
              columns={
                [
                  { key: 'source', header: 'Source', width: '30%', render: i => i.source },
                  { key: 'category', header: 'Category', width: '22%', render: i => i.category, muted: true },
                  { key: 'account', header: 'Account', width: '23%', render: i => i.account, muted: true },
                  { key: 'date', header: 'Date', width: '10%', render: i => i.date, muted: true },
                  { key: 'amount', header: 'Amount', width: '15%', align: 'right', render: i => formatPKR(i.amount) },
                ] as PdfColumn<Income>[]
              }
              rows={data.monthIncome}
            />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total income</Text>
              <Text style={styles.totalValue}>{formatPKR(monthIncomeTotal)}</Text>
            </View>
          </>
        )}

        <PdfFooter />
      </Page>
    </Document>
  )
}
