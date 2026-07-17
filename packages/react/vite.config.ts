/// <reference types="vitest" />
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig, esmExternalRequirePlugin } from 'vite'

const ROOT = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    esmExternalRequirePlugin({
      external: [/^react(?:\/.*)?$/, /^react-dom(?:\/.*)?$/],
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: resolve(ROOT, 'src/__tests__/setup.ts'),
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/__tests__/**'],
    },
  },
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
