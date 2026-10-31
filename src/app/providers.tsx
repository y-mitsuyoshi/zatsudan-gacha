'use client'

import { ThemeProvider } from 'next-themes'
import { AnalyticsProvider } from '@/components/AnalyticsProvider'
import { ConsentProvider } from '@/components/ConsentProvider'
import { ConsentBanner } from '@/components/ConsentBanner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <ConsentProvider>
        <AnalyticsProvider>
          {children}
        </AnalyticsProvider>
        <ConsentBanner />
      </ConsentProvider>
    </ThemeProvider>
  )
}
