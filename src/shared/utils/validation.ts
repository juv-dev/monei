/**
 * Validation utilities for financial data inputs.
 * Centralizes validation logic used across form views.
 */

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

/** Validate a monetary amount: must be a positive number within a reasonable range */
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

/** Validate a text description: required, max length, no script injection */
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

/** Validate an interest rate: 0–100% */
export function validateTasaInteres(value: number): ValidationResult {
  if (isNaN(value) || value < 0) {
    return fail('La tasa de interés debe ser mayor o igual a 0')
  }
  if (value > MAX_INTEREST_RATE) {
    return fail(`La tasa de interés no puede superar ${MAX_INTEREST_RATE}%`)
  }
  return ok()
}

/** Validate a password */
export function validatePassword(password: string): ValidationResult {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
  }
  return ok()
}

/** Validate that two passwords match */
export function validatePasswordMatch(password: string, confirm: string): ValidationResult {
  if (password !== confirm) {
    return fail('Las contraseñas no coinciden')
  }
  return ok()
}

/** Sanitize a string by trimming and removing dangerous patterns */
export function sanitize(value: string): string {
  return value
    .trim()
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
}
