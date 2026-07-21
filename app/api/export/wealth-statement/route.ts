import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { renderToBuffer } from '@react-pdf/renderer'
import { authOptions } from '@/lib/auth/options'
import { apiRatelimit } from '@/lib/ratelimit'
import { buildWealthStatementData } from '@/lib/wealthStatement'
import WealthStatementDocument from '@/lib/pdf/WealthStatementDocument'
import { sendWealthStatementEmail } from '@/lib/email'
import { today } from '@/lib/utils'

const MONTH_RE = /^\d{4}-\d{2}$/

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { success } = await apiRatelimit.limit(`api:${session.user.id}`)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  const deliver = searchParams.get('deliver') === 'email' ? 'email' : 'download'
  if (month && !MONTH_RE.test(month)) {
    return NextResponse.json({ error: 'Invalid month, expected YYYY-MM' }, { status: 400 })
  }

  const data = await buildWealthStatementData(session.user.id, session.user.name || 'Gramafin user', month || today().slice(0, 7))
  const pdfBuffer = await renderToBuffer(WealthStatementDocument({ data }))
  const filename = `Gramafin Wealth Statement - ${data.monthLabel}.pdf`

  if (deliver === 'email') {
    if (!session.user.email) {
      return NextResponse.json({ error: 'No email address on this account' }, { status: 400 })
    }
    await sendWealthStatementEmail({
      to: session.user.email,
      name: session.user.name || 'there',
      monthLabel: data.monthLabel,
      pdfBuffer,
      filename,
    })
    return NextResponse.json({ ok: true, sentTo: session.user.email })
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
