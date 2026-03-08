# Best Practices - Monei (Vue 3 + Vite + Supabase)

Guia de buenas practicas, recomendaciones e ideas para una aplicacion de finanzas personales construida con Vue 3, Vite, Pinia, TanStack Query, Supabase y Tailwind CSS.

---

## 1. Arquitectura y Estructura del Proyecto

### Estructura modular por feature
- Organizar el codigo por **modulo de negocio** (`ingresos/`, `presupuesto/`, `deudas/`, `tarjetas/`, `insights/`), no por tipo de archivo
- Cada modulo debe contener sus propios: `views/`, `components/`, `composables/`, `services/`, `types/`
- El directorio `shared/` es para componentes, composables y utilidades reutilizables entre modulos

### Composables (Composition API)
- Un composable por entidad de negocio: `useIngresos()`, `useDeudas()`, `useTarjetas()`
- Separar la logica de negocio de la UI — los composables NO deben manejar estado visual (modales, toasts)
- Usar `computed()` para valores derivados (totales, porcentajes, promedios)
- Retornar siempre refs reactivos, nunca valores planos
- Nombrar con el prefijo `use` seguido del dominio: `usePresupuesto`, `useAiInsights`

### Servicios (API Layer)
- Un archivo de servicio por entidad: `api.ts` dentro de cada modulo
- Patron dual para demo/produccion: localStorage para `userId === 'demo'`, Supabase para usuarios reales
- Centralizar los mappers de base de datos en `config/mappers.ts` (snake_case DB <-> camelCase app)
- Nunca exponer el cliente de Supabase directamente en los componentes

### State Management
- Usar **Pinia** solo para estado global verdadero (auth, configuracion)
- Usar **TanStack Query** para estado del servidor (cache, invalidacion, refetch automatico)
- Evitar duplicar datos entre Pinia y TanStack Query
- Configurar `staleTime` y `gcTime` apropiados para datos financieros (no cambian cada segundo)

### TypeScript
- Habilitar `strict: true` en tsconfig
- Definir interfaces para todos los modelos de negocio (`Ingreso`, `Deuda`, `Tarjeta`)
- Usar `type` para uniones y aliases, `interface` para objetos extensibles
- Nunca usar `any` — preferir `unknown` con type guards cuando sea necesario
- Tipar los retornos de funciones async: `Promise<Ingreso[]>`, no inferir

---

## 2. Seguridad

### Supabase Row Level Security (RLS)
- **SIEMPRE** habilitar RLS en todas las tablas de Supabase
- Crear policies que filtren por `auth.uid() = user_id` en SELECT, INSERT, UPDATE, DELETE
- Nunca confiar solo en el filtrado del frontend — el backend DEBE validar
- Probar las policies con diferentes usuarios para confirmar el aislamiento de datos
- Usar `service_role` key SOLO en Edge Functions del servidor, NUNCA en el cliente

### Proteccion contra XSS
- Vue 3 escapa HTML por defecto en `{{ }}` — nunca usar `v-html` con datos del usuario
- Sanitizar inputs antes de guardarlos en la base de datos
- Validar que montos sean numericos y descripciones no contengan scripts
- Usar Content Security Policy (CSP) headers en produccion

### Autenticacion
- Almacenar tokens en cookies `httpOnly` cuando sea posible (Supabase maneja esto automaticamente)
- Implementar refresh token rotation
- Limpiar sessionStorage/localStorage al cerrar sesion
- Verificar la sesion en cada navegacion con guards de Vue Router
- Implementar timeout de sesion por inactividad (15-30 minutos para apps financieras)

### Validacion de inputs
- Validar montos: positivos, maximo 2 decimales, rango razonable (ej: < 999,999,999)
- Validar descripciones: longitud maxima, caracteres permitidos
- Validar tasas de interes: 0-100%
- Sanitizar en el frontend Y validar en Supabase Edge Functions/DB constraints

### Variables de entorno
- NUNCA commitear `.env` con keys reales
- Usar `.env.example` como template
- Las variables `VITE_*` son publicas — solo exponer lo necesario
- Secrets como `ANTHROPIC_API_KEY` van en Supabase Secrets, nunca en el frontend

---

## 3. Rendimiento

