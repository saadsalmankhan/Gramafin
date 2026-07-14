import { redirect } from 'next/navigation'

// Merged into /investments (the "Assets & Liabilities" tab) — this route
// stays only to avoid breaking old bookmarks/links.
export const dynamic = 'force-dynamic'

export default function AssetsRedirect() {
  redirect('/investments')
}
