import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'

vi.mock('~/shared/services/dexieStorage', () => ({
  dexieStorage: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}))

import { withSetup } from '../../helpers/setup'
import { useMascota, fmtG } from '~/modules/mascota/composables/useMascota'

describe('fmtG', () => {
  it('should format grams under 1000 as "X g"', () => {
    expect(fmtG(0)).toBe('0 g')
    expect(fmtG(200)).toBe('200 g')
    expect(fmtG(400)).toBe('400 g')
    expect(fmtG(999)).toBe('999 g')
  })

  it('should format exactly 1000g as "1 kg"', () => {
    expect(fmtG(1000)).toBe('1 kg')
  })

  it('should format 1500g as "1,5 kg" with comma decimal', () => {
    expect(fmtG(1500)).toBe('1,5 kg')
  })

  it('should format 2000g as "2 kg" without decimal', () => {
    expect(fmtG(2000)).toBe('2 kg')
  })

  it('should round fractional grams', () => {
    expect(fmtG(133.33)).toBe('133 g')
    expect(fmtG(266.66)).toBe('267 g')
  })
})

describe('useMascota — BARF calculations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default pet config', () => {
    const { result, unmount } = withSetup(() => useMascota())
    expect(result.pet.value.racion).toBe(400)
    expect(result.pet.value.comidas).toBe(3)
    expect(result.pet.value.semanas).toBe(2)
    expect(result.pet.value.ingredientes).toHaveLength(3)
    unmount()
  })

  it('should distribute ration evenly across meals', () => {
    const { result, unmount } = withSetup(() => useMascota())
    expect(result.racionMeal.value).toBeCloseTo(400 / 3, 5)
    unmount()
  })

  it('should recalculate racionMeal when comidas changes', () => {
    const { result, unmount } = withSetup(() => useMascota())
    result.setPet('comidas', 2)
    expect(result.racionMeal.value).toBe(200)
    result.setPet('comidas', 4)
    expect(result.racionMeal.value).toBe(100)
    unmount()
  })

  it('should calculate ingredient proportions summing to 100%', () => {
    const { result, unmount } = withSetup(() => useMascota())
    const pcts = result.ingView.value.map((g) => parseInt(g.pctStr))
    expect(pcts.reduce((a, b) => a + b, 0)).toBe(100)
    unmount()
  })

  it('should include only cruda=true ingredients in crudaDia', () => {
    const { result, unmount } = withSetup(() => useMascota())
    const crudaIng = result.pet.value.ingredientes.filter((g) => g.cruda)
    expect(crudaIng).toHaveLength(1)
    expect(crudaIng[0].nombre).toBe('Carne')
    expect(result.crudaDia.value).toBeCloseTo(400 * (50 / 100), 5)
    unmount()
  })

  it('should report hayCruda as true when at least one ingredient is cruda', () => {
    const { result, unmount } = withSetup(() => useMascota())
    expect(result.hayCruda.value).toBe(true)
    unmount()
  })

  it('should report hayCruda as false when no ingredients are cruda', () => {
    const { result, unmount } = withSetup(() => useMascota())
    result.pet.value.ingredientes.forEach((g) => {
      result.setPetIng(g.id, 'cruda', false)
    })
    expect(result.hayCruda.value).toBe(false)
    unmount()
  })

  it('should compute crudaPeriodoStr as crudaDia * (semanas * 7)', async () => {
    const { result, unmount } = withSetup(() => useMascota())
    await flushPromises()
    const crudaDia = result.crudaDia.value
    const dias = result.dias.value
    expect(result.crudaPeriodoStr.value).toBe(fmtG(crudaDia * dias))
    unmount()
  })

  it('should compute crudaSemanaStr as crudaDia * 7', () => {
    const { result, unmount } = withSetup(() => useMascota())
    expect(result.crudaSemanaStr.value).toBe(fmtG(result.crudaDia.value * 7))
    unmount()
  })

  it('should compute crudaMesStr as crudaDia * 30', () => {
    const { result, unmount } = withSetup(() => useMascota())
    expect(result.crudaMesStr.value).toBe(fmtG(result.crudaDia.value * 30))
    unmount()
  })

  it('should not generate plan when nombre is empty', () => {
    const { result, unmount } = withSetup(() => useMascota())
    expect(result.pet.value.nombre).toBe('')
    result.generarPlan()
    expect(result.petConfigured.value).toBe(false)
    unmount()
  })

  it('should generate plan when nombre is filled and racion > 0', () => {
    const { result, unmount } = withSetup(() => useMascota())
    result.setPet('nombre', 'Rex')
    result.generarPlan()
    expect(result.petConfigured.value).toBe(true)
    unmount()
  })

  it('should return to wizard after editarPlan', () => {
    const { result, unmount } = withSetup(() => useMascota())
    result.setPet('nombre', 'Rex')
    result.generarPlan()
    expect(result.petConfigured.value).toBe(true)
    result.editarPlan()
    expect(result.petConfigured.value).toBe(false)
    unmount()
  })

  it('should add ingredient with color from palette', () => {
    const { result, unmount } = withSetup(() => useMascota())
    const initialCount = result.pet.value.ingredientes.length
    result.addIng()
    expect(result.pet.value.ingredientes).toHaveLength(initialCount + 1)
    expect(result.pet.value.ingredientes.at(-1)?.nombre).toBe('Nuevo alimento')
    unmount()
  })

  it('should remove ingredient by id', () => {
    const { result, unmount } = withSetup(() => useMascota())
    const firstId = result.pet.value.ingredientes[0].id
    result.delIng(firstId)
    expect(result.pet.value.ingredientes.find((g) => g.id === firstId)).toBeUndefined()
    unmount()
  })

  it('should increase ingredient parts by 5', () => {
    const { result, unmount } = withSetup(() => useMascota())
    const firstId = result.pet.value.ingredientes[0].id
    const before = result.pet.value.ingredientes[0].parts
    result.bumpIng(firstId, 5)
    expect(result.pet.value.ingredientes[0].parts).toBe(before + 5)
    unmount()
  })

  it('should decrease ingredient parts by 5', () => {
    const { result, unmount } = withSetup(() => useMascota())
    const firstId = result.pet.value.ingredientes[0].id
    const before = result.pet.value.ingredientes[0].parts
    result.bumpIng(firstId, -5)
    expect(result.pet.value.ingredientes[0].parts).toBe(before - 5)
    unmount()
  })

  it('should not allow ingredient parts below zero', () => {
    const { result, unmount } = withSetup(() => useMascota())
    const firstId = result.pet.value.ingredientes[0].id
    result.bumpIng(firstId, -999)
    expect(result.pet.value.ingredientes[0].parts).toBe(0)
    unmount()
  })

  it('should produce mealsView with equal grams per meal', () => {
    const { result, unmount } = withSetup(() => useMascota())
    const meals = result.mealsView.value
    expect(meals).toHaveLength(3)
    meals.forEach((m) => {
      expect(m.gramsStr).toBe(fmtG(result.racionMeal.value))
    })
    unmount()
  })

  it('should produce correct meal names for 2 comidas', () => {
    const { result, unmount } = withSetup(() => useMascota())
    result.setPet('comidas', 2)
    const names = result.mealsView.value.map((m) => m.nombre)
    expect(names).toEqual(['Mañana', 'Noche'])
    unmount()
  })

  it('should produce correct meal names for 4 comidas', () => {
    const { result, unmount } = withSetup(() => useMascota())
    result.setPet('comidas', 4)
    const names = result.mealsView.value.map((m) => m.nombre)
    expect(names).toEqual(['Mañana', 'Mediodía', 'Tarde', 'Noche'])
    unmount()
  })
})
