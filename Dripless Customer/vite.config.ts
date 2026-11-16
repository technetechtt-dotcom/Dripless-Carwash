import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['customer-icon.svg'],
      manifest: {
        name: 'Dripless Customer',
        short_name: 'Dripless',
        description: 'Customer app for booking rides and services on Dripless.',
        theme_color: '#0f766e',
        background_color: '#f4f6fb',
        display: 'standalone',
        start_url: '/home',
        scope: '/',
        icons: [
          {
            src: 'customer-pwa-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'customer-pwa-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        navigateFallbackDenylist: [/^\/api\//]
      }
    })
  ],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '../shared-contract/src')
    }
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/utils/currency.ts'],
      thresholds: { lines: 90, functions: 75, statements: 90, branches: 30 }
    }
  },
  // Only crawl app sources — Capacitor synced android/ios bundles can confuse dep scan.
  optimizeDeps: {
    entries: ['index.html', 'src/**/*.{js,jsx,ts,tsx}']
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      allow: [resolve(__dirname, '..')]
    },
    watch: {
      ignored: ['**/android/**', '**/ios/**', '**/dist/**']
    }
  }
})
