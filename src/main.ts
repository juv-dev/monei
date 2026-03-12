import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'

import App from './App.vue'
import router from './router'
import { queryClient } from './plugins/queryClient'
import './style.css'

const app = createApp(App)

// Global error handler — catches unhandled errors in components
app.config.errorHandler = (err, instance, info) => {
  console.error(`[Monei Error] ${info}:`, err)
  if (import.meta.env.DEV) {
    console.warn('Component:', instance)
  }
}

// Catch unhandled promise rejections globally
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Monei] Unhandled promise rejection:', event.reason)
})

app.use(createPinia())
app.use(router)
app.use(VueQueryPlugin, { queryClient })

app.mount('#app')
