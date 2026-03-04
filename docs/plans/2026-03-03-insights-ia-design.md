# Insights IA Module — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a local IA/Insights module that analyzes user financial data and provides actionable intelligence — score, alerts, projections, tips.

**Architecture:** Single composable `useInsights()` consumes existing composables (useIngresos, usePresupuesto, useDeudas, useTarjetas, useDashboard) and exposes computed insights. One view renders all sections.

**Tech Stack:** Vue 3 + TypeScript, TanStack Vue Query (reads cached data), Chart.js (score gauge), Lucide icons.

---

## Module Structure

```
src/modules/insights/
  ├── composables/
  │   └── useInsights.ts          # All insight calculations
  ├── views/
  │   └── InsightsView.vue        # Main view with 6 sections
  └── types/
      └── index.ts                # Insight-specific types
```

## Types

```typescript
interface FinancialScore {
  total: number            // 0-100
  savingsRatio: number     // 0-25
  creditUtilization: number // 0-25
  expenseControl: number   // 0-25
  debtManagement: number   // 0-25
  label: 'Crítico' | 'Regular' | 'Bueno' | 'Excelente'
  color: string            // hex based on score
}

type AlertSeverity = 'critical' | 'warning' | 'info'

interface InsightAlert {
  id: string
  severity: AlertSeverity
  title: string
  description: string
  icon: string             // Lucide icon name
}

interface CategoryAnalysis {
  nombre: string
  monto: number
  porcentaje: number       // % of total spending
}

interface DebtProjection {
  deudaId: string
  nombrePersona: string
  mesesRestantes: number
  fechaEstimada: string    // ISO date
  totalIntereses: number
  montoActualPendiente: number
}

interface CreditHealth {
  tarjetaId: string
  descripcion: string
  utilizacion: number      // 0-100%
  lineaTotal: number
  deudaActual: number
  status: 'bueno' | 'moderado' | 'alto' | 'critico'
}

interface PersonalizedTip {
  id: string
  text: string
  category: 'ahorro' | 'deuda' | 'gasto' | 'credito'
  icon: string
}
```

## Composable: `useInsights()`

### Score Financiero (0-100)
- **Savings ratio (25pts):** `(ingresos - gastos - compromisos) / ingresos * 25`
  - >20% savings = 25pts, 10-20% = 18pts, 0-10% = 10pts, negative = 0pts
- **Credit utilization (25pts):** `totalDeudaTarjetas / lineaTotalCombinada`
  - <30% = 25pts, 30-50% = 15pts, 50-75% = 8pts, >75% = 0pts
- **Expense control (25pts):** `totalGastado / margenParaGastos`
  - <70% = 25pts, 70-90% = 18pts, 90-100% = 10pts, >100% = 0pts
- **Debt management (25pts):** Based on cuotas/ingresos ratio
  - <20% = 25pts, 20-40% = 15pts, 40-60% = 8pts, >60% = 0pts

### Alertas Inteligentes
Generated dynamically based on conditions:
- `balance < 0` → critical: "Gastas más de lo que ganas"
- Credit utilization > 30% → warning: "Utilización crediticia alta"
- Monthly payments > 40% income → warning: "Compromisos fijos elevados"
- No ingresos → info: "Sin ingresos registrados"
- No gastos → info: "Sin presupuesto registrado"
- Savings rate < 5% → warning: "Tasa de ahorro muy baja"

### Análisis de Gastos
- Group by categoría from `porCategoria` (usePresupuesto)
- Sort by monto descending
- Calculate percentage of total

### Proyección de Deudas
- For each deuda with `tasaInteres > 0` and `cuotaMensual > 0`:
  - Calculate months remaining with compound interest
  - Project payoff date
  - Calculate total interest paid

### Salud Crediticia
- Per card: `montoDeudaActual / lineaTotal * 100`
- Combined: `totalTarjetas / lineaTotalCombinada * 100`
- Thresholds: <30% bueno, 30-50% moderado, 50-75% alto, >75% critico

### Tips Personalizados
- Generated based on data analysis
- Max 5 tips at a time
- Priority by potential impact

## View: InsightsView.vue

### Layout
- Same page structure as other modules (PageHeader + content)
- 6 sections in a responsive grid
- Module accent: `#2D9F8F` (teal-green for "intelligence")

### Sections
1. **Score gauge** — Circular progress ring with number in center
2. **Alerts grid** — Cards with severity-colored left border
3. **Expense analysis** — Horizontal bar chart / progress bars by category
4. **Debt projections** — Cards per debt with timeline
5. **Credit health** — Progress bars per card with color coding
6. **Tips** — Simple list with icons

### Empty State
When no data exists: EmptyState component with "Agrega datos para ver tus insights"

## Navigation

- New sidebar item between "Resumen" and "Ingresos"
- Icon: `Lightbulb` from lucide-vue-next
- Label: "Insights"
- Route: `/insights`, name: `INSIGHTS`

## Files to Modify

- `src/router/index.ts` — add INSIGHTS route
- `src/shared/components/layout/AppLayout.vue` — add nav item (desktop + mobile)
- `src/shared/types/index.ts` — add insight types (or keep in module types)

## Files to Create

- `src/modules/insights/types/index.ts`
- `src/modules/insights/composables/useInsights.ts`
- `src/modules/insights/views/InsightsView.vue`

## Tests

- `test/modules/insights/useInsights.spec.ts` — unit tests for all calculations
- `test/modules/insights/InsightsView.spec.ts` — render + interaction tests
- Update `test/shared/AppLayout.spec.ts` — verify new nav item count (14 total: 7 desktop + 7 mobile)
