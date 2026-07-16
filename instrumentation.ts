import * as Sentry from '@sentry/nextjs'

// Server + edge runtime init. Inert until NEXT_PUBLIC_SENTRY_DSN is set —
// same "safe to deploy before the account exists" pattern as other optional
// integrations in this app (see BLOB_READ_WRITE_TOKEN).
export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      enabled: !!dsn,
      tracesSampleRate: 0.1,
    })
  }
}

export const onRequestError = Sentry.captureRequestError
