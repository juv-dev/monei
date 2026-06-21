import { describe, it, expect } from 'vitest'
import { validateMonto, validateDescripcion, validateTasaInteres, sanitize } from '~/shared/utils/validation'

describe('should validateMonto', () => {
  it('should return error for zero', () => {
    const result = validateMonto(0)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('debe ser un número positivo')
  })

  it('should return error for negative value', () => {
    const result = validateMonto(-5)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('debe ser un número positivo')
  })

  it('should return error for NaN', () => {
    const result = validateMonto(NaN)
    expect(result.valid).toBe(false)
  })

  it('should return error when value exceeds maximum', () => {
    const result = validateMonto(1_000_000_000)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('supera el máximo permitido')
  })

  it('should return valid for positive value within range', () => {
    const result = validateMonto(100)
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should return valid for maximum allowed value', () => {
    const result = validateMonto(999_999_999)
    expect(result.valid).toBe(true)
  })

  it('should use custom label in error message', () => {
    const result = validateMonto(-1, 'El ingreso')
    expect(result.error).toContain('El ingreso')
  })

  it('should use default label when none provided', () => {
    const result = validateMonto(-1)
    expect(result.error).toContain('El monto')
  })
})

describe('should validateDescripcion', () => {
  it('should return error for empty string', () => {
    const result = validateDescripcion('')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('es requerida')
  })

  it('should return error for whitespace-only string', () => {
    const result = validateDescripcion('   ')
    expect(result.valid).toBe(false)
  })

  it('should use custom required message when provided', () => {
    const result = validateDescripcion('', 'La descripción', 'Campo requerido')
    expect(result.error).toBe('Campo requerido')
  })

  it('should return error when description exceeds max length', () => {
    const result = validateDescripcion('a'.repeat(201))
    expect(result.valid).toBe(false)
    expect(result.error).toContain('200 caracteres')
  })

  it('should return error for lowercase script tag injection', () => {
    const result = validateDescripcion('<script>alert(1)</script>')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('contenido no permitido')
  })

  it('should return error for uppercase SCRIPT tag injection', () => {
    const result = validateDescripcion('<SCRIPT>alert(1)</SCRIPT>')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('contenido no permitido')
  })

  it('should return valid for normal description', () => {
    const result = validateDescripcion('Pago de servicios públicos')
    expect(result.valid).toBe(true)
  })

  it('should accept exactly 200 characters', () => {
    const result = validateDescripcion('a'.repeat(200))
    expect(result.valid).toBe(true)
  })

  it('should use custom label in error messages', () => {
    const result = validateDescripcion('', 'El título')
    expect(result.error).toContain('El título')
  })
})

describe('should validateTasaInteres', () => {
  it('should return error for NaN', () => {
    const result = validateTasaInteres(NaN)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('mayor o igual a 0')
  })

  it('should return error for negative rate', () => {
    const result = validateTasaInteres(-1)
    expect(result.valid).toBe(false)
  })

  it('should return error when rate exceeds 100', () => {
    const result = validateTasaInteres(101)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('100%')
  })

  it('should accept zero rate', () => {
    const result = validateTasaInteres(0)
    expect(result.valid).toBe(true)
  })

  it('should accept valid interest rate', () => {
    const result = validateTasaInteres(15)
    expect(result.valid).toBe(true)
  })

  it('should accept maximum rate of 100', () => {
    const result = validateTasaInteres(100)
    expect(result.valid).toBe(true)
  })
})

describe('should sanitize', () => {
  it('should return plain text unchanged', () => {
    const result = sanitize('Hello World')
    expect(result).toBe('Hello World')
  })

  it('should escape HTML tags', () => {
    const result = sanitize('<b>bold</b>')
    expect(result).toBe('&lt;b&gt;bold&lt;/b&gt;')
  })

  it('should trim leading and trailing whitespace', () => {
    const result = sanitize('  hello  ')
    expect(result).toBe('hello')
  })

  it('should escape ampersands', () => {
    const result = sanitize('cats & dogs')
    expect(result).toBe('cats &amp; dogs')
  })
})
