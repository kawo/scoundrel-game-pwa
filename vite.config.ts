import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Installable, and playable with no network at all after the first visit:
    // the service worker precaches the whole build — code, styles, the card
    // art and the self-hosted fonts — so nothing is ever fetched at runtime.
    VitePWA({
      // A new build activates on the next load. Safe mid-run: the game saves
      // after every card, so a reload resumes exactly where it was.
      registerType: 'autoUpdate',
      // The glob below already picks up every icon; listing them here as well
      // would put each one in the precache twice.
      includeManifestIcons: false,
      manifest: {
        name: 'Scoundrel',
        short_name: 'Scoundrel',
        description: 'A solo dungeon-crawl card game played with 44 cards.',
        lang: 'en',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any',
        background_color: '#06060a',
        theme_color: '#06060a',
        categories: ['games'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2,webmanifest}'],
        // Serve the app for any in-scope navigation while offline.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
