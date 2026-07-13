import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getUserByEmail, verifyPassword } from '@/lib/auth/users'
import { authRatelimit } from '@/lib/ratelimit'

// `next start` sets NODE_ENV=production regardless of hostname — including
// on localhost — so gating cookie behavior on NODE_ENV was wrong on two
// counts: (1) the `__Secure-` name prefix and `secure: true` flag are
// browser-ENFORCED to require an actual HTTPS origin (localhost's "secure
// context" exception for other web APIs doesn't extend to this), so the
// cookie was silently rejected outright over plain http://localhost; (2) the
// `.gramafin.com` Domain attribute doesn't apply to *any* other host either.
// Both broke every local `npm run start` test — the session cookie was never
// actually being stored, so every authenticated fetch 401'd even though
// login "succeeded" (nothing here gates page rendering; only the
// authenticated API calls fail). `VERCEL` is truthy on any Vercel-hosted
// environment (production or preview, always HTTPS) — the correct signal for
// secure cookies. `VERCEL_ENV === 'production'` narrows further to just the
// deployment tied to the gramafin.com/app.gramafin.com domains, for the
// Domain attribute specifically.
const isOnVercel = Boolean(process.env.VERCEL)
const isProductionDomain = process.env.VERCEL_ENV === 'production'

// Login happens on app.gramafin.com, but gramafin.com (marketing) needs to
// read the same session to redirect an already-logged-in visitor straight to
// their dashboard instead of showing the pitch again. Without an explicit
// Domain, the cookie defaults to the exact host that set it and never
// reaches gramafin.com/www.gramafin.com even though they share a registrable
// domain — this widens it to the whole *.gramafin.com family.
export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  cookies: {
    sessionToken: {
      name: isOnVercel ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isOnVercel,
        ...(isProductionDomain ? { domain: '.gramafin.com' } : {}),
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null

        // Rate-limit by IP and by targeted email so credential-stuffing can't
        // be spread across many accounts from one IP, or many IPs at one account.
        const ip = req.headers?.['x-forwarded-for']?.toString().split(',')[0].trim() ?? 'unknown'
        const [{ success: ipOk }, { success: emailOk }] = await Promise.all([
          authRatelimit.limit(`login-ip:${ip}`),
          authRatelimit.limit(`login-email:${credentials.email.trim().toLowerCase()}`),
        ])
        if (!ipOk || !emailOk) {
          throw new Error('Too many login attempts. Please try again in a minute.')
        }

        const user = await getUserByEmail(credentials.email)
        if (!user) return null

        const valid = await verifyPassword(user, credentials.password)
        if (!valid) return null

        if (!user.emailVerified) {
          throw new Error('Please verify your email before logging in.')
        }

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string
      return session
    },
  },
}
