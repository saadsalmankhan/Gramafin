import { NextResponse } from 'next/server'
import { stockLogo, fundLogo, bankLogo } from '@/lib/entityLogo'

// Stateless — {initials, color} are pure functions of the input string, not
// a lookup against any stored or fetched data, so this is safe to call
// unauthenticated and needs no caching layer. See lib/entityLogo.ts for why
// this generates a badge instead of fetching a real brand logo image.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const value = searchParams.get('value')

  if (!value) {
    return NextResponse.json({ error: 'Missing value' }, { status: 400 })
  }

  switch (type) {
    case 'stock':
      return NextResponse.json(stockLogo(value))
    case 'fund':
      return NextResponse.json(fundLogo(value))
    case 'bank':
      return NextResponse.json(bankLogo(value))
    default:
      return NextResponse.json({ error: 'type must be stock, fund, or bank' }, { status: 400 })
  }
}
