function normalizeNumericString(s: string): string {
  const hasDot = s.includes('.')
  const hasComma = s.includes(',')

  if (hasDot && hasComma) {
    const lastDot = s.lastIndexOf('.')
    const lastComma = s.lastIndexOf(',')
    if (lastComma > lastDot) {
      return s.replace(/\./g, '').replace(',', '.')
    }
    return s.replace(/,/g, '')
  }

  const dotCount = (s.match(/\./g) || []).length

  if (dotCount > 1) {
    const parts = s.split('.')
    const lastPart = parts[parts.length - 1]!
    return lastPart.length === 3 ? parts.join('') : parts.slice(0, -1).join('') + '.' + lastPart
  }

  if (dotCount === 1) {
    const afterDot = s.split('.')[1]!
    if (afterDot.length === 3) return s.replace('.', '')
    return s
  }

  const commaCount = (s.match(/,/g) || []).length
  if (commaCount > 1) {
    return s.replace(/,/g, '')
  }
  if (commaCount === 1) {
    const afterComma = s.split(',')[1]!
    return afterComma.length === 3 ? s.replace(',', '') : s.replace(',', '.')
  }

  return s
}

export function formatMoneyDisplay(value: string | number): string {
  const raw = String(value)
    .trim()
    .replace(/[^\d.,]/g, '')
  if (!raw) return ''

  const normalized = normalizeNumericString(raw)

  const parts = normalized.split('.')
  const intFormatted = (parts[0] || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.length > 1 ? `${intFormatted}.${parts[1]}` : intFormatted
}

export function parseMoneyInput(value: string | number): number {
  const s = String(value)
    .trim()
    .replace(/[^\d.,]/g, '')
  return parseFloat(normalizeNumericString(s))
}

export function onDecimalInput(event: Event, setter: (v: string) => void): void {
  const el = event.target as HTMLInputElement
  el.value = el.value.replace(/[^\d.,]/g, '')
  setter(el.value)
}

export function onIntInput(event: Event, setter: (v: string) => void): void {
  const el = event.target as HTMLInputElement
  el.value = el.value.replace(/[^\d]/g, '')
  setter(el.value)
}
