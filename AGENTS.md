# AGENTS.md — Monei


Personal finance PWA built with Vue 3, TypeScript, Vite, and Tailwind CSS.
Domain language is Spanish (variable names, UI text, types). Locale: `es-PE`, currency: PEN.

## Build & Dev Commands

| Command                                                  | Description                                                                      |
| -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `pnpm dev`                                               | Start Vite dev server                                                            |
| `pnpm build`                                             | Type-check (`vue-tsc -b`) then Vite production build                             |
| `pnpm test`                                              | Run all tests once with Vitest                                                   |
| `pnpm test:watch`                                        | Run tests in watch mode                                                          |
| `pnpm test -- test/modules/ingresos/useIngresos.spec.ts` | Run a single test file                                                           |
| `pnpm test -- -t "should add ingreso"`                   | Run tests matching a name pattern                                                |
| `pnpm test:coverage`                                     | Run tests with V8 coverage (thresholds: 80% lines/functions/branches/statements) |
| `pnpm lint`                                              | ESLint on `src/` and `test/`                                                     |
| `pnpm lint:fix`                                          | ESLint with auto-fix                                                             |
| `pnpm format`                                            | Prettier write on `src/**/*.{ts,vue}` and `test/**/*.ts`                         |
| `pnpm format:check`                                      | Prettier check (CI uses this)                                                    |
| `pnpm typecheck`                                         | TypeScript check via `tsc --noEmit`                                              |

Package manager is **pnpm** (lockfile: `pnpm-lock.yaml`). Always use `pnpm`, never npm or yarn.
Install dependencies: `pnpm install --frozen-lockfile` (CI) or `pnpm install` (local).

## Project Structure

```
src/
  config/          Supabase client
  modules/         Feature modules (auth, configuracion, dashboard, deudas, ingresos, insights, presupuesto, tarjetas)
    <module>/
      types/       Re-exports from ~/shared/types
      services/    Data access layer (api.ts) — async, localStorage-backed
      composables/ Vue Query composables (use*.ts)
      views/       Page-level Vue components (*View.vue)
      components/  Module-specific components (optional)
  plugins/         Vue Query client setup
  router/          Vue Router config
  shared/
    components/    Reusable UI (ui/), layout (layout/), charts (charts/)
    composables/   Shared composables (useAppFeedback.ts)
    types/         ALL canonical TypeScript interfaces (single index.ts)
    utils/         Utility functions (format.ts)
  stores/          Pinia stores (auth.ts)
test/              Mirrors src/ structure, *.spec.ts files
  helpers/         Test utilities (withSetup, mountWithPlugins, createTestQueryClient)
  setup.ts         Global test setup (mocks for Supabase, localStorage, crypto)
```

Import alias: `~` maps to `src/` (use `~/stores/auth`, `~/shared/types`, etc.).

## Code Style

### Formatting (Prettier)

- No semicolons
- Single quotes
- Trailing commas everywhere
- 120-character print width
- 2-space indentation
- LF line endings
- Arrow parens always (`(x) => x`)
- Vue: do NOT indent `<script>` and `<style>` blocks

### TypeScript

- Strict mode enabled (`strict: true`, `noUnusedLocals`, `noUnusedParameters`)
- Use `type` imports: `import type { Foo } from '...'`
- Interfaces for domain models: PascalCase (`Ingreso`, `TarjetaCredito`, `GastoPresupuesto`)
- Creation types use `Nuevo*` pattern via `Pick<>`: `type NuevoIngreso = Pick<Ingreso, 'monto' | 'descripcion'>`
- All canonical types live in `src/shared/types/index.ts`; modules re-export from there
- Prefix unused function params with `_` (ESLint enforced)
- `@typescript-eslint/no-explicit-any` is a warning — avoid `any`, use proper types
- Non-null assertions (`!`) are allowed but use sparingly

### Vue Components

