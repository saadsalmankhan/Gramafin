import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: { signIn: '/login' },
})

export const config = {
  matcher: [
    '/dashboard',
    '/expenses/:path*',
    '/assets/:path*',
    '/budget/:path*',
    '/investments/:path*',
    '/mutual-funds/:path*',
  ],
}
