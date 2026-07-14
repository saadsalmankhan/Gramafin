import { redirect } from 'next/navigation'

// Merged into /assets (the "Assets" tab, with sub-tabs for Stocks/Crypto/
// Bonds/Other/Mutual Funds/Cash & Property) — this route stays only to
// avoid breaking old bookmarks/links.
export const dynamic = 'force-dynamic'

export default function InvestmentsRedirect() {
  redirect('/assets')
}
