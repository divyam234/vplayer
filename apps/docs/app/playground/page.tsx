import type { Metadata } from 'next'

import { PlaygroundClient } from './playground-client'

export const metadata: Metadata = {
  title: 'Playground',
  description:
    'Configure VPlayer live with custom sources, thumbnails, captions, mini-player settings, and theme tokens.',
}

export default function PlaygroundPage() {
  return <PlaygroundClient />
}
