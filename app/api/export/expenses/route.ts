import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { renderToBuffer } from '@react-pdf/renderer'
import { authOptions } from '@/lib/auth/options'
import { apiRatelimit } from '@/lib/ratelimit'
import ExpensesReportDocument from '@/lib/pdf/ExpensesReportDocument'
import { isFiniteNumber, isNonEmptyString } from '@/lib/validate'
import type { Expense } from '@/types'

// The client already holds the exact filtered list it's looking at (see
// app/(app)/expenses/page.tsx) — posting that straight through avoids
// re-implementing the same category/month/account/search filter logic
// server-side, which could drift from what the user actually sees.
function isValidExpense(e: unknown): e is Expense {
  if (!e || typeof e !== 'object') return false
  const r = e as Record<string, unknown>
  return isNonEmptyString(r.id) && isNonEmptyString(r.description) && isFiniteNumber(r.amount) && isNonEmptyString(r.category) && isNonEmptyString(r.date)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { success } = await apiRatelimit.limit(`api:${session.user.id}`)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const expenses = Array.isArray(body?.expenses) ? body.expenses.filter(isValidExpense) : null
  const filterSummary = typeof body?.filterSummary === 'string' && body.filterSummary.trim() ? body.filterSummary.trim() : 'All expenses'
  if (!expenses) {
    return NextResponse.json({ error: 'Invalid expenses list' }, { status: 400 })
  }

  const generatedAt = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const pdfBuffer = await renderToBuffer(
    ExpensesReportDocument({
      data: { userName: session.user.name || 'Gramafin user', filterSummary, generatedAt, expenses },
    })
  )

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Gramafin Expenses - ${filterSummary.replace(/[^\w\s-]/g, '')}.pdf"`,
    },
  })
}
