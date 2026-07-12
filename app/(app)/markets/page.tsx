import { redirect } from 'next/navigation'

// Markets moved into the Investments page as a tab (see
// app/(app)/investments/page.tsx) — redirect rather than 404 for anyone who
// already has this URL bookmarked or linked. Must stay dynamic so this
// emits a real HTTP redirect instead of only working via client-side JS
// hydration (same reasoning as compound-interest-calculator's redirect).
export const dynamic = 'force-dynamic'

export default function MarketsRedirect() {
  redirect('/investments')
}
