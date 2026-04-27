import { ref, computed } from 'vue'

const _now = new Date()
const selectedYear = ref(_now.getFullYear())
const selectedMonth = ref(_now.getMonth() + 1) // 1-12

export function useSelectedMonth() {
  const isCurrentMonth = computed(() => {
    const now = new Date()
    return selectedYear.value === now.getFullYear() && selectedMonth.value === (now.getMonth() + 1)
  })

  const monthLabel = computed(() =>
    new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(
      new Date(selectedYear.value, selectedMonth.value - 1, 1),
    ),
  )

  function prevMonth() {
    if (selectedMonth.value === 1) {
      selectedMonth.value = 12
      selectedYear.value--
    } else {
      selectedMonth.value--
    }
  }

  function nextMonth() {
    if (selectedMonth.value === 12) {
      selectedMonth.value = 1
      selectedYear.value++
    } else {
      selectedMonth.value++
    }
  }

  return { selectedYear, selectedMonth, isCurrentMonth, monthLabel, prevMonth, nextMonth }
}
