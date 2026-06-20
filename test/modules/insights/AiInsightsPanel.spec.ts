import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import AiInsightsPanel from '~/modules/insights/components/AiInsightsPanel.vue'
import { useAiInsights } from '~/modules/insights/composables/useAiInsights'
import { useTypewriter } from '~/modules/insights/composables/useTypewriter'

vi.mock('~/modules/insights/composables/useAiInsights', () => ({
  useAiInsights: vi.fn(),
}))

vi.mock('~/modules/insights/composables/useTypewriter', () => ({
  useTypewriter: vi.fn(),
}))

vi.mock('~/shared/utils/format', () => ({
  formatMoneyDisplay: (v: number) => v.toFixed(2),
}))

const mockFetchAnalysis = vi.fn()
const mockTypeText = vi.fn()
const mockSkipToEnd = vi.fn()

const mockAnalysis = {
  calificacion: 'B' as const,
  calificacionDetalle: 'Salud financiera buena',
  resumen: 'Tu situacion financiera es buena pero con margen de mejora.',
  saludFinanciera: {
    ingresosVsGastos: { estado: 'positivo', detalle: 'Ingresos superan gastos' },
    nivelDeuda: { estado: 'moderado', detalle: 'Deuda manejable' },
    usoCredito: { estado: 'optimo', detalle: 'Uso de credito apropiado' },
  },
  potencialAhorro: { montoMensual: 500, estrategia: 'Reducir gastos en entretenimiento' },
  planAccion: [
    { prioridad: 1, accion: 'Crear fondo de emergencia', impacto: 'alto' as const, categoria: 'ahorro' as const },
  ],
  alertas: [{ tipo: 'importante' as const, mensaje: 'Deuda supera el 30% de ingresos' }],
  proyeccion: {
    optimista: 'Podrias ahorrar S/500 mensuales',
    actual: 'Sin cambios tu situacion se mantendra',
  },
  metaSugerida: {
    descripcion: 'Fondo de emergencia de 3 meses',
    montoObjetivo: 15000,
    plazoMeses: 12,
  },
}

function setupInsightsMock(overrides: {
  aiAnalysis?: typeof mockAnalysis | null
  isLoadingAi?: boolean
  isAiError?: boolean
  aiError?: string | null
  isAiAvailable?: boolean
  isDemo?: boolean
} = {}) {
  vi.mocked(useAiInsights).mockReturnValue({
    aiAnalysis: ref(overrides.aiAnalysis !== undefined ? overrides.aiAnalysis : null),
    isLoadingAi: ref(overrides.isLoadingAi ?? false),
    isAiError: ref(overrides.isAiError ?? false),
    aiError: ref(overrides.aiError ?? null),
    isAiAvailable: ref(overrides.isAiAvailable ?? false),
    isDemo: ref(overrides.isDemo ?? false),
    fetchAnalysis: mockFetchAnalysis,
  } as any)
}

function setupTypewriterMock(overrides: { displayText?: string; isTyping?: boolean } = {}) {
  vi.mocked(useTypewriter).mockReturnValue({
    displayText: ref(overrides.displayText ?? ''),
    isTyping: ref(overrides.isTyping ?? false),
    type: mockTypeText,
    skipToEnd: mockSkipToEnd,
  } as any)
}

