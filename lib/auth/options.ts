import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getUserByEmail, verifyPassword } from '@/lib/auth/users'
import { authRatelimit } from '@/lib/ratelimit'

// Login happens on app.gramafin.com, but gramafin.com (marketing) needs to
// read the same session to redirect an already-logged-in visitor straight to
// their dashboard instead of showing the pitch again. Without an explicit
// Domain, the cookie defaults to the exact host that set it and never
// reaches gramafin.com/www.gramafin.com even though they share a registrable
// domain — this widens it to the whole *.gramafin.com family. Only applied
// in production: a Domain attribute doesn't work sensibly against localhost.
const useSecureCookies = process.env.NODE_ENV === 'production'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  cookies: {
    sessionToken: {
      name: useSecureCookies ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        ...(useSecureCookies ? { domain: '.gramafin.com' } : {}),
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
