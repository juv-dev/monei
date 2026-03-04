import { describe, it, expect } from 'vitest'
import { formatMoneyDisplay, parseMoneyInput, onDecimalInput, onIntInput } from '~/shared/utils/format'

describe('should formatMoneyDisplay', () => {
  it('should return empty string for empty input', () => {
    expect(formatMoneyDisplay('')).toBe('')
    expect(formatMoneyDisplay('  ')).toBe('')
  })

  it('should format plain integer with thousand separators', () => {
    expect(formatMoneyDisplay('40000')).toBe('40,000')
    expect(formatMoneyDisplay('1000000')).toBe('1,000,000')
  })

  it('should format decimal numbers', () => {
    expect(formatMoneyDisplay('40000.50')).toBe('40,000.50')
    expect(formatMoneyDisplay('584.35')).toBe('584.35')
  })

  it('should handle American notation (comma = thousands)', () => {
    expect(formatMoneyDisplay('1,000.50')).toBe('1,000.50')
    expect(formatMoneyDisplay('40,000.50')).toBe('40,000.50')
  })

  it('should handle European notation (dot = thousands, comma = decimal)', () => {
    expect(formatMoneyDisplay('1.000,50')).toBe('1,000.50')
  })

  it('should handle dot as thousands separator (21.988 → 21,988)', () => {
    expect(formatMoneyDisplay('21.988')).toBe('21,988')
  })

  it('should handle multiple dots as thousands (1.000.000)', () => {
    expect(formatMoneyDisplay('1.000.000')).toBe('1,000,000')
  })

  it('should handle mixed multiple dots with decimal (17.999.58)', () => {
    expect(formatMoneyDisplay('17.999.58')).toBe('17,999.58')
  })

  it('should handle single comma as decimal', () => {
    expect(formatMoneyDisplay('584,35')).toBe('584.35')
  })

  it('should handle multiple commas as thousands', () => {
    expect(formatMoneyDisplay('1,000,000')).toBe('1,000,000')
  })

  it('should handle comma as thousands separator (1,000 → 1,000)', () => {
    expect(formatMoneyDisplay('1,000')).toBe('1,000')
  })

  it('should strip non-numeric characters', () => {
    expect(formatMoneyDisplay('S/ 1,200.50')).toBe('1,200.50')
  })

  it('should handle numeric input', () => {
    expect(formatMoneyDisplay(1500)).toBe('1,500')
    expect(formatMoneyDisplay(0)).toBe('0')
  })

  it('should handle decimal-only input like .5', () => {
    expect(formatMoneyDisplay('.5')).toBe('0.5')
    expect(formatMoneyDisplay('.99')).toBe('0.99')
  })

  it('should handle small numbers without separators', () => {
    expect(formatMoneyDisplay('100')).toBe('100')
    expect(formatMoneyDisplay('0')).toBe('0')
  })

  it('should handle no digits', () => {
    expect(formatMoneyDisplay('abc')).toBe('')
  })
})

describe('should parseMoneyInput', () => {
  it('should parse plain numbers', () => {
    expect(parseMoneyInput('1000')).toBe(1000)
    expect(parseMoneyInput('584.35')).toBe(584.35)
  })

  it('should parse American format (comma = thousands)', () => {
    expect(parseMoneyInput('1,000.50')).toBe(1000.5)
    expect(parseMoneyInput('40,000.50')).toBe(40000.5)
  })

  it('should parse European format (dot = thousands, comma = decimal)', () => {
    expect(parseMoneyInput('1.000,50')).toBe(1000.5)
  })

  it('should parse dot-as-thousands (21.988 → 21988)', () => {
    expect(parseMoneyInput('21.988')).toBe(21988)
  })

  it('should parse multiple dots as thousands (1.000.000)', () => {
    expect(parseMoneyInput('1.000.000')).toBe(1000000)
  })

  it('should parse mixed dots with decimal (17.999.58)', () => {
    expect(parseMoneyInput('17.999.58')).toBe(17999.58)
  })

  it('should parse comma as decimal separator', () => {
    expect(parseMoneyInput('584,35')).toBe(584.35)
  })

  it('should parse multiple commas as thousands', () => {
    expect(parseMoneyInput('1,000,000')).toBe(1000000)
  })

  it('should handle numeric input', () => {
    expect(parseMoneyInput(1500)).toBe(1500)
  })

  it('should strip non-numeric characters', () => {
    expect(parseMoneyInput('S/ 1,200.50')).toBe(1200.5)
  })

  it('should return NaN for empty input', () => {
    expect(parseMoneyInput('')).toBeNaN()
  })
})

describe('should onDecimalInput', () => {
  it('should strip non-numeric characters and call setter', () => {
    const el = document.createElement('input')
    el.value = 'abc123.45,67'
    const event = new Event('input')
    Object.defineProperty(event, 'target', { value: el })

    let result = ''
    onDecimalInput(event, (v) => (result = v))

    expect(el.value).toBe('123.45,67')
    expect(result).toBe('123.45,67')
  })

  it('should handle clean numeric input', () => {
    const el = document.createElement('input')
    el.value = '1500.00'
    const event = new Event('input')
    Object.defineProperty(event, 'target', { value: el })

    let result = ''
    onDecimalInput(event, (v) => (result = v))

    expect(result).toBe('1500.00')
  })
})

describe('should onIntInput', () => {
  it('should strip non-digit characters and call setter', () => {
    const el = document.createElement('input')
    el.value = '12abc34'
    const event = new Event('input')
    Object.defineProperty(event, 'target', { value: el })

    let result = ''
    onIntInput(event, (v) => (result = v))

    expect(el.value).toBe('1234')
    expect(result).toBe('1234')
  })

  it('should strip dots and commas', () => {
    const el = document.createElement('input')
    el.value = '1,000.50'
    const event = new Event('input')
    Object.defineProperty(event, 'target', { value: el })

    let result = ''
    onIntInput(event, (v) => (result = v))

    expect(result).toBe('100050')
  })
})
