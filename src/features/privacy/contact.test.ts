import { describe, expect, it } from 'vitest'
import { isPlaceholderContact, PRIVACY_CONTACT_EMAIL, PRIVACY_CONTACT_PLACEHOLDER } from './contact'

describe('privacy contact', () => {
  it('ships with the obvious placeholder until the owner sets a real address', () => {
    expect(PRIVACY_CONTACT_PLACEHOLDER).toBe('contacte@exemple.cat')
    expect(PRIVACY_CONTACT_EMAIL).toBe(PRIVACY_CONTACT_PLACEHOLDER)
  })

  it('detects the placeholder regardless of case and spaces, and nothing else', () => {
    expect(isPlaceholderContact()).toBe(true)
    expect(isPlaceholderContact('  Contacte@Exemple.CAT ')).toBe(true)
    expect(isPlaceholderContact('families@lameva-web.cat')).toBe(false)
  })
})
