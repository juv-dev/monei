const MAX_MONEY_AMOUNT = 999_999_999
const MAX_DESCRIPTION_LENGTH = 200
const MAX_INTEREST_RATE = 100
const MIN_PASSWORD_LENGTH = 6

export interface ValidationResult {
  valid: boolean
  error?: string
}

function ok(): ValidationResult {
  return { valid: true }
}

function fail(error: string): ValidationResult {
  return { valid: false, error }
}

export function validateMonto(value: number, label = 'El monto'): ValidationResult {
  if (isNaN(value) || value <= 0) {
    return fail(`${label} debe ser un número positivo`)
  }
  if (value > MAX_MONEY_AMOUNT) {
    return fail(`${label} supera el máximo permitido`)
  }
  if (!isFinite(value)) {
    return fail(`${label} no es un valor válido`)
  }
  return ok()
}

export function validateDescripcion(value: string, label = 'La descripción', requiredMsg?: string): ValidationResult {
  const trimmed = value.trim()
  if (!trimmed) {
    return fail(requiredMsg ?? `${label} es requerida`)
  }
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    return fail(`${label} no puede superar ${MAX_DESCRIPTION_LENGTH} caracteres`)
  }
  if (/<script/i.test(trimmed)) {
    return fail(`${label} contiene contenido no permitido`)
  }
  return ok()
}

export function validateTasaInteres(value: number): ValidationResult {
  if (isNaN(value) || value < 0) {
    return fail('La tasa de interés debe ser mayor o igual a 0')
  }
  if (value > MAX_INTEREST_RATE) {
    return fail(`La tasa de interés no puede superar ${MAX_INTEREST_RATE}%`)
  }
  return ok()
}

export function validatePassword(password: string): ValidationResult {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
  }
  return ok()
}

export function validatePasswordMatch(password: string, confirm: string): ValidationResult {
  if (password !== confirm) {
    return fail('Las contraseñas no coinciden')
  }
  return ok()
}

export function sanitize(value: string): string {
  const div = document.createElement('div')
  div.textContent = value.trim()
  return div.innerHTML
}
