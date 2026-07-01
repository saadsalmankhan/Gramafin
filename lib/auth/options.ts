import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getUserByEmail, verifyPassword } from '@/lib/auth/users'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

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
