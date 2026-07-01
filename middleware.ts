import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: { signIn: '/login' },
})

export const config = {
  matcher: [
    '/((?!api/auth|login|signup|verify|_next/static|_next/image|favicon.ico).*)',
  ],
}