describe('should AiInsightsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupInsightsMock()
    setupTypewriterMock()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render ai-section container', () => {
    const wrapper = mount(AiInsightsPanel)
    expect(wrapper.find('[data-testid="ai-section"]').exists()).toBe(true)
  })

  it('should show not available message when not available and isDemo is true', () => {
    setupInsightsMock({ isAiAvailable: false, isDemo: true })
    const wrapper = mount(AiInsightsPanel)
    expect(wrapper.text()).toContain('Analisis con IA no disponible')
  })

  it('should show insufficient data message when not available and isDemo is false', () => {
    setupInsightsMock({ isAiAvailable: false, isDemo: false })
    const wrapper = mount(AiInsightsPanel)
    expect(wrapper.text()).toContain('Aun no hay datos suficientes')
  })

  it('should show loading state when isLoadingAi is true', () => {
    setupInsightsMock({ isAiAvailable: true, isLoadingAi: true })
    const wrapper = mount(AiInsightsPanel)
    expect(wrapper.text()).toContain('Analizando tus finanzas')
  })

  it('should show error state with error message when isAiError is true', () => {
    setupInsightsMock({ isAiAvailable: true, isAiError: true, aiError: 'Error de red' })
    const wrapper = mount(AiInsightsPanel)
    expect(wrapper.text()).toContain('No se pudo generar el analisis')
    expect(wrapper.text()).toContain('Error de red')
  })

  it('should show Reanalizar button when isAiAvailable and not loading', () => {
    setupInsightsMock({ isAiAvailable: true, isLoadingAi: false })
    const wrapper = mount(AiInsightsPanel)
    expect(wrapper.text()).toContain('Reanalizar')
  })

  it('should call fetchAnalysis when Reanalizar button is clicked', async () => {
    setupInsightsMock({ isAiAvailable: true, isLoadingAi: false })
    const wrapper = mount(AiInsightsPanel)
    const btn = wrapper.findAll('button').find((b) => b.text().includes('Reanalizar'))
    await btn!.trigger('click')
    expect(mockFetchAnalysis).toHaveBeenCalled()
  })

  it('should call fetchAnalysis on mount when isAiAvailable is true', () => {
    setupInsightsMock({ isAiAvailable: true })
    mount(AiInsightsPanel)
    expect(mockFetchAnalysis).toHaveBeenCalledOnce()
  })

  it('should render grade calificacion when aiAnalysis is provided', () => {
    setupInsightsMock({ isAiAvailable: true, aiAnalysis: mockAnalysis })
    const wrapper = mount(AiInsightsPanel)
    expect(wrapper.text()).toContain(mockAnalysis.calificacion)
  })

  it('should render grade label Bueno based on calificacion B', () => {
    setupInsightsMock({ isAiAvailable: true, aiAnalysis: mockAnalysis })
    const wrapper = mount(AiInsightsPanel)
    expect(wrapper.text()).toContain('Bueno')
  })

  it('should render health indicators for ingresosVsGastos nivelDeuda and usoCredito', () => {
    setupInsightsMock({ isAiAvailable: true, aiAnalysis: mockAnalysis })
    const wrapper = mount(AiInsightsPanel)
    expect(wrapper.text()).toContain('Ingresos vs Gastos')
    expect(wrapper.text()).toContain('Nivel de Deuda')
    expect(wrapper.text()).toContain('Uso de Credito')
  })

  it('should show savings potential section when montoMensual is greater than zero', () => {
    setupInsightsMock({
      isAiAvailable: true,
      aiAnalysis: { ...mockAnalysis, potencialAhorro: { montoMensual: 500, estrategia: 'Reducir gastos' } },
    })
    const wrapper = mount(AiInsightsPanel)
    expect(wrapper.text()).toContain('Potencial de Ahorro')
  })

  it('should not show savings potential when montoMensual is zero', () => {
    setupInsightsMock({
      isAiAvailable: true,
      aiAnalysis: { ...mockAnalysis, potencialAhorro: { montoMensual: 0, estrategia: '' } },
    })
    const wrapper = mount(AiInsightsPanel)
    expect(wrapper.text()).not.toContain('Potencial de Ahorro')
  })

  it('should render alerts when aiAnalysis alertas has entries', () => {
    setupInsightsMock({ isAiAvailable: true, aiAnalysis: mockAnalysis })
    const wrapper = mount(AiInsightsPanel)
    expect(wrapper.text()).toContain('Deuda supera el 30% de ingresos')
  })

  it('should not render alerts section when alertas is empty', () => {
    setupInsightsMock({
      isAiAvailable: true,
      aiAnalysis: { ...mockAnalysis, alertas: [] },
    })
    const wrapper = mount(AiInsightsPanel)
    expect(wrapper.text()).not.toContain('Alertas')
  })

  it('should render action plan when planAccion has entries', () => {
    setupInsightsMock({ isAiAvailable: true, aiAnalysis: mockAnalysis })
    const wrapper = mount(AiInsightsPanel)
    expect(wrapper.text()).toContain('Plan de Acción')
    expect(wrapper.text()).toContain('Crear fondo de emergencia')
  })

  it('should render projection when proyeccion is provided', () => {
    setupInsightsMock({ isAiAvailable: true, aiAnalysis: mockAnalysis })
    const wrapper = mount(AiInsightsPanel)
    expect(wrapper.text()).toContain('Proyección')
  })

  it('should render meta sugerida when metaSugerida is provided', () => {
    setupInsightsMock({ isAiAvailable: true, aiAnalysis: mockAnalysis })
    const wrapper = mount(AiInsightsPanel)
    expect(wrapper.text()).toContain('Meta Sugerida')
  })

  it('should show Mostrar todo button when isTyping is true', () => {
    setupInsightsMock({ isAiAvailable: true, aiAnalysis: mockAnalysis })
    setupTypewriterMock({ isTyping: true, displayText: mockAnalysis.resumen })
    const wrapper = mount(AiInsightsPanel)
    expect(wrapper.text()).toContain('Mostrar todo')
  })

  it('should call skipToEnd when Mostrar todo button is clicked', async () => {
    setupInsightsMock({ isAiAvailable: true, aiAnalysis: mockAnalysis })
    setupTypewriterMock({ isTyping: true, displayText: mockAnalysis.resumen })
    const wrapper = mount(AiInsightsPanel)
    const btn = wrapper.findAll('button').find((b) => b.text().includes('Mostrar todo'))
    await btn!.trigger('click')
    expect(mockSkipToEnd).toHaveBeenCalledWith(mockAnalysis.resumen)
  })

  it('should call fetchAnalysis when Intentar de nuevo button is clicked', async () => {
    setupInsightsMock({ isAiAvailable: true, isAiError: true, aiError: 'Error' })
    const wrapper = mount(AiInsightsPanel)
    const btn = wrapper.findAll('button').find((b) => b.text().includes('Intentar de nuevo'))
    await btn!.trigger('click')
    expect(mockFetchAnalysis).toHaveBeenCalled()
  })

  it('should call typeText when aiAnalysis changes to have a resumen', async () => {
    const aiAnalysisRef = ref<typeof mockAnalysis | null>(null)
    vi.mocked(useAiInsights).mockReturnValue({
      aiAnalysis: aiAnalysisRef,
      isLoadingAi: ref(false),
      isAiError: ref(false),
      aiError: ref(null),
      isAiAvailable: ref(true),
      isDemo: ref(false),
      fetchAnalysis: mockFetchAnalysis,
    } as any)
    mount(AiInsightsPanel)
    aiAnalysisRef.value = mockAnalysis
    await nextTick()
    expect(mockTypeText).toHaveBeenCalledWith(mockAnalysis.resumen)
  })

  it('should start loading interval when isLoadingAi changes to true and rotate messages', async () => {
    vi.useFakeTimers()
    const isLoadingAiRef = ref(false)
    vi.mocked(useAiInsights).mockReturnValue({
      aiAnalysis: ref(null),
      isLoadingAi: isLoadingAiRef,
      isAiError: ref(false),
      aiError: ref(null),
      isAiAvailable: ref(true),
      isDemo: ref(false),
      fetchAnalysis: mockFetchAnalysis,
    } as any)
    const wrapper = mount(AiInsightsPanel)
    isLoadingAiRef.value = true
    await nextTick()
    vi.advanceTimersByTime(2500)
    await nextTick()
    expect(wrapper.text()).toContain('Evaluando tu nivel de endeudamiento...')
    wrapper.unmount()
  })

  it('should clear loading interval when isLoadingAi changes back to false', async () => {
    vi.useFakeTimers()
    const isLoadingAiRef = ref(false)
    vi.mocked(useAiInsights).mockReturnValue({
      aiAnalysis: ref(null),
      isLoadingAi: isLoadingAiRef,
      isAiError: ref(false),
      aiError: ref(null),
      isAiAvailable: ref(true),
      isDemo: ref(false),
      fetchAnalysis: mockFetchAnalysis,
    } as any)
    const wrapper = mount(AiInsightsPanel)
    isLoadingAiRef.value = true
    await nextTick()
    isLoadingAiRef.value = false
    await nextTick()
    vi.advanceTimersByTime(5000)
    expect(wrapper.text()).not.toContain('Evaluando tu nivel de endeudamiento...')
    wrapper.unmount()
  })
})