### Code Splitting y Lazy Loading
- Usar `defineAsyncComponent` para componentes pesados (charts, modales complejos)
- Lazy load de rutas: `() => import('./views/DashboardView.vue')`
- Separar chunks por modulo de negocio para que el usuario solo descargue lo que necesita
- Prefetch de rutas probables: si el usuario esta en dashboard, prefetch de ingresos

### Optimizacion del Bundle
- Analizar el bundle con `npx vite-bundle-visualizer`
- Verificar que librerias grandes (chart.js, lucide) no se importen completas
- Usar tree-shaking: importar iconos individuales `import { Wallet } from 'lucide-vue-next'`
- Configurar `build.rollupOptions.output.manualChunks` para separar vendor de app

### Caching con TanStack Query
- `staleTime: 5 * 60 * 1000` (5 min) para datos financieros — no cambian constantemente
- `gcTime: 30 * 60 * 1000` (30 min) para mantener cache en memoria
- Usar `queryClient.invalidateQueries()` despues de crear/actualizar/eliminar
- Implementar optimistic updates para mejor UX en operaciones CRUD

### Renderizado
- Usar `v-once` para contenido estatico que no cambia (headers, labels)
- Usar `v-memo` para listas grandes que rara vez cambian
- Evitar watchers profundos (`deep: true`) — ser especifico con lo que se observa
- Usar `shallowRef` para objetos grandes que se reemplazan completos

### Assets y Estilos
- Configurar compresion gzip/brotli en el servidor (Vercel lo hace automatico)
- Optimizar imagenes: usar WebP, lazy loading con `loading="lazy"`
- Purgar CSS no usado con Tailwind (activado por defecto en produccion)
- Usar CSS `will-change` solo en elementos que realmente se animan

---

## 4. UX/UI para Apps Financieras

### Dashboard
- Mostrar el **balance general** como dato principal — es lo primero que el usuario busca
- Usar **colores semanticos**: verde para positivo, rojo para negativo, amarillo para alertas
- Incluir comparacion temporal: "este mes vs mes anterior"
- Mostrar graficos de distribucion de gastos (donut/pie chart)
- Incluir una seccion de "acciones pendientes" o alertas prioritarias

### Formularios financieros
- Usar input de moneda con formato en tiempo real (S/ 1,234.56)
- Auto-focus en el campo de monto al abrir formularios de ingreso/gasto
- Botones de monto rapido: "+100", "+500", "+1000" para entrada rapida
- Categorias con iconos para identificacion visual rapida
- Validacion inline sin esperar al submit

### Mobile First
- Disenar primero para 375px de ancho (iPhone SE)
- Botones con min-height de 44px para touch targets accesibles
- Usar gestos: swipe para eliminar, drag para reordenar
- Bottom navigation en mobile, sidebar en desktop
- Formularios adaptados: teclado numerico para montos (`inputmode="decimal"`)

### Accesibilidad (a11y)
- Usar `role="alert"` para mensajes de error
- Colores con contraste minimo 4.5:1 (WCAG AA)
- Labels en todos los inputs de formulario
- Navegacion por teclado funcional (Tab, Enter, Escape)
- `aria-hidden="true"` en iconos decorativos
- Anunciar cambios de estado a screen readers con `aria-live`

### Feedback visual
- Loading states con skeletons, no spinners genericos
- Animaciones sutiles para transiciones (300ms max)
- Confirmacion visual inmediata en acciones CRUD (toasts)
- Indicadores de progreso para operaciones largas (analisis de IA)
- Estados empty claros con CTA: "Agrega tu primer ingreso"

---

## 5. Gestion de Datos

### Estrategia offline
- El modo demo ya funciona offline via localStorage — documentar esta ventaja
- Para usuarios reales: cachear la ultima lectura en localStorage como fallback
- Mostrar indicador visual cuando el usuario esta offline
- Encolar operaciones offline y sincronizar al reconectar
- Usar Service Worker para cache de assets estaticos (via vite-plugin-pwa)

### Sincronizacion
- TanStack Query maneja reintentos automaticos (configurar `retry: 3`)
- Implementar `refetchOnWindowFocus: true` para datos frescos al volver a la app
- Usar Supabase Realtime para actualizaciones entre dispositivos (opcional)
- Resolver conflictos con "last write wins" para datos simples o "merge" para datos complejos

