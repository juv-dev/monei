<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, Plus, X, Pencil } from 'lucide-vue-next'
import { useMascota } from '../composables/useMascota'
import type { NumComidas, NumSemanas } from '../composables/useMascota'
import { ROUTE_NAMES } from '~/router'

const router = useRouter()

const {
  pet,
  petConfigured,
  canGenerate,
  ingView,
  mealsView,
  hayCruda,
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
} = useMascota()

function goBack(): void {
  router.push({ name: ROUTE_NAMES.CONFIGURACION })
}

function setNombre(e: Event): void {
  setPet('nombre', (e.target as HTMLInputElement).value)
}

function setRacion(e: Event): void {
  setPet('racion', Math.max(0, parseInt((e.target as HTMLInputElement).value) || 0))
}

function setIngNombre(id: string, e: Event): void {
  setPetIng(id, 'nombre', (e.target as HTMLInputElement).value)
}

function segStyle(active: boolean): Record<string, string> {
  const base: Record<string, string> = {
    flex: '1',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: '700',
    padding: '9px 8px',
    borderRadius: '11px',
    transition: 'all .2s',
  }
  if (active) {
    return { ...base, background: '#fff', color: '#1C1A15', boxShadow: '0 1px 3px rgba(28,26,21,.14)' }
  }
  return { ...base, background: 'transparent', color: '#9A9384' }
}

function chipStyle(active: boolean, color: string): Record<string, string> {
  const base: Record<string, string> = {
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '12px',
    fontWeight: '700',
    padding: '7px 14px',
    borderRadius: '999px',
    whiteSpace: 'nowrap',
    transition: 'all .2s',
  }
  if (active) {
    return { ...base, background: color, color: '#fff', boxShadow: `0 2px 8px -2px ${color}` }
  }
  return { ...base, background: '#fff', color: '#8C8578', border: '1px solid #E7E0D2' }
}

function crudaChipStyle(cruda: boolean): Record<string, string> {
  if (cruda) {
    return {
      fontSize: '10px',
      fontWeight: '700',
      padding: '4px 9px',
      borderRadius: '999px',
      cursor: 'pointer',
      border: 'none',
      background: '#C0584C',
      color: '#fff',
    }
  }
  return {
    fontSize: '10px',
    fontWeight: '700',
    padding: '4px 9px',
    borderRadius: '999px',
    cursor: 'pointer',
    border: '1px solid #E7E0D2',
    background: '#fff',
    color: '#9A9384',
  }
}

const genBtnStyle = computed<Record<string, string>>(() => {
  if (canGenerate.value) {
    return {
      width: '100%',
      border: 'none',
      cursor: 'pointer',
      background: 'linear-gradient(135deg,#D08A4A,#8A6840)',
      color: '#fff',
      borderRadius: '16px',
      padding: '15px',
      fontFamily: 'inherit',
      fontSize: '14px',
      fontWeight: '700',
      boxShadow: '0 8px 18px -6px rgba(138,104,64,.5)',
    }
  }
  return {
    width: '100%',
    border: 'none',
    cursor: 'not-allowed',
    background: '#E0D9CB',
    color: '#A89F8C',
    borderRadius: '16px',
    padding: '15px',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: '700',
    boxShadow: 'none',
  }
})
</script>

