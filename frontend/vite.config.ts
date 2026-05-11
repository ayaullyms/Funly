import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    nodePolyfills({
      include: ['buffer', 'process'],
      globals: { Buffer: true, global: true, process: true },
    }),
    react(),
  ],
  define: {
    global: 'globalThis', 
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
})