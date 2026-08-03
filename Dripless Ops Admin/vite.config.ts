import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['ops-icon.svg'],
      manifest: {
        name: 'Dripless Ops Admin',
        short_name: 'Dripless Ops',
        description: 'Operations dashboard for managing Dripless customers, drivers, and dispatch.',
        theme_color: '#0f766e',
        background_color: '#f4f6fb',
        display: 'standalone',
        start_url: '/dashboard/overview',
        scope: '/',
        icons: [
          {
            src: 'pwa-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'pwa-512.svg',
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
  server: {
    port: 5175,
    strictPort: true,
    fs: {
      allow: [resolve(__dirname, '..')]
    }
  }
});
