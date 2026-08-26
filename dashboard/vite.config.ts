import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined
          // recharts (~400KB) — only Dashboard.tsx uses it; isolate so other pages don't pay the cost
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-vendor')) {
            return 'charts'
          }
          // React core — needed by every page, but isolate for cacheability across deploys
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/react-router-dom') ||
            id.includes('node_modules/@remix-run/router') ||
            id.includes('node_modules/history')
          ) {
            return 'react-vendor'
          }
          // lucide-react — icon set, used in many pages
          if (id.includes('node_modules/lucide-react')) {
            return 'icons'
          }
          return undefined
        }
      }
    }
  }
})
