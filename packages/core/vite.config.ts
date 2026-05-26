import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'

const ROOT = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  build: {
    cssCodeSplit: false,
    lib: {
      entry: resolve(ROOT, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['@tanstack/store'],
    },
  },
})
