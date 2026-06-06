import { RootProvider } from 'fumadocs-ui/provider/next'
import type { ReactNode } from 'react'

import './global.css'

export const metadata = {
  metadataBase: new URL('https://vplayer.dev'),
  title: {
    default: 'VPlayer Docs',
    template: '%s | VPlayer',
  },
  description: 'Production-ready documentation for the VPlayer React video player.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  )
}
