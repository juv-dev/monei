import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'
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

function localApiPlugin(env: Record<string, string>): Plugin {
  const routes: Record<string, string> = {
    '/api/db': '/api/db.ts',
    '/api/ai-insights': '/api/ai-insights.ts',
  }
  return {
    name: 'monei-local-api',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      for (const [key, value] of Object.entries(env)) {
        if (value) process.env[key] = value
      }
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url ?? '').split('?')[0] ?? ''
        const modPath = routes[path]
        if (!modPath) return next()
        try {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const raw = Buffer.concat(chunks).toString('utf-8')
          const body = raw ? JSON.parse(raw) : undefined
          const mod = await server.ssrLoadModule(modPath)
          const handler = mod.default as (req: unknown, res: unknown) => Promise<void>
          const shimReq = { method: req.method, headers: req.headers, body }
          const shimRes = {
            status(code: number) {
              res.statusCode = code
              return shimRes
            },
            setHeader(name: string, value: string) {
              res.setHeader(name, value)
              return shimRes
            },
            json(data: unknown) {
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify(data))
            },
            end() {
              res.end()
            },
          }
          await handler(shimReq, shimRes)
        } catch (err) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'local api error' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const fapiHost = clerkFapiHost(env.VITE_CLERK_PUBLISHABLE_KEY ?? '')

  return {
  plugins: [
    localApiPlugin(env),
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
        shortcuts: [
          {
            name: 'Agregar ingreso',
            short_name: 'Ingreso',
            description: 'Registrar un nuevo ingreso',
            url: '/ingresos?nuevo=1',
            icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Agregar egreso',
            short_name: 'Egreso',
            description: 'Registrar un nuevo egreso',
            url: '/egresos?nuevo=1',
            icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Insights',
            short_name: 'Insights',
            description: 'Ver el análisis de tu salud financiera',
            url: '/insights',
            icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Reportes',
            short_name: 'Reportes',
            description: 'Importar y exportar datos',
            url: '/reportes',
            icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/api\//],
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
