# Skill Registry — monei

## Available Skills

No user skills found under `~/.claude/skills/` (directory is empty or contains no SKILL.md files).

## Project Conventions

- **AGENTS.md** found at project root — key instructions:
  - Personal finance PWA built with Vue 3, TypeScript, Vite, and Tailwind CSS
  - Domain language is Spanish (variable names, UI text, types)
  - Locale: `es-PE`, currency: PEN

## Architecture Overview

- **Framework**: Vue 3 (Composition API) + TypeScript
- **Build**: Vite 7 + vue-tsc
- **Styling**: Tailwind CSS v4 (via @tailwindcss/vite plugin)
- **State**: Pinia stores
- **Data fetching**: TanStack Vue Query v5
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **UI components**: Reka UI (headless, auto-resolved via unplugin-vue-components)
- **Charts**: Chart.js + vue-chartjs
- **PWA**: vite-plugin-pwa (auto-update, offline caching)
- **Package manager**: pnpm (workspace)
- **Module alias**: `~` → `src/`

## Module Structure

Feature modules live under `src/modules/`:
- `auth` — authentication views
- `configuracion` — app settings
- `dashboard` — overview/summary
- `demo` — onboarding/sample data
- `deudas` — debts tracking
- `ingresos` — income tracking
- `insights` — AI-powered financial insights
- `presupuesto` — budget management
- `tarjetas` — credit card management

Each module follows the pattern: `composables/`, `services/api.ts`, `types/index.ts`, `views/`

## Shared Infrastructure

- `src/shared/components/` — reusable UI (layout, charts, form controls)
- `src/shared/composables/` — shared composables
- `src/shared/utils/` — formatting, validation utilities
- `src/shared/types/` — shared TypeScript types
- `src/stores/` — Pinia stores (auth)
- `src/config/` — Supabase client, mappers
- `src/router/` — Vue Router

## Testing

- **Framework**: Vitest v4 + jsdom environment
- **Component testing**: @vue/test-utils
- **Coverage**: v8 provider, 80% threshold (lines/functions/branches/statements)
- **Test location**: `test/` directory mirroring `src/` structure
- **Coverage exclusions**: constants, schema, routes, adapters index files
- **Setup file**: `test/setup.ts`

## Linting & Formatting

- **ESLint**: flat config (`eslint.config.js`) — eslint + typescript-eslint + eslint-plugin-vue + prettier (skip-formatting)
- **Prettier**: configured via `@vue/eslint-config-prettier`
- **Rules**: multi-word component names off, no-unused-vars errors (args with `_` prefix allowed), no-explicit-any warn

## CI/CD (GitHub Actions — all trigger on PR to main/develop)

| Workflow | Purpose |
|----------|---------|
| `pr-unit-test` | Run vitest coverage, comment results on PR. Threshold: 80% |
| `pr-validate-tag` | Validate semver in package.json, check for CHANGELOG.md |
| `pr-semgrep-check` | Static analysis / security rules |
| `pr-vulnerability-scan` | Dependency vulnerability scanning |
| `pr-load-values` | (likely env/config loading for other workflows) |

- Node.js: 20, pnpm: 10.28.2
- Branch targets: `main`, `develop`