- Always use `<script setup lang="ts">` — no Options API
- Props: `defineProps<{ ... }>()` with TypeScript generics (no runtime declaration)
- Emits: `defineEmits<{ ... }>()` with TypeScript generics
- Component file names: PascalCase (`IngresosView.vue`, `AppModal.vue`, `PageHeader.vue`)
- Views end with `View` suffix (`DashboardView.vue`, `DeudasView.vue`)
- All interactive/testable elements must have `data-testid` attributes

### Composables

- Named with `use` prefix, camelCase: `useIngresos`, `useAppFeedback`, `useDashboard`
- Export a named function (not default): `export function useIngresos() { ... }`
- Wrap service calls with TanStack Vue Query (`useQuery`, `useMutation`)
- Export query key constants: `export const INGRESOS_QUERY_KEY = (userId: string) => ['finance', userId, 'ingresos'] as const`
- Invalidate queries on mutation success via `queryClient.invalidateQueries()`
- Return computed refs for reactive data, not raw values

### Services (API layer)

- Exported as camelCase object literal: `export const ingresosApi = { ... }`
- All methods are `async` and return `Promise<T>`
- CRUD pattern: `getAll`, `create`, `update`, `remove`
- Throw `Error` for not-found cases: `throw new Error('Ingreso not found')`

### Naming Conventions

- Variables/functions: camelCase (`totalIngresos`, `handleSubmit`)
- Types/Interfaces: PascalCase (`Ingreso`, `ResumenGeneral`)
- Constants/query keys: camelCase function or SCREAMING_SNAKE for route names (`ROUTE_NAMES`)
- Domain terms in Spanish: `monto` (amount), `descripcion`, `deuda` (debt), `ingreso` (income), `gasto` (expense), `tarjeta` (card), `presupuesto` (budget)
- Code section dividers: `// ─── Section Name ───` (Unicode box-drawing characters)

### Imports Order

1. Vue core (`vue`, `vue-router`)
2. Third-party libraries (`@tanstack/vue-query`, `lucide-vue-next`, `pinia`)
3. Internal aliases (`~/stores/...`, `~/shared/...`)
4. Relative imports (`../services/api`, `../types`)

Separate type imports from value imports using `import type`.

## Testing

Framework: **Vitest** with jsdom environment. Globals enabled (`describe`, `it`, `expect` auto-imported).

### Test patterns

- Test files: `test/**/*.spec.ts`, mirroring `src/` structure
- Use `flushPromises()` from `@vue/test-utils` after mutations/async operations
- Composable tests: use `withSetup()` helper from `test/helpers/setup.ts`
- Component tests: use `mountWithPlugins()` helper for full plugin context (Pinia + Vue Query + Router)
- Auth setup in tests: `auth.$patch({ user: { id, username, displayName, provider: 'demo' }, isAuthenticated: true })`
- Always call `unmount()` at the end of composable tests
- Global mocks (auto-applied via `test/setup.ts`): Supabase auth, localStorage, sessionStorage, `crypto.randomUUID`
- `beforeEach` clears localStorage, resets mocks, creates fresh Pinia store

### Test query client

Tests use a special QueryClient with `retry: false` and `gcTime: 0` (no caching) via `createTestQueryClient()`.

## ESLint Rules

- Extends: `@eslint/js` recommended + `typescript-eslint` recommended + `eslint-plugin-vue` flat/recommended
- `vue/multi-word-component-names`: off
- `@typescript-eslint/no-unused-vars`: error (ignore `^_` pattern)
- `@typescript-eslint/no-explicit-any`: warn
- `@typescript-eslint/no-non-null-assertion`: off
- Prettier formatting is skipped by ESLint (handled separately)

## CI Pipeline

PRs to `main`/`develop` run four parallel checks:

1. **Lint** — `pnpm lint`
2. **Format** — `pnpm format:check`
3. **Typecheck** — `pnpm typecheck`
4. **Tests + Coverage** — `pnpm test:coverage` (80% threshold on all metrics)

All checks must pass. A Semgrep security scan also runs on PRs.
Deployment: Vercel (automatic on push to `main` via `cd-deploy.yml`).
