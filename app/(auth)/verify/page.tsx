import Link from 'next/link'
import { CheckCircle2, XCircle } from 'lucide-react'
import { consumeVerificationToken } from '@/lib/auth/verification'
import { markEmailVerified } from '@/lib/auth/users'

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  const token = searchParams.token
  const email = token ? await consumeVerificationToken(token) : null

  if (email) {
    await markEmailVerified(email)
  }

  return (
    <div className="w-full max-w-sm text-center">
      <div className="card">
        {email ? (
          <>
            <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-3" />
            <h1 className="text-lg font-semibold text-ink-primary">Email verified</h1>
            <p className="text-sm text-ink-muted mt-1">
              Your account is active. You can log in now.
            </p>
            <Link href="/login?verified=1" className="btn-primary w-full justify-center mt-5">
              Go to login
            </Link>
          </>
        ) : (
          <>
            <XCircle className="w-10 h-10 text-danger mx-auto mb-3" />
            <h1 className="text-lg font-semibold text-ink-primary">Link invalid or expired</h1>
            <p className="text-sm text-ink-muted mt-1">
              This verification link is no longer valid. Please sign up again to get a new one.
            </p>
            <Link href="/signup" className="btn-primary w-full justify-center mt-5">
              Back to sign up
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
