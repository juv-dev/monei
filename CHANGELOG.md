# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-04-26

### Added
- Auth migration from Supabase to Clerk (`@clerk/vue`)
- New **Créditos** module — unified view for tarjetas + préstamos
- New **Reportes** module — Excel export via `xlsx`
- Global month selector across Ingresos/Gastos/Presupuesto views
- AI migration from Anthropic to Gemini for financial insights
- Delete confirmation dialogs across all modules
- Network status banner (`NetworkBanner`, `useNetworkStatus`)
- Floating chat panel component
- Login redesign with SSO callback support
- Keep-Supabase-Alive scheduled workflow

### Changed
- CI migrated from npm to pnpm for consistent dependency resolution
- CodeQL analysis updated to v4

### Fixed
- Clerk URL host check now uses proper hostname parsing (CodeQL finding)
- pnpm lockfile kept in sync with package.json

## [1.0.0] - 2026-01-01

### Added
- Initial release — Ingresos, Gastos, Deudas, Tarjetas, Presupuesto, Insights
