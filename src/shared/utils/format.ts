/**
 * Normalize a numeric string to a canonical form (digits + at most one dot for decimal).
 * Handles American notation (1,000.50), European notation (1.000,50), and
 * ambiguous dot-as-thousands (21.988, 17.999.58).
 */
function normalizeNumericString(s: string): string {
  const hasDot = s.includes('.')
  const hasComma = s.includes(',')

  if (hasDot && hasComma) {
    // Both present: whichever comes LAST is the decimal separator
    const lastDot = s.lastIndexOf('.')
    const lastComma = s.lastIndexOf(',')
    if (lastComma > lastDot) {
      // European: 1.000,50 → dot = thousands, comma = decimal
      return s.replace(/\./g, '').replace(',', '.')
    }
    // American: 1,000.50 → comma = thousands, dot = decimal
    return s.replace(/,/g, '')
  }

  const dotCount = (s.match(/\./g) || []).length

  if (dotCount > 1) {
    // Multiple dots: all but last may be thousands separators
    const parts = s.split('.')
    const lastPart = parts[parts.length - 1]
    // If last segment is 3 digits, all dots are thousands: 1.000.000
    // Otherwise last dot is decimal: 17.999.58
    return lastPart.length === 3
      ? parts.join('')
      : parts.slice(0, -1).join('') + '.' + lastPart
  }

  if (dotCount === 1) {
    // Single dot, no comma: dot is thousands separator when followed by exactly 3 digits
    // Inside dotCount===1, split('.')[1] always exists
    const afterDot = s.split('.')[1]!
    if (afterDot.length === 3) return s.replace('.', '') // 21.988 → 21988
    return s // decimal point: 584.35
  }

  // Only commas (no dots)
  const commaCount = (s.match(/,/g) || []).length
  if (commaCount > 1) {
    // Multiple commas: all are thousands separators: 1,000,000
    return s.replace(/,/g, '')
  }
  if (commaCount === 1) {
    // Inside commaCount===1, split(',')[1] always exists
    const afterComma = s.split(',')[1]!
    // Comma followed by 3 digits → thousands separator: 1,000 → 1000
    // Otherwise → decimal separator (European): 584,35 → 584.35
    return afterComma.length === 3 ? s.replace(',', '') : s.replace(',', '.')
  }

  return s
}

/**
 * Format a raw numeric string with thousand separators.
 * Handles American (1,000.50) and European (1.000,50 or 21.988) notation.
 * Output is always American format: comma = thousands, dot = decimal.
 * Examples: "21.988" → "21,988" | "17.999.58" → "17,999.58" | "40000.50" → "40,000.50"
 */
export function formatMoneyDisplay(value: string | number): string {
  const raw = String(value).trim().replace(/[^\d.,]/g, '')
  if (!raw) return ''

  const normalized = normalizeNumericString(raw)

  const parts = normalized.split('.')
  const intFormatted = (parts[0] || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.length > 1 ? `${intFormatted}.${parts[1]}` : intFormatted
}

/**
 * Strip separators and parse to float.
 * Handles American (1,000.50) and European (1.000,50 or 21.988 or 17.999.58) notation.
 * Examples: "21.988" → 21988 | "17.999.58" → 17999.58 | "40,000.50" → 40000.5
 */
export function parseMoneyInput(value: string | number): number {
  const s = String(value).trim().replace(/[^\d.,]/g, '')
  return parseFloat(normalizeNumericString(s))
}

/**
 * @input handler for decimal inputs (digits, dot, and comma only).
 * Also forces the DOM element's value to update so Vue's re-render skip
 * doesn't leave invalid characters visible.
 */
export function onDecimalInput(event: Event, setter: (v: string) => void): void {
  const el = event.target as HTMLInputElement
  el.value = el.value.replace(/[^\d.,]/g, '')
  setter(el.value)
}

/**
 * @input handler for integer-only inputs.
 */
export function onIntInput(event: Event, setter: (v: string) => void): void {
  const el = event.target as HTMLInputElement
  el.value = el.value.replace(/[^\d]/g, '')
  setter(el.value)
}