### Migracion de datos
- Plan de migracion para usuarios que pasan de demo a cuenta real
- Exportar datos de localStorage e importarlos via Supabase
- Mantener compatibilidad hacia atras con formatos de localStorage antiguos
- Versionamiento de esquema de datos para migraciones futuras

### Respaldo
- Implementar exportacion de datos a CSV/JSON para el usuario
- Supabase hace backups automaticos en planes de pago
- Nunca eliminar datos permanentemente — usar soft delete (`deleted_at`)

---

## 6. Testing

### Estrategia de testing
- **Unit tests**: composables y servicios API (logica de negocio pura)
- **Component tests**: vistas con interaccion de usuario (clicks, formularios)
- **Integration tests**: flujos completos (crear ingreso -> ver en dashboard)
- Meta de coverage: **>90%** en logica de negocio, **>80%** en componentes

### Testing financiero
- Probar calculos con numeros decimales problematicos (0.1 + 0.2)
- Probar con montos extremos: 0, negativos, muy grandes (999,999,999)
- Probar aislamiento de datos entre usuarios (RLS simulado)
- Probar formulas de interes, proyecciones y puntaje financiero
- Probar edge cases: division por cero en porcentajes, listas vacias

### Patron de testing
- Usar `withSetup()` helper para composables que necesitan Vue context
- Usar `mountWithPlugins()` para componentes con Pinia + Router + TanStack Query
- Mock de Supabase con chainable query builder (ya implementado en `test/setup.ts`)
- Usar `flushPromises()` despues de operaciones async
- Resetear estado entre tests: `clearTables()`, `localStorage.clear()`

### Testing de componentes Vue
- Buscar elementos por `data-testid`, no por clases CSS o estructura HTML
- Probar interacciones del usuario: clicks, inputs, form submits
- Para componentes con Teleport (modales): buscar en `document.body`
- Usar fake timers (`vi.useFakeTimers()`) para animaciones y debounce

### E2E Testing (recomendado implementar)
- Usar Playwright o Cypress para flujos criticos
- Flujos a cubrir: login -> crear ingreso -> ver en dashboard -> logout
- Flujo demo: probar que los datos de ejemplo se cargan correctamente
- Probar responsive: mobile (375px) y desktop (1280px)

---

## 7. SEO y PWA

### SEO para SPA
- Usar meta tags dinamicos por ruta con `@unhead/vue` o `vue-meta`
- Implementar `robots.txt` con reglas apropiadas (bloquear rutas autenticadas)
- Crear `sitemap.xml` para paginas publicas (login, landing page)
- Usar prerenderizado con `vite-plugin-prerender` para paginas publicas
- Agregar `canonical` URLs para evitar contenido duplicado
- Structured data (JSON-LD) ya implementado — mantener actualizado

### PWA
- vite-plugin-pwa ya esta configurado — optimizar el service worker
- Implementar cache strategy: NetworkFirst para API, CacheFirst para assets
- Agregar notificaciones push para alertas financieras
- Prompt de instalacion (A2HS) en el momento correcto (no al primer visit)
- Manejar actualizaciones de la app con prompt "Nueva version disponible"

### Open Graph y Social
- Meta tags de OG para compartir la app en redes sociales
- Imagen de preview para cuando se comparte la URL
- Twitter Card meta tags para previews en Twitter

---

## 8. Despliegue y CI/CD

### Build optimization
- `vite build` con `--mode production` para tree-shaking completo
- Configurar `build.sourcemap: true` solo en staging, no en produccion
- Habilitar compresion Brotli: `vite-plugin-compression`
- Configurar cache headers largos para assets hasheados (1 year)
- Cache headers cortos para `index.html` (no-cache o 5 min max)

### Pipeline CI/CD
- Lint + Type check en cada PR: `npm run lint && npx tsc --noEmit`
- Tests automaticos en cada push: `npm run test`
- Coverage report como comment en PRs
- Build de preview en PRs para revisar cambios visuales
- Deploy automatico a staging en push a `develop`, produccion en `main`

