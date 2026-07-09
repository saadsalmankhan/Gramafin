import { redirect } from 'next/navigation'

// The calculator moved onto the homepage itself — redirect rather than 404
// for anyone who already has this URL. Absolute URL because this route is
// only ever reached via app.gramafin.com (see middleware.ts), but the
// homepage content only renders on the marketing host.
//
// Must stay dynamic: a statically-optimized page can only redirect() via
// client-side JS hydration (no real Location header), which curl, crawlers,
// and non-JS clients won't follow — confirmed missing during testing.
export const dynamic = 'force-dynamic'

export default function CompoundInterestCalculatorRedirect() {
  redirect('https://gramafin.com/#calculator')
}
