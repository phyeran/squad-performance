import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { StackProvider } from '@teamsparta/stack-core'
import '@teamsparta/stack-core/style.css'
import Link from 'next/link'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Squad Performance',
  description: '그로스 스쿼드 성과 관리 대시보드',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={geist.variable}>
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
        <StackProvider theme="sccLight">
          <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Link href="/" style={{ fontWeight: 600, color: '#111827', textDecoration: 'none', fontSize: 15 }}>
                Squad Performance
              </Link>
              <nav style={{ display: 'flex', gap: 24, fontSize: 14, color: '#6b7280' }}>
                <Link href="/north-star" style={{ color: 'inherit', textDecoration: 'none' }}>KPI 관리</Link>
              </nav>
            </div>
          </header>
          <main style={{ flex: 1, maxWidth: 1152, margin: '0 auto', width: '100%', padding: '32px 24px' }}>
            {children}
          </main>
        </StackProvider>
      </body>
    </html>
  )
}
