import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'SK Pulse',
        short_name: 'sk-pulse',
        description: 'PWA application for Barangay Loyola SK',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/sk-logo-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/sk-logo-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/sk-logo-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
