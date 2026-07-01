import type { Metadata } from 'next'
import './globals.css'
import { StoreProvider } from '@/lib/store'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'Wealth Manager',
  description: 'Personal finance & wealth management in PKR',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface-0">
        <StoreProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-60 p-8 min-h-screen">
              <div className="max-w-4xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </StoreProvider>
      </body>
    </html>
  )
}
