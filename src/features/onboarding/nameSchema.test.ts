import { validateName } from './nameSchema'

describe('validateName', () => {
  it('rejects empty and blank names with a friendly message', () => {
    expect(validateName('')).toEqual({ ok: false, message: 'Escriu el teu nom' })
    expect(validateName('   ').ok).toBe(false)
  })
  it('trims surrounding spaces', () => {
    expect(validateName('  Júlia ')).toEqual({ ok: true, name: 'Júlia' })
  })
  it('accepts exactly 20 characters and rejects 21', () => {
    expect(validateName('a'.repeat(20)).ok).toBe(true)
    expect(validateName('a'.repeat(21)).ok).toBe(false)
  })
})
