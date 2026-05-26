import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const ROOT = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ command }) => ({
  plugins: [react()],
  build:
    command === 'build'
      ? {
          cssCodeSplit: false,
          lib: {
            entry: resolve(ROOT, 'src/index.ts'),
            formats: ['es'],
            fileName: 'index',
          },
          rollupOptions: {
            external: ['react', 'react-dom', 'react/jsx-runtime', 'hls.js', 'dashjs'],
          },
        }
      : undefined,
}))
