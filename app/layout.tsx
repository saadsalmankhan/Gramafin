import type { Metadata } from 'next'
import './globals.css'
import { StoreProvider } from '@/lib/store'
import SessionProvider from '@/lib/auth/SessionProvider'

export const metadata: Metadata = {
  title: 'Wealth Manager',
  description: 'Personal finance & wealth management in PKR',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface-0">
        <SessionProvider>
          <StoreProvider>{children}</StoreProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
