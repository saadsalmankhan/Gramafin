// Cloudflare Turnstile server-side verification. Inert until
// TURNSTILE_SECRET_KEY is set (see .env.local.example) — same pattern as
// the Sentry SDK elsewhere in this app: safe to deploy before the real
// key exists, and every call site just skips the check rather than
// breaking signup/login/password-reset in the meantime.
export async function verifyTurnstileToken(token: string | undefined, remoteIp: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY
  if (!secretKey) return true
  if (!token) return false

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: secretKey, response: token, remoteip: remoteIp }),
    })
    const data = await res.json()
    return data.success === true
  } catch (err) {
    console.error('Turnstile verification request failed:', err)
    return false
  }
}
