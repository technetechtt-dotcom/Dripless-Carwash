import { defineConfig } from 'vite'
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
      includeAssets: ['driver-icon.svg'],
      manifest: {
        name: 'Dripless Driver',
        short_name: 'Dripless Driver',
        description: 'Driver app for managing jobs and earnings on Dripless.',
        theme_color: '#0f766e',
        background_color: '#f4f6fb',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'driver-pwa-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'driver-pwa-512.svg',
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
  // Only crawl app sources — Capacitor synced android/ios bundles can confuse dep scan.
  optimizeDeps: {
    entries: ['index.html', 'src/**/*.{js,jsx,ts,tsx}']
  },
  server: {
    port: 5174,
    strictPort: true,
    fs: {
      allow: [resolve(__dirname, '..')]
    },
    watch: {
      ignored: ['**/android/**', '**/ios/**', '**/dist/**']
    }
  }
})
