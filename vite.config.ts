import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import Components from 'unplugin-vue-components/vite'
import RekaResolver from 'reka-ui/resolver'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

// Extract the Clerk Frontend API hostname from the publishable key.
// Key format: pk_(test|live)_<base64>  where base64 decodes to "<hostname>$"
function clerkFapiHost(publishableKey: string): string {
  try {
    const b64 = publishableKey.replace(/^pk_(test|live)_/, '')
    return Buffer.from(b64, 'base64').toString('utf-8').replace(/\$$/, '')
  } catch {
    return ''
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const fapiHost = clerkFapiHost(env.VITE_CLERK_PUBLISHABLE_KEY ?? '')

  return {
  plugins: [
    vue(),
    tailwindcss(),
    Components({
      resolvers: [RekaResolver()],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.svg', 'logo-icon.svg'],
      manifest: {
        name: 'Monei — Tu dinero, bajo control',
        short_name: 'Monei',
        description: 'Gestiona tus ingresos, gastos, deudas y tarjetas de crédito en un solo lugar.',
        theme_color: '#B6A77A',
        background_color: '#F5F6FA',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'es',
        categories: ['finance', 'productivity'],
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-query': ['@tanstack/vue-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-charts': ['chart.js', 'vue-chartjs'],
        },
      },
    },
  },
  server: {
    middlewareMode: false,
    proxy: fapiHost ? {
      '/api/__clerk': {
        target: `https://${fapiHost}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/__clerk/, ''),
        secure: true,
      },
    } : undefined,
  },
  }
})