<template>
  <div style="background:#F1ECE1; font-family:'Manrope',system-ui,sans-serif; color:#1C1A15; min-height:100vh">
    <div class="mx-auto w-full max-w-[460px] px-[18px] pt-[18px] pb-28">

      <div class="flex items-center" style="gap:12px; margin-bottom:18px">
        <button
          type="button"
          data-testid="btn-back"
          class="flex items-center justify-center shrink-0"
          style="width:38px; height:38px; border:1px solid #E7E0D2; background:#fff; border-radius:12px; cursor:pointer"
          aria-label="Volver a configuración"
          @click="goBack"
        >
          <ChevronLeft :size="18" style="color:#5A5448" aria-hidden="true" />
        </button>
        <div style="flex:1; min-width:0">
          <p style="margin:0; font-size:22px; font-weight:800; letter-spacing:-.025em">Plan alimenticio</p>
          <p style="margin:2px 0 0; font-size:12px; color:#9A9384; font-weight:500">Dieta cruda · BARF</p>
        </div>
        <div
          class="flex items-center justify-center shrink-0"
          style="width:40px; height:40px; border-radius:12px; background:linear-gradient(140deg,#C8AA72,#8A6840)"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
            <circle cx="6" cy="10" r="2.1" />
            <circle cx="10.5" cy="6.5" r="2.1" />
            <circle cx="15.5" cy="6.5" r="2.1" />
            <circle cx="19" cy="11" r="2" />
            <path d="M12.5 12.2c-2.4 0-4.4 1.7-5.1 3.7-.5 1.5.7 2.9 2.3 2.9.9 0 1.7-.4 2.8-.4s1.9.4 2.8.4c1.6 0 2.8-1.4 2.3-2.9-.7-2-2.7-3.7-5.1-3.7z" />
          </svg>
        </div>
      </div>

      <div v-if="!petConfigured" data-testid="mascota-wizard">

        <div style="background:linear-gradient(150deg,#26241C,#141309); border-radius:18px; padding:16px 18px; margin-bottom:14px; color:#F1ECE1">
          <p style="margin:0; font-size:13px; font-weight:700">Contanos sobre tu mascota 🐾</p>
          <p style="margin:4px 0 0; font-size:11.5px; color:rgba(241,236,225,.66); line-height:1.45">Respondé estas preguntas y armamos su ración diaria y la lista de compra de carne cruda.</p>
        </div>

        <div
          data-testid="q1"
          style="background:#fff; border:1px solid #E7E0D2; border-radius:18px; padding:16px; margin-bottom:11px; box-shadow:0 1px 3px rgba(28,26,21,.05)"
        >
          <div class="flex items-center" style="gap:8px; margin-bottom:12px">
            <span
              class="flex items-center justify-center shrink-0"
              style="width:20px; height:20px; border-radius:50%; background:#F4EEDF; color:#B8893A; font-size:11px; font-weight:800; font-family:'Space Grotesk',sans-serif"
            >1</span>
            <p style="margin:0; font-size:13px; font-weight:800">¿Cómo se llama y qué es?</p>
          </div>
          <input
            type="text"
            data-testid="input-nombre"
            placeholder="Nombre de tu mascota"
            :value="pet.nombre"
            style="width:100%; box-sizing:border-box; border:1px solid #E7E0D2; background:#FBF9F4; border-radius:13px; padding:13px; font-family:inherit; font-size:15px; color:#1C1A15; outline:none; margin-bottom:10px"
            aria-label="Nombre de la mascota"
            @input="setNombre"
          />
          <div class="flex" style="gap:5px; background:#F1ECE1; border-radius:13px; padding:4px">
            <button
              type="button"
              :style="segStyle(pet.tipo === 'perro')"
              :aria-pressed="pet.tipo === 'perro'"
              @click="setPet('tipo', 'perro')"
            >🐶 Perro</button>
            <button
              type="button"
              :style="segStyle(pet.tipo === 'gato')"
              :aria-pressed="pet.tipo === 'gato'"
              @click="setPet('tipo', 'gato')"
            >🐱 Gato</button>
          </div>
        </div>

        <div
          data-testid="q2"
          style="background:#fff; border:1px solid #E7E0D2; border-radius:18px; padding:16px; margin-bottom:11px; box-shadow:0 1px 3px rgba(28,26,21,.05)"
        >
          <div class="flex items-center" style="gap:8px; margin-bottom:12px">
            <span
              class="flex items-center justify-center shrink-0"
              style="width:20px; height:20px; border-radius:50%; background:#F4EEDF; color:#B8893A; font-size:11px; font-weight:800; font-family:'Space Grotesk',sans-serif"
            >2</span>
            <p style="margin:0; font-size:13px; font-weight:800">¿Cuánto come al día?</p>
          </div>
          <div class="flex items-center" style="gap:9px; margin-bottom:11px">
            <input
              type="number"
              inputmode="numeric"
              data-testid="input-racion"
              :value="pet.racion"
              style="flex:1; min-width:0; box-sizing:border-box; border:1px solid #E7E0D2; background:#FBF9F4; border-radius:13px; padding:13px; font-family:'Space Grotesk',sans-serif; font-size:18px; font-weight:600; color:#1C1A15; outline:none"
              aria-label="Ración en gramos por día"
              @input="setRacion"
            />
            <span style="font-size:13px; font-weight:700; color:#9A9384">gramos / día</span>
          </div>
          <div class="flex" style="gap:7px">
            <button type="button" :style="chipStyle(pet.racion === 200, '#B8893A')" @click="setPet('racion', 200)">Pequeño 200</button>
            <button type="button" :style="chipStyle(pet.racion === 400, '#B8893A')" @click="setPet('racion', 400)">Mediano 400</button>
            <button type="button" :style="chipStyle(pet.racion === 700, '#B8893A')" @click="setPet('racion', 700)">Grande 700</button>
          </div>
        </div>

        <div
          data-testid="q3"
          style="background:#fff; border:1px solid #E7E0D2; border-radius:18px; padding:16px; margin-bottom:11px; box-shadow:0 1px 3px rgba(28,26,21,.05)"
        >
          <div class="flex items-center" style="gap:8px; margin-bottom:12px">
            <span
              class="flex items-center justify-center shrink-0"
              style="width:20px; height:20px; border-radius:50%; background:#F4EEDF; color:#B8893A; font-size:11px; font-weight:800; font-family:'Space Grotesk',sans-serif"
            >3</span>
            <p style="margin:0; font-size:13px; font-weight:800">¿Cuántas comidas al día?</p>
          </div>
          <div class="flex" style="gap:5px; background:#F1ECE1; border-radius:13px; padding:4px">
            <button type="button" :style="segStyle(pet.comidas === 2)" @click="setPet('comidas', 2 as NumComidas)">2</button>
            <button type="button" :style="segStyle(pet.comidas === 3)" @click="setPet('comidas', 3 as NumComidas)">3</button>
            <button type="button" :style="segStyle(pet.comidas === 4)" @click="setPet('comidas', 4 as NumComidas)">4</button>
          </div>
        </div>

        <div
          data-testid="q4"
          style="background:#fff; border:1px solid #E7E0D2; border-radius:18px; padding:16px; margin-bottom:11px; box-shadow:0 1px 3px rgba(28,26,21,.05)"
        >
          <div class="flex items-center" style="gap:8px; margin-bottom:5px">
            <span
              class="flex items-center justify-center shrink-0"
              style="width:20px; height:20px; border-radius:50%; background:#F4EEDF; color:#B8893A; font-size:11px; font-weight:800; font-family:'Space Grotesk',sans-serif"
            >4</span>
            <p style="margin:0; font-size:13px; font-weight:800">¿Qué come?</p>
          </div>
          <p style="margin:0 0 12px 28px; font-size:11px; color:#9A9384">Ajustá la proporción de cada alimento. Marcá "Cruda" la carne para la lista de compra.</p>

          <div v-for="g in ingView" :key="g.id" class="flex items-center" style="gap:9px; padding:9px 0; border-top:1px solid #F4EFE5">
            <span
              class="shrink-0"
              :style="{ width: '10px', height: '10px', borderRadius: '3px', background: g.color, display: 'block' }"
            ></span>
            <input
              type="text"
              :value="g.nombre"
              style="flex:1; min-width:0; border:none; background:none; font-family:inherit; font-size:13px; font-weight:700; color:#1C1A15; outline:none; padding:4px 0"
              :aria-label="`Nombre del alimento ${g.nombre}`"
              @input="setIngNombre(g.id, $event)"
            />
            <button
              type="button"
              :style="crudaChipStyle(g.cruda)"
              :aria-pressed="g.cruda"
              :aria-label="g.cruda ? `Marcar ${g.nombre} como no cruda` : `Marcar ${g.nombre} como cruda`"
              @click="setPetIng(g.id, 'cruda', !g.cruda)"
            >Cruda</button>
            <div class="flex items-center" style="gap:6px; background:#F4EFE5; border-radius:999px; padding:3px">
              <button
                type="button"
                class="flex items-center justify-center"
                style="width:24px; height:24px; border:none; border-radius:50%; background:#fff; cursor:pointer; font-size:15px; font-weight:700; color:#5A5448"
                :aria-label="`Reducir proporción de ${g.nombre}`"
                @click="bumpIng(g.id, -5)"
              >−</button>
              <span style="font-family:'Space Grotesk',sans-serif; font-size:12px; font-weight:600; min-width:34px; text-align:center">{{ g.pctStr }}</span>
              <button
                type="button"
                class="flex items-center justify-center"
                style="width:24px; height:24px; border:none; border-radius:50%; background:#fff; cursor:pointer; font-size:15px; font-weight:700; color:#5A5448"
                :aria-label="`Aumentar proporción de ${g.nombre}`"
                @click="bumpIng(g.id, 5)"
              >+</button>
            </div>
            <button
              type="button"
              style="border:none; background:none; cursor:pointer; padding:2px; flex-shrink:0"
              :aria-label="`Eliminar ${g.nombre}`"
              @click="delIng(g.id)"
            >
              <X :size="15" style="color:#C9B9A0" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            class="flex items-center w-full"
            style="gap:7px; border:none; background:none; cursor:pointer; padding:12px 0 2px; font-family:inherit; font-size:13px; font-weight:700; color:#B8893A"
            @click="addIng"
          >
            <Plus :size="15" style="color:#B8893A" aria-hidden="true" />
            Agregar alimento
          </button>
        </div>

        <div
          data-testid="q5"
          style="background:#fff; border:1px solid #E7E0D2; border-radius:18px; padding:16px; margin-bottom:16px; box-shadow:0 1px 3px rgba(28,26,21,.05)"
        >
          <div class="flex items-center" style="gap:8px; margin-bottom:12px">
            <span
              class="flex items-center justify-center shrink-0"
              style="width:20px; height:20px; border-radius:50%; background:#F4EEDF; color:#B8893A; font-size:11px; font-weight:800; font-family:'Space Grotesk',sans-serif"
            >5</span>
            <p style="margin:0; font-size:13px; font-weight:800">¿Para cuántas semanas comprás?</p>
          </div>
          <div class="flex" style="gap:5px; background:#F1ECE1; border-radius:13px; padding:4px">
            <button type="button" :style="segStyle(pet.semanas === 1)" @click="setPet('semanas', 1 as NumSemanas)">1 sem</button>
            <button type="button" :style="segStyle(pet.semanas === 2)" @click="setPet('semanas', 2 as NumSemanas)">2 sem</button>
            <button type="button" :style="segStyle(pet.semanas === 4)" @click="setPet('semanas', 4 as NumSemanas)">4 sem</button>
          </div>
        </div>

        <button
          type="button"
          data-testid="btn-generar"
          :disabled="!canGenerate"
          :style="genBtnStyle"
          @click="generarPlan"
        >Generar plan</button>

      </div>

      <div v-if="petConfigured" data-testid="mascota-result">

        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:18px">
          <div style="background:#fff; border:1px solid #E7E0D2; border-radius:16px; padding:14px">
            <p style="margin:0; font-size:10px; font-weight:700; letter-spacing:.05em; color:#9A9384; text-transform:uppercase">Ración/día</p>
            <p style="margin:7px 0 0; font-family:'Space Grotesk',sans-serif; font-size:20px; font-weight:600; letter-spacing:-.02em">{{ petRacionStr }}</p>
          </div>
          <div style="background:#fff; border:1px solid #E7E0D2; border-radius:16px; padding:14px">
            <p style="margin:0; font-size:10px; font-weight:700; letter-spacing:.05em; color:#9A9384; text-transform:uppercase">Comidas</p>
            <p style="margin:7px 0 0; font-family:'Space Grotesk',sans-serif; font-size:20px; font-weight:600; letter-spacing:-.02em">{{ pet.comidas }}</p>
          </div>
          <div style="background:#fff; border:1px solid #E7E0D2; border-radius:16px; padding:14px">
            <p style="margin:0; font-size:10px; font-weight:700; letter-spacing:.05em; color:#9A9384; text-transform:uppercase">Por ración</p>
            <p style="margin:7px 0 0; font-family:'Space Grotesk',sans-serif; font-size:20px; font-weight:600; letter-spacing:-.02em">{{ petMealStr }}</p>
          </div>
        </div>

        <p style="margin:0 2px 11px; font-size:15px; font-weight:800; letter-spacing:-.01em">Cada comida</p>
        <div style="background:#fff; border:1px solid #E7E0D2; border-radius:18px; padding:6px 16px; margin-bottom:18px; box-shadow:0 1px 3px rgba(28,26,21,.05)">
          <div
            v-for="(m, i) in mealsView"
            :key="m.nombre"
            class="flex items-center justify-between"
            :style="{ padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid #F4EFE5' }"
          >
            <span class="flex items-center" style="gap:9px; font-size:13px; font-weight:700">
              <span :style="{ width: '9px', height: '9px', borderRadius: '50%', background: m.dot, display: 'inline-block', flexShrink: '0' }"></span>
              {{ m.nombre }}
            </span>
            <span style="font-family:'Space Grotesk',sans-serif; font-size:14px; font-weight:600">{{ m.gramsStr }}</span>
          </div>
        </div>

        <p style="margin:0 2px 11px; font-size:15px; font-weight:800; letter-spacing:-.01em">Composición del día</p>
        <div style="background:#fff; border:1px solid #E7E0D2; border-radius:18px; padding:16px; margin-bottom:18px; box-shadow:0 1px 3px rgba(28,26,21,.05)">
          <div v-for="g in ingView" :key="g.id" style="margin-bottom:13px">
            <div class="flex items-center justify-between" style="margin-bottom:6px">
              <span class="flex items-center" style="gap:8px; font-size:13px; font-weight:700">
                <span :style="{ width: '10px', height: '10px', borderRadius: '3px', background: g.color, display: 'inline-block', flexShrink: '0' }"></span>
                {{ g.nombre }}
                <span
                  :style="{
                    fontSize: '9px',
                    fontWeight: '700',
                    borderRadius: '999px',
                    padding: '2px 7px',
                    background: g.cruda ? '#FBE9E6' : '#EAF6F0',
                    color: g.cruda ? '#C0584C' : '#1E9E6A',
                  }"
                >{{ g.cruda ? 'Cruda' : 'Cocida' }}</span>
              </span>
              <span style="font-family:'Space Grotesk',sans-serif; font-size:13px; font-weight:600">
                {{ g.gramsDiaStr }}
                <span style="color:#9A9384; font-weight:500"> · {{ g.pctStr }}</span>
              </span>
            </div>
            <div style="height:8px; border-radius:999px; background:#F0EBE0; overflow:hidden">
              <div :style="{ height: '100%', width: g.pctW, borderRadius: '999px', background: g.color }"></div>
            </div>
            <p style="margin:6px 0 0; font-size:11px; color:#9A9384; font-weight:600">
              <span style="font-family:'Space Grotesk',sans-serif; color:#5A5448; font-weight:700">{{ g.gramsMealStr }}</span>
              por ración
            </p>
          </div>
        </div>

        <template v-if="hayCruda">
          <p style="margin:0 2px 11px; font-size:15px; font-weight:800; letter-spacing:-.01em">Carne cruda a comprar</p>
          <div
            class="relative overflow-hidden"
            style="border-radius:20px; padding:20px 22px; background:linear-gradient(145deg,#C0584C 0%,#8E342B 100%); color:#FCEFEC; box-shadow:0 14px 30px -14px rgba(142,52,43,.6); margin-bottom:11px"
          >
            <div
              class="absolute pointer-events-none"
              style="top:-40px; right:-30px; width:150px; height:150px; border-radius:50%; background:radial-gradient(circle,rgba(255,255,255,.14),transparent 70%)"
            ></div>
            <div class="relative">
              <p style="margin:0; font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:rgba(252,239,236,.72)">Para {{ petSemanasStr }}</p>
              <p style="margin:7px 0 0; font-family:'Space Grotesk',sans-serif; font-size:38px; font-weight:600; letter-spacing:-.03em; line-height:1">{{ crudaPeriodoStr }}</p>
              <p style="margin:9px 0 0; font-size:12px; color:rgba(252,239,236,.8); font-weight:500">{{ crudaDiaStr }} de carne al día · {{ petDiasStr }}</p>
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:18px">
            <div style="background:#fff; border:1px solid #E7E0D2; border-radius:15px; padding:13px 15px">
              <p style="margin:0; font-size:11px; color:#9A9384; font-weight:700">1 semana</p>
              <p style="margin:5px 0 0; font-family:'Space Grotesk',sans-serif; font-size:18px; font-weight:600; letter-spacing:-.02em">{{ crudaSemanaStr }}</p>
            </div>
            <div style="background:#fff; border:1px solid #E7E0D2; border-radius:15px; padding:13px 15px">
              <p style="margin:0; font-size:11px; color:#9A9384; font-weight:700">1 mes (30 días)</p>
              <p style="margin:5px 0 0; font-family:'Space Grotesk',sans-serif; font-size:18px; font-weight:600; letter-spacing:-.02em">{{ crudaMesStr }}</p>
            </div>
          </div>
        </template>

        <button
          type="button"
          data-testid="btn-editar"
          class="w-full flex items-center justify-center"
          style="gap:8px; border:1px solid #E7E0D2; cursor:pointer; background:#fff; color:#5A5448; border-radius:16px; padding:14px; font-family:inherit; font-size:13px; font-weight:700"
          @click="editarPlan"
        >
          <Pencil :size="16" style="color:#5A5448" aria-hidden="true" />
          Editar respuestas
        </button>

      </div>

    </div>
  </div>
</template>
