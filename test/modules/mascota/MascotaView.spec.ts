import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'

vi.mock('~/shared/services/dexieStorage', () => ({
  dexieStorage: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}))

import MascotaView from '~/modules/mascota/views/MascotaView.vue'
import { mountWithPlugins } from '../../helpers/setup'

describe('should MascotaView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the wizard by default', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    expect(wrapper.find('[data-testid="mascota-wizard"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mascota-result"]').exists()).toBe(false)
  })

  it('should render all 5 questions in the wizard', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    expect(wrapper.find('[data-testid="q1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="q2"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="q3"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="q4"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="q5"]').exists()).toBe(true)
  })

  it('should render the back button', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    expect(wrapper.find('[data-testid="btn-back"]').exists()).toBe(true)
  })

  it('should navigate to configuracion when back button is clicked', async () => {
    const { wrapper, router } = mountWithPlugins(MascotaView)
    await flushPromises()
    await wrapper.find('[data-testid="btn-back"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('configuracion')
  })

  it('should have generar button disabled when nombre is empty', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    const btn = wrapper.find('[data-testid="btn-generar"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('should enable generar button when nombre is filled', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    await wrapper.find('[data-testid="input-nombre"]').setValue('Rex')
    await flushPromises()
    const btn = wrapper.find('[data-testid="btn-generar"]')
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('should show result after filling nombre and clicking generar', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    await wrapper.find('[data-testid="input-nombre"]').setValue('Rex')
    await wrapper.find('[data-testid="btn-generar"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="mascota-result"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mascota-wizard"]').exists()).toBe(false)
  })

  it('should return to wizard after clicking editar respuestas', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    await wrapper.find('[data-testid="input-nombre"]').setValue('Rex')
    await wrapper.find('[data-testid="btn-generar"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="btn-editar"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="mascota-wizard"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mascota-result"]').exists()).toBe(false)
  })

  it('should show the view title "Plan alimenticio"', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    expect(wrapper.text()).toContain('Plan alimenticio')
  })

  it('should show ración/día stat in result', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    await wrapper.find('[data-testid="input-nombre"]').setValue('Firulais')
    await wrapper.find('[data-testid="btn-generar"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="mascota-result"]').text()).toContain('400 g')
  })

  it('should show carne cruda section when at least one ingredient is cruda', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    await wrapper.find('[data-testid="input-nombre"]').setValue('Firulais')
    await wrapper.find('[data-testid="btn-generar"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="mascota-result"]').text()).toContain('Carne cruda a comprar')
  })

  it('should update racion to 300 when custom value is entered in racion input', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    await wrapper.find('[data-testid="input-nombre"]').setValue('Rex')
    await nextTick()
    await wrapper.find('[data-testid="input-racion"]').setValue('300')
    await nextTick()
    expect(wrapper.find('[data-testid="btn-generar"]').attributes('disabled')).toBeUndefined()
  })

  it('should disable generar button when racion input is set to 0', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    await wrapper.find('[data-testid="input-nombre"]').setValue('Rex')
    await nextTick()
    await wrapper.find('[data-testid="input-racion"]').setValue('0')
    await nextTick()
    expect(wrapper.find('[data-testid="btn-generar"]').attributes('disabled')).toBeDefined()
  })

  it('should update ingredient name when name input is changed', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    await wrapper.find('[aria-label="Nombre del alimento Carne"]').setValue('Proteína')
    await nextTick()
    expect(wrapper.find('[aria-label="Eliminar Proteína"]').exists()).toBe(true)
  })

  it('should switch tipo to gato when gato button is clicked', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    const gatoBtn = wrapper.findAll('[data-testid="q1"] button').find(b => b.text().includes('Gato'))
    await gatoBtn!.trigger('click')
    await nextTick()
    expect(gatoBtn!.attributes('aria-pressed')).toBe('true')
  })

  it('should switch tipo back to perro when perro button is clicked after selecting gato', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    const gatoBtn = wrapper.findAll('[data-testid="q1"] button').find(b => b.text().includes('Gato'))
    await gatoBtn!.trigger('click')
    await nextTick()
    const perroBtn = wrapper.findAll('[data-testid="q1"] button').find(b => b.text().includes('Perro'))
    await perroBtn!.trigger('click')
    await nextTick()
    expect(perroBtn!.attributes('aria-pressed')).toBe('true')
    expect(gatoBtn!.attributes('aria-pressed')).toBe('false')
  })

  it('should set racion to 200 when Pequeño 200 chip is clicked', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    const chip = wrapper.findAll('[data-testid="q2"] button').find(b => b.text().includes('Pequeño 200'))
    await chip!.trigger('click')
    await nextTick()
    const input = wrapper.find('[data-testid="input-racion"]')
    expect((input.element as HTMLInputElement).value).toBe('200')
  })

  it('should set racion to 700 when Grande 700 chip is clicked', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    const chip = wrapper.findAll('[data-testid="q2"] button').find(b => b.text().includes('Grande 700'))
    await chip!.trigger('click')
    await nextTick()
    const input = wrapper.find('[data-testid="input-racion"]')
    expect((input.element as HTMLInputElement).value).toBe('700')
  })

  it('should set comidas to 2 when 2 button is clicked', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    const btn2 = wrapper.findAll('[data-testid="q3"] button').find(b => b.text() === '2')
    await btn2!.trigger('click')
    await nextTick()
    await wrapper.find('[data-testid="input-nombre"]').setValue('Rex')
    await wrapper.find('[data-testid="btn-generar"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="mascota-result"]').text()).not.toContain('Tarde')
  })

  it('should set comidas to 4 when 4 button is clicked', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    const btn4 = wrapper.findAll('[data-testid="q3"] button').find(b => b.text() === '4')
    await btn4!.trigger('click')
    await nextTick()
    await wrapper.find('[data-testid="input-nombre"]').setValue('Rex')
    await wrapper.find('[data-testid="btn-generar"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="mascota-result"]').text()).toContain('Mediodía')
  })

  it('should set semanas to 1 when 1 sem button is clicked', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    const btn1 = wrapper.findAll('[data-testid="q5"] button').find(b => b.text().includes('1 sem'))
    await btn1!.trigger('click')
    await nextTick()
    await wrapper.find('[data-testid="input-nombre"]').setValue('Rex')
    await wrapper.find('[data-testid="btn-generar"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="mascota-result"]').text()).toContain('1 semana')
  })

  it('should set semanas to 4 when 4 sem button is clicked', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    const btn4 = wrapper.findAll('[data-testid="q5"] button').find(b => b.text().includes('4 sem'))
    await btn4!.trigger('click')
    await nextTick()
    await wrapper.find('[data-testid="input-nombre"]').setValue('Rex')
    await wrapper.find('[data-testid="btn-generar"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="mascota-result"]').text()).toContain('4 semanas')
  })

  it('should add a new ingredient when Agregar alimento button is clicked', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    const initialCount = wrapper.findAll('[data-testid="q4"] [aria-label^="Eliminar"]').length
    const addBtn = wrapper.findAll('[data-testid="q4"] button').find(b => b.text().includes('Agregar alimento'))
    await addBtn!.trigger('click')
    await nextTick()
    const newCount = wrapper.findAll('[data-testid="q4"] [aria-label^="Eliminar"]').length
    expect(newCount).toBe(initialCount + 1)
  })

  it('should remove Carne ingredient when its delete button is clicked', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    await wrapper.find('[aria-label="Eliminar Carne"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[aria-label="Nombre del alimento Carne"]').exists()).toBe(false)
  })

  it('should increase Carne proportion when bump plus button is clicked', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    await wrapper.find('[aria-label="Aumentar proporción de Carne"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-testid="q4"]').text()).toContain('52%')
  })

  it('should toggle Carne cruda state to false when cruda button is clicked', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    await wrapper.find('[aria-label="Marcar Carne como no cruda"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[aria-label="Marcar Carne como cruda"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Marcar Carne como no cruda"]').exists()).toBe(false)
  })

  it('should hide carne cruda section when all ingredients are marked as not cruda', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    await wrapper.find('[aria-label="Marcar Carne como no cruda"]').trigger('click')
    await nextTick()
    await wrapper.find('[data-testid="input-nombre"]').setValue('Rex')
    await wrapper.find('[data-testid="btn-generar"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="mascota-result"]').text()).not.toContain('Carne cruda a comprar')
  })

  it('should apply gradient style to generar button when canGenerate is true', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    await wrapper.find('[data-testid="input-nombre"]').setValue('Rex')
    await nextTick()
    const btn = wrapper.find('[data-testid="btn-generar"]')
    expect(btn.attributes('style')).toContain('linear-gradient')
  })

  it('should show Mañana Tarde and Noche meal entries in result with comidas 3', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    await wrapper.find('[data-testid="input-nombre"]').setValue('Rex')
    await wrapper.find('[data-testid="btn-generar"]').trigger('click')
    await flushPromises()
    const result = wrapper.find('[data-testid="mascota-result"]')
    expect(result.text()).toContain('Mañana')
    expect(result.text()).toContain('Tarde')
    expect(result.text()).toContain('Noche')
  })

  it('should set racion to 400 when Mediano 400 chip is clicked after selecting 200', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    const btn200 = wrapper.findAll('[data-testid="q2"] button').find(b => b.text().includes('Pequeño 200'))
    await btn200!.trigger('click')
    await nextTick()
    const btn400 = wrapper.findAll('[data-testid="q2"] button').find(b => b.text().includes('Mediano 400'))
    await btn400!.trigger('click')
    await nextTick()
    await wrapper.find('[data-testid="input-nombre"]').setValue('Rex')
    await wrapper.find('[data-testid="btn-generar"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="mascota-result"]').text()).toContain('400 g')
  })

  it('should set comidas to 3 when 3 button is clicked after selecting 2', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    const btn2 = wrapper.findAll('[data-testid="q3"] button').find(b => b.text() === '2')
    await btn2!.trigger('click')
    await nextTick()
    const btn3 = wrapper.findAll('[data-testid="q3"] button').find(b => b.text() === '3')
    await btn3!.trigger('click')
    await nextTick()
    await wrapper.find('[data-testid="input-nombre"]').setValue('Rex')
    await wrapper.find('[data-testid="btn-generar"]').trigger('click')
    await flushPromises()
    const result = wrapper.find('[data-testid="mascota-result"]')
    expect(result.text()).toContain('Mañana')
    expect(result.text()).toContain('Tarde')
    expect(result.text()).toContain('Noche')
  })

  it('should decrease Carne proportion when bump minus button is clicked', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    await wrapper.find('[aria-label="Reducir proporción de Carne"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-testid="q4"]').text()).toContain('47%')
  })

  it('should set semanas to 2 when 2 sem button is clicked after selecting 1', async () => {
    const { wrapper } = mountWithPlugins(MascotaView)
    await flushPromises()
    const btn1 = wrapper.findAll('[data-testid="q5"] button').find(b => b.text().includes('1 sem'))
    await btn1!.trigger('click')
    await nextTick()
    const btn2 = wrapper.findAll('[data-testid="q5"] button').find(b => b.text().includes('2 sem'))
    await btn2!.trigger('click')
    await nextTick()
    await wrapper.find('[data-testid="input-nombre"]').setValue('Rex')
    await wrapper.find('[data-testid="btn-generar"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="mascota-result"]').text()).toContain('2 semanas')
  })
})
