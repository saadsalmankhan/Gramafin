import Link from 'next/link'
import Image from 'next/image'
import { getServerSession } from 'next-auth/next'
import { ArrowLeft } from 'lucide-react'
import { authOptions } from '@/lib/auth/options'

// Help Center is linked both from the public marketing site (anonymous
// visitors) and from inside the logged-in app's sidebar — without this
// check, an already-authenticated user landed on what looked like a signed-
// out marketing page (Log in / Sign up buttons, no way back to the app),
// which read as "visiting Help Center logged me out" even though the
// session was untouched the whole time.
export default async function PublicHeader() {
  const session = await getServerSession(authOptions)

  return (
    <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/90 backdrop-blur">
      <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href={session ? '/dashboard' : '/'}>
          <Image src="/logo-full.png" alt="Gramafin" width={505} height={126} className="h-6 w-auto" priority />
        </Link>
        {session ? (
          <Link
            href="/dashboard"
            className="h-9 px-4 rounded-full bg-ink-primary text-white text-sm font-medium flex items-center gap-1.5 hover:bg-black transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
        ) : (
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-ink-secondary hover:text-ink-primary transition-colors">
              Log in
            </Link>
            <Link
              href="/signup"
              className="h-9 px-4 rounded-full bg-ink-primary text-white text-sm font-medium flex items-center hover:bg-black transition-colors"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
