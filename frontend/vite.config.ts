import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // GameRoute chunk bundles three + r3f (~1MB); initial route bundle stays ~500kB after lazy load.
    chunkSizeWarningLimit: 1200,
  },
  resolve: {
    alias: {
      '@map-config': path.resolve(__dirname, '../backend/src/map-config.ts'),
    },
  },
})
