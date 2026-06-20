import { describe, it, expect, beforeEach } from 'vitest'
import { useSelectedMonth } from '~/shared/composables/useSelectedMonth'

describe('should useSelectedMonth', () => {
  beforeEach(() => {
    const { selectedYear, selectedMonth } = useSelectedMonth()
    const now = new Date()
    selectedYear.value = now.getFullYear()
    selectedMonth.value = now.getMonth() + 1
  })

  it('should return current month and year on initialization', () => {
    const { selectedYear, selectedMonth } = useSelectedMonth()
    const now = new Date()
    expect(selectedYear.value).toBe(now.getFullYear())
    expect(selectedMonth.value).toBe(now.getMonth() + 1)
  })

  it('should report isCurrentMonth as true when on current month', () => {
    const { isCurrentMonth } = useSelectedMonth()
    expect(isCurrentMonth.value).toBe(true)
  })

  it('should report isCurrentMonth as false after prevMonth', () => {
    const { isCurrentMonth, prevMonth } = useSelectedMonth()
    prevMonth()
    expect(isCurrentMonth.value).toBe(false)
  })

  it('should report isCurrentMonth as false after nextMonth', () => {
    const { selectedYear, selectedMonth, isCurrentMonth, nextMonth } = useSelectedMonth()
    selectedYear.value = 2020
    selectedMonth.value = 1
    nextMonth()
    expect(isCurrentMonth.value).toBe(false)
  })

  it('should compute a non-empty monthLabel', () => {
    const { monthLabel } = useSelectedMonth()
    expect(monthLabel.value.length).toBeGreaterThan(0)
  })

  it('should update monthLabel after navigating', () => {
    const { monthLabel, prevMonth } = useSelectedMonth()
    const before = monthLabel.value
    prevMonth()
    expect(monthLabel.value).not.toBe(before)
  })

  it('should decrement month when prevMonth is called mid-year', () => {
    const { selectedMonth, prevMonth } = useSelectedMonth()
    selectedMonth.value = 6
    prevMonth()
    expect(selectedMonth.value).toBe(5)
  })

  it('should wrap to December and decrement year when prevMonth is called in January', () => {
    const { selectedYear, selectedMonth, prevMonth } = useSelectedMonth()
    const currentYear = selectedYear.value
    selectedMonth.value = 1
    prevMonth()
    expect(selectedMonth.value).toBe(12)
    expect(selectedYear.value).toBe(currentYear - 1)
  })

  it('should increment month when nextMonth is called mid-year', () => {
    const { selectedMonth, nextMonth } = useSelectedMonth()
    selectedMonth.value = 6
    nextMonth()
    expect(selectedMonth.value).toBe(7)
  })

  it('should wrap to January and increment year when nextMonth is called in December', () => {
    const { selectedYear, selectedMonth, nextMonth } = useSelectedMonth()
    const currentYear = selectedYear.value
    selectedMonth.value = 12
    nextMonth()
    expect(selectedMonth.value).toBe(1)
    expect(selectedYear.value).toBe(currentYear + 1)
  })

  it('should navigate back and forth and return to same month', () => {
    const { selectedMonth, prevMonth, nextMonth } = useSelectedMonth()
    const initial = selectedMonth.value
    prevMonth()
    nextMonth()
    expect(selectedMonth.value).toBe(initial)
  })
})
