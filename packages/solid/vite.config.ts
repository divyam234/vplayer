import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

const ROOT = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ command }) => ({
  plugins: [solid({ solid: { generate: 'universal' } })],
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
            external: [
              'solid-js',
              'solid-js/web',
              '@tanstack/store',
              '@ark-ui/solid',
              '@iconify/solid',
              '@vplayer/core',
              '@vplayer/framework',
              'clsx',
              'hls.js',
              'dashjs',
            ],
          },
        }
      : undefined,
}))
