# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

Last updated: 2026-05-23

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| Creating a branch or pull request, opening a PR | branch-pr | C:\Users\jesus\.claude\skills\branch-pr\SKILL.md |
| PR exceeds ~400 changed lines, planning chained or stacked PRs | chained-pr | C:\Users\jesus\.claude\skills\chained-pr\SKILL.md |
| Writing guides, READMEs, RFCs, architecture docs, onboarding docs | cognitive-doc-design | C:\Users\jesus\.claude\skills\cognitive-doc-design\SKILL.md |
| Drafting PR/issue comments, review feedback, Slack/GitHub replies | comment-writer | C:\Users\jesus\.claude\skills\comment-writer\SKILL.md |
| Discovering available skills, "find a skill for X" | find-skills | C:\Users\jesus\.claude\skills\find-skills\SKILL.md |
| Creating a GitHub issue, bug report, feature request | issue-creation | C:\Users\jesus\.claude\skills\issue-creation\SKILL.md |
| "judgment day", "doble review", "que lo juzguen", parallel adversarial review | judgment-day | C:\Users\jesus\.claude\skills\judgment-day\SKILL.md |
| User pastes a Figma screenshot or says "figma", "implementá este diseño" | vue-figma | C:\Users\jesus\.claude\skills\vue-figma\SKILL.md |
| "spec", "generate tests", "tests para X", coverage on a file | vue-spec | C:\Users\jesus\.claude\skills\vue-spec\SKILL.md |
| Implementing a change, preparing commits, splitting PRs | work-unit-commits | C:\Users\jesus\.claude\skills\work-unit-commits\SKILL.md |

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | C:\Developers\Github\monei\AGENTS.md | Project description: personal finance PWA, Spanish domain language, es-PE locale, PEN currency |

## Architecture Overview

- **Framework**: Vue 3.5.x (Composition API) + TypeScript 5.9
- **Build**: Vite 7.3 + vue-tsc 3.1
- **Styling**: Tailwind CSS v4.1 (via `@tailwindcss/vite` plugin)
- **State**: Pinia 2.3
- **Data fetching**: TanStack Vue Query v5.100 (with persisted query cache via async storage)
- **Auth**: Clerk (`@clerk/vue` 2.0)
- **Database**: Neon (PostgreSQL via `postgres` 3.4 direct driver). Supabase remains in devDeps only (migration source, see `scripts/migrate-supabase-to-neon.ts`)
- **Push notifications**: Firebase 12.13 (Messaging) — service worker at `public/firebase-messaging-sw.js`
- **Offline storage**: Dexie 4.4 (IndexedDB wrapper)
- **UI primitives**: Reka UI 2.7 (headless, auto-resolved via `unplugin-vue-components`)
- **Icons**: lucide-vue-next
- **Charts**: Chart.js 4.5 + vue-chartjs 5.3
- **PWA**: vite-plugin-pwa 1.2 (auto-update, offline caching)
- **Excel export/import**: exceljs 4.4
- **Package manager**: pnpm 11.1.2 (pinned via `packageManager` field)
- **Module alias**: `~` → `src/`

## Module Structure

Feature modules live under `src/modules/<module>/` with the pattern:

- `composables/` — Vue composables
- `services/api.ts` — data access
- `types/index.ts` — module types
- `views/` — route-mounted Vue components

Modules: `auth`, `configuracion`, `creditos`, `dashboard`, `demo`, `deudas`, `ingresos`, `insights`, `presupuesto`, `reportes`, `tarjetas`.

Shared:
- `src/shared/components/` — reusable UI (layout, charts, form controls, modals)
- `src/shared/composables/` — shared composables (`useExchangeRate`, `useNetworkStatus`, `usePushNotifications`, `usePwaInstall`, `useSelectedMonth`, `useAppFeedback`)
- `src/shared/services/` — `dexieStorage`, `fcmTokensApi`
- `src/shared/utils/` — `format`, `validation`
- `src/shared/types/` — shared types
- `src/stores/` — Pinia stores (`auth`)
- `src/config/` — `db` (Neon), `firebase`, `neon`
- `src/router/` — Vue Router

## Testing

- **Framework**: Vitest 4.0 + jsdom environment
- **Component testing**: @vue/test-utils 2.4
- **Coverage**: v8 provider, threshold 80% (lines/functions/branches/statements)
- **Test location**: `test/` directory mirrors `src/`
- **Setup file**: `test/setup.ts`

## Linting & Formatting