### Entornos
- `.env.development` con URLs de Supabase de desarrollo
- `.env.staging` con proyecto de staging separado
- `.env.production` con proyecto de produccion
- Supabase Edge Functions: deploy separado por entorno

### Monitoring en produccion
- Agregar Sentry o similar para error tracking
- Configurar alertas para errores criticos (fallos de auth, errores de API)
- Monitorear Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
- Logs de Supabase Edge Functions para debugging de la IA

---

## 9. Funcionalidades Financieras

### Presupuesto y control de gastos
- Implementar limites de gasto por categoria con alertas al 80% y 100%
- Mostrar "quemado" del presupuesto: barra de progreso por categoria
- Gastos recurrentes automaticos (renta, servicios, suscripciones)
- Comparar gastos reales vs presupuestados por periodo
- Reportes mensuales automaticos con tendencias

### Gestion de deudas
- Calculadora de amortizacion: metodo frances vs aleman
- Estrategia de pago sugerida: avalancha (mayor tasa primero) vs bola de nieve (menor monto primero)
- Proyeccion de fecha libre de deuda
- Tracking de progreso visual (porcentaje pagado)
- Alertas de vencimiento de cuotas

### Tarjetas de credito
- Calcular uso de credito como porcentaje de la linea total
- Alerta cuando el uso de credito supera 30% (afecta score crediticio)
- Tracking de fecha de corte y fecha de pago
- Calcular intereses proyectados si solo paga el minimo
- Sugerir monto optimo de pago mensual

### Proyecciones financieras
- Proyeccion de balance a 3, 6 y 12 meses basada en tendencias
- Simulador "que pasa si": agregar un gasto fijo, pagar una deuda extra
- Meta de ahorro con calculadora de tiempo necesario
- Punto de equilibrio: cuando los ahorros cubren X meses de gastos
- Grafico de tendencia historica de balance neto

### Multi-moneda (futuro)
- Guardar moneda por transaccion
- Tipo de cambio configurable o via API (exchangerate-api.com)
- Mostrar totales convertidos a la moneda principal del usuario
- Formato de moneda correcto por locale: S/ 1,234.56, $1,234.56, 1.234,56 EUR

### Categorias inteligentes
- Categorias predefinidas: Alimentacion, Transporte, Vivienda, Salud, Entretenimiento, Educacion
- Subcategorias opcionales para mayor detalle
- Categorizacion automatica basada en historial (IA)
- Iconos y colores por categoria para reconocimiento visual rapido
- Permitir categorias personalizadas del usuario

---

## 10. Integracion con IA (Claude API)

### Arquitectura
- Las llamadas a Claude API SIEMPRE van por Supabase Edge Functions (nunca desde el frontend)
- El API key de Anthropic se almacena en Supabase Secrets
- Implementar rate limiting por usuario (ej: 10 analisis por dia)
- Cachear respuestas de analisis — si los datos no cambiaron, no volver a analizar
- Timeout de 30s para llamadas a la IA con fallback amigable

### Prompts financieros
- Incluir contexto completo: ingresos, gastos por categoria, deudas, tarjetas, puntaje
- Pedir respuesta en JSON estructurado con schema definido
- Usar system prompt detallado con el rol de "asesor financiero personal"
- Incluir la moneda y el pais del usuario para recomendaciones contextuales
- Limitar la respuesta con `max_tokens` apropiado (2048 para analisis, 800 para chat)

### UX de la IA
- Loading state con mensajes rotativos que indican que esta "pensando"
- Efecto typewriter para las respuestas — se siente mas natural
- Boton "Mostrar todo" para saltar la animacion
- Preguntas rapidas predefinidas para iniciar el chat
- Historial de conversacion dentro de la sesion (no persistir entre sesiones)

### Calidad de respuestas
- Validar que el JSON de respuesta tenga todos los campos esperados
- Fallback graceful si la IA retorna formato inesperado
- No mostrar datos de la IA como "verdad absoluta" — siempre disclaimer
- Permitir al usuario reportar respuestas incorrectas (feedback loop)
- Actualizar el system prompt periodicamente basado en feedback

