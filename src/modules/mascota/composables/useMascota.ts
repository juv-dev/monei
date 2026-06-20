import { ref, computed, watch, onMounted } from 'vue'
import { dexieStorage } from '~/shared/services/dexieStorage'

const STORAGE_KEY = 'mascota-config'

const PALETTE = ['#5B8C5A', '#5B6F8C', '#A8627E', '#7A6CCB', '#2A9D8F', '#C2884B']

const MEAL_NAMES: Record<number, string[]> = {
  1: ['Día'],
  2: ['Mañana', 'Noche'],
  3: ['Mañana', 'Tarde', 'Noche'],
  4: ['Mañana', 'Mediodía', 'Tarde', 'Noche'],
}

const MEAL_DOTS = ['#E7B84B', '#D98A3D', '#5B6F8C', '#5B8C5A', '#A8627E']

export type TipoAnimal = 'perro' | 'gato'
export type NumComidas = 2 | 3 | 4
export type NumSemanas = 1 | 2 | 4

export interface Ingrediente {
  id: string
  nombre: string
  parts: number
  color: string
  cruda: boolean
}

export interface PetConfig {
  nombre: string
  tipo: TipoAnimal
  racion: number
  comidas: NumComidas
  semanas: NumSemanas
  ingredientes: Ingrediente[]
}

export interface IngredienteView {
  id: string
  nombre: string
  color: string
  parts: number
  cruda: boolean
  gramsDiaStr: string
  gramsMealStr: string
  pctStr: string
  pctW: string
}

export interface MealView {
  nombre: string
  dot: string
  gramsStr: string
}

interface PersistedState {
  pet: PetConfig
  petConfigured: boolean
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

export function fmtG(g: number): string {
  const v = Math.round(Math.abs(g))
  if (v >= 1000) {
    const kg = v / 1000
    const formatted = Number.isInteger(kg) ? String(kg) : kg.toFixed(1).replace('.', ',')
    return formatted + ' kg'
  }
  return v + ' g'
}

const DEFAULT_PET: PetConfig = {
  nombre: '',
  tipo: 'perro',
  racion: 400,
  comidas: 3,
  semanas: 2,
  ingredientes: [
    { id: 'g1', nombre: 'Carne', parts: 50, color: '#C0584C', cruda: true },
    { id: 'g2', nombre: 'Quinua', parts: 30, color: '#C29A4B', cruda: false },
    { id: 'g3', nombre: 'Zanahoria', parts: 20, color: '#D98A3D', cruda: false },
  ],
}

export function useMascota() {
  const pet = ref<PetConfig>({
    ...DEFAULT_PET,
    ingredientes: DEFAULT_PET.ingredientes.map((g) => ({ ...g })),
  })
  const petConfigured = ref(false)

  onMounted(async () => {
    try {
      const stored = await dexieStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored) as PersistedState
        pet.value = data.pet
        petConfigured.value = data.petConfigured
      }
    } catch {
      // noop
    }
  })

  watch(
    [pet, petConfigured],
    async () => {
      try {
        const state: PersistedState = { pet: pet.value, petConfigured: petConfigured.value }
        await dexieStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch {
        // noop
      }
    },
    { deep: true },
  )

  const totalParts = computed(
    () => pet.value.ingredientes.reduce((a, g) => a + g.parts, 0) || 1,
  )

  const racionMeal = computed(() => pet.value.racion / Math.max(1, pet.value.comidas))

  const ingView = computed<IngredienteView[]>(() =>
    pet.value.ingredientes.map((g) => {
      const gramsDia = pet.value.racion * (g.parts / totalParts.value)
      const pct = Math.round((g.parts / totalParts.value) * 100)
      return {
        id: g.id,
        nombre: g.nombre,
        color: g.color,
        parts: g.parts,
        cruda: g.cruda,
        gramsDiaStr: fmtG(gramsDia),
        gramsMealStr: fmtG(gramsDia / Math.max(1, pet.value.comidas)),
        pctStr: pct + '%',
        pctW: pct + '%',
      }
    }),
  )

  const mealsView = computed<MealView[]>(() => {
    const names =
      MEAL_NAMES[pet.value.comidas] ??
      Array.from({ length: pet.value.comidas }, (_, i) => 'Comida ' + (i + 1))
    return names.map((nombre, i) => ({
      nombre,
      dot: MEAL_DOTS[i % MEAL_DOTS.length] ?? '#E7B84B',
      gramsStr: fmtG(racionMeal.value),
    }))
  })

  const crudaDia = computed(() =>
    pet.value.ingredientes
      .filter((g) => g.cruda)
      .reduce((a, g) => a + pet.value.racion * (g.parts / totalParts.value), 0),
  )

  const dias = computed(() => pet.value.semanas * 7)
  const hayCruda = computed(() => crudaDia.value > 0)

  const petRacionStr = computed(() => fmtG(pet.value.racion))
  const petMealStr = computed(() => fmtG(racionMeal.value))
  const petSemanasStr = computed(() => {
    const s = pet.value.semanas
    return s + (s === 1 ? ' semana' : ' semanas')
  })
  const petDiasStr = computed(() => dias.value + ' días')
  const crudaDiaStr = computed(() => fmtG(crudaDia.value))
  const crudaPeriodoStr = computed(() => fmtG(crudaDia.value * dias.value))
  const crudaSemanaStr = computed(() => fmtG(crudaDia.value * 7))
  const crudaMesStr = computed(() => fmtG(crudaDia.value * 30))

  const canGenerate = computed(
    () =>
      (pet.value.nombre ?? '').trim().length > 0 &&
      pet.value.racion > 0 &&
      pet.value.ingredientes.length > 0,
  )

  function setPet<K extends keyof PetConfig>(field: K, value: PetConfig[K]): void {
    pet.value = { ...pet.value, [field]: value }
  }

  function setPetIng<K extends keyof Ingrediente>(id: string, field: K, value: Ingrediente[K]): void {
    pet.value = {
      ...pet.value,
      ingredientes: pet.value.ingredientes.map((g) =>
        g.id === id ? { ...g, [field]: value } : g,
      ),
    }
  }

  function bumpIng(id: string, delta: number): void {
    pet.value = {
      ...pet.value,
      ingredientes: pet.value.ingredientes.map((g) =>
        g.id === id ? { ...g, parts: Math.max(0, g.parts + delta) } : g,
      ),
    }
  }

  function addIng(): void {
    const color = PALETTE[pet.value.ingredientes.length % PALETTE.length] ?? '#5B8C5A'
    pet.value = {
      ...pet.value,
      ingredientes: [
        ...pet.value.ingredientes,
        { id: uid(), nombre: 'Nuevo alimento', parts: 10, color, cruda: false },
      ],
    }
  }

  function delIng(id: string): void {
    pet.value = {
      ...pet.value,
      ingredientes: pet.value.ingredientes.filter((g) => g.id !== id),
    }
  }

  function generarPlan(): void {
    if (!canGenerate.value) return
    petConfigured.value = true
  }

  function editarPlan(): void {
    petConfigured.value = false
  }

  return {
    pet,
    petConfigured,
    canGenerate,
    ingView,
    mealsView,
    crudaDia,
    hayCruda,
    dias,
    racionMeal,
    petRacionStr,
    petMealStr,
    petSemanasStr,
    petDiasStr,
    crudaDiaStr,
    crudaPeriodoStr,
    crudaSemanaStr,
    crudaMesStr,
    setPet,
    setPetIng,
    bumpIng,
    addIng,
    delIng,
    generarPlan,
    editarPlan,
  }
}