- **ESLint**: flat config (`eslint.config.js`) — eslint 10 + typescript-eslint 8 + eslint-plugin-vue 10 + `@vue/eslint-config-prettier` (skip-formatting)
- **Prettier**: 3.8 via `@vue/eslint-config-prettier`
- **Husky**: 9.1 pre-commit hooks installed via `prepare` script

## CI/CD Pipeline

All checks run on PRs to `main` via composite actions from `juv-dev/workflows-frontend`. Sequential `needs:` chain:

```
vulnerability-scan → supply-chain → load-values → unit-test → code-quality → validate-tag
```

| Job | Composite Action | Tools |
|---|---|---|
| `vulnerability-scan` | `juv-dev/workflows-frontend/.github/actions/vulnerability-scan@main` | Bearer SAST + OSV-Scanner + TruffleHog + license-checker |
| `supply-chain` | `juv-dev/workflows-frontend/.github/actions/supply-chain@main` | `pnpm audit --audit-level high --prod` + `.npmrc` credential check + `pnpm-workspace.yaml` hardening validation |
| `load-values` | `juv-dev/workflows-frontend/.github/actions/load-values@main` | Extracts name/version from `package.json` |
| `unit-test` | `juv-dev/workflows-frontend/.github/actions/unit-test@main` | Vitest with coverage, comments results on PR |
| `code-quality` | `juv-dev/workflows-frontend/.github/actions/code-quality@main` | jscpd (5% threshold) + knip + type-coverage (95% min) |
| `validate-tag` | `juv-dev/workflows-frontend/.github/actions/validate-tag@main` | Semver tag uniqueness check |

Each step writes a `$GITHUB_STEP_SUMMARY` with actionable fixes when it fails — see Actions run top panel.

Scheduled scan: `security_scan.yml` runs `vulnerability-scan` + `code-quality` weekly (Sunday 00:00) and on push to `main`.

Default Node 24, pnpm 11.1.2.

## Supply Chain Hardening

Required hardening config (validated by the `supply-chain` job):

`pnpm-workspace.yaml` (PNPM 11 flat structure, NO `pnpm:` namespace):

```yaml
packages:
  - .

allowBuilds:
  '@clerk/shared': true
  '@firebase/util': false
  esbuild: true
  protobufjs: false
  vue-demi: true

overrides:
  # Security pins — all exact versions, no ^ or >=
  serialize-javascript: ">=7.0.5"
  minimatch: ">=9.0.7"
  uuid: ">=14.0.0"
  flatted: ">=3.4.2"
  defu: ">=6.1.7"
  postcss: ">=8.5.12"
  picomatch: ">=4.0.4"
  lodash: "4.18.1"
  brace-expansion: ">=5.0.5"
  fast-uri: ">=3.1.2"
  "@babel/plugin-transform-modules-systemjs": ">=7.29.4"
  js-cookie: "3.0.7"

minimumReleaseAge: 4320   # 3 days cooldown — blocks recently published packages
blockExoticSubdeps: true   # only direct deps can use exotic sources
strictDepBuilds: true      # only allowBuilds entries can run lifecycle scripts
```

**Critical PNPM 11 gotcha**: the `pnpm.overrides` field in `package.json` is NO LONGER READ in PNPM 11. Overrides MUST live in `pnpm-workspace.yaml` at root level. The `pnpm:` nested namespace is also deprecated — flatten all settings to root.

## Known False Positives

| Tool | Pattern | Action |
|------|---------|--------|
| Bearer SAST | Firebase Web SDK API key (`AIzaSy...`) in `public/firebase-messaging-sw.js` | Added to `bearer.ignore` — Firebase Web SDK keys are public by design ([docs](https://firebase.google.com/docs/projects/api-keys)). Real security via Firebase Security Rules. |

## Commit Conventions

**ONLY** these conventional commit prefixes are accepted:

- `feat:` — new feature
- `fix:` — bug fix or small correction (gitignore updates, config fixes, etc.)
- `hotfix(TICKET):` — production hotfix tied to a ticket

**NEVER** use `chore`, `build`, `docs`, `style`, `refactor`, `ci`, `perf`, `test`. Even for changes that conventional-commits spec would classify as those — map them to `feat` or `fix`.

## PR & Branch Protection

- Default branch: `main`
- Direct push to `main` blocked
- Required status checks: `vulnerability-scan`, `supply-chain`, `unit-test`, `validate-tag`
- Required approving reviews: 0 (solo dev — bypass via admin role)
- Author cannot approve own PR (GitHub default, not configurable)
- Copilot code review enabled on PRs (review on push, review draft PRs)