### Costos
- Monitorear uso de tokens por usuario
- claude-sonnet para analisis (buena relacion calidad/precio)
- Implementar cache: si los datos financieros no cambiaron, reusar el ultimo analisis
- Batch de preguntas de chat vs multiples llamadas individuales

---

## 11. Internacionalizacion (i18n)

### Setup recomendado
- Usar `vue-i18n` con Composition API: `const { t } = useI18n()`
- Archivos de traduccion JSON por idioma: `locales/es.json`, `locales/en.json`
- Organizar traducciones por modulo: `ingresos.title`, `deudas.form.amount`
- Cargar traducciones de forma lazy por ruta para reducir bundle inicial

### Formato de numeros y moneda
- Usar `Intl.NumberFormat` con locale del usuario
- Configurar moneda por defecto: `PEN` (Sol peruano) con opcion de cambiar
- Formato de fecha con `Intl.DateTimeFormat` segun locale
- Separadores de miles y decimales correctos por idioma

### Contenido financiero
- Traducir categorias de gastos predefinidas
- Traducir alertas y recomendaciones de la IA
- Considerar que terminos financieros varian por pais (ej: "tarjeta" vs "credencial")
- Las respuestas de la IA deben incluir el idioma del usuario en el prompt

---

## 12. Monitoreo y Manejo de Errores

### Error handling
- Error boundaries globales con `app.config.errorHandler`
- Try/catch en todas las llamadas a Supabase y Edge Functions
- Mensajes de error amigables para el usuario (nunca mostrar stack traces)
- Categorizar errores: red (critico), amarillo (advertencia), azul (info)
- Retry automatico para errores de red (TanStack Query lo maneja)

### Error tracking
- Integrar Sentry para capturar errores en produccion
- Breadcrumbs: trackear navegacion y acciones del usuario antes del error
- Source maps privados (subir a Sentry, no exponer en produccion)
- Alertas automaticas para errores nuevos o picos de errores

### Performance monitoring
- Core Web Vitals con `web-vitals` library
- Medir tiempo de carga de cada ruta
- Medir tiempo de respuesta de Supabase queries
- Medir tiempo de respuesta de la IA
- Dashboard de metricas con herramientas como Vercel Analytics o Plausible

### Logging
- Logs estructurados en Edge Functions (JSON format)
- Niveles de log: ERROR, WARN, INFO, DEBUG
- Incluir `userId` y `action` en cada log para trazabilidad
- No loggear datos sensibles (passwords, tokens, montos exactos)
- Rotacion de logs: mantener 30 dias en desarrollo, 90 en produccion

### Health checks
- Endpoint de salud para Supabase connection
- Verificar que Edge Functions responden correctamente
- Monitorear cuota de API de Anthropic
- Alertas cuando el tiempo de respuesta supera umbrales definidos

---

## 13. Ideas y Mejoras Futuras

### Gamificacion
- Rachas de registro diario: "Llevas 7 dias registrando gastos"
- Logros financieros: "Primer mes sin deuda", "Ahorraste 10% de tus ingresos"
- Puntaje financiero con progresion visual (ya parcialmente implementado)
- Desafios mensuales: "Reduce gastos de entretenimiento en 20%"

### Social / Compartir
- Compartir logros en redes sociales (sin datos sensibles)
- Comparacion anonima: "Tu ahorro esta por encima del 70% de usuarios similares"
- Tips de la comunidad: recomendaciones de otros usuarios

### Integraciones
- Importar transacciones de bancos via API (Open Banking)
- Conectar con Google Sheets para exportar reportes
- Integrar con apps de notas para adjuntar recibos
- Webhooks para notificaciones en Telegram/WhatsApp

### Reportes avanzados
- Reporte anual tipo "Spotify Wrapped" para finanzas
- PDF generado con resumen mensual
- Graficos interactivos con drill-down por categoria
- Heat map de gastos por dia de la semana
- Prediccion de gastos del proximo mes basada en patron historico

### Mejoras de UX
- Dark mode completo
- Widgets para pantalla de inicio (Android/iOS)
- Atajos de teclado para power users
- Voz: "Oye Monei, gaste 50 soles en almuerzo"
- OCR de recibos para registro automatico de gastos

---

> Este documento es una guia viva. Actualizar conforme el proyecto evoluciona y se implementan nuevas funcionalidades.
