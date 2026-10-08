import { describe, expect, it } from 'vitest'
import { countWord, fallbackRequest, neighbourFor, ofName } from './requestText'

describe('requestText', () => {
  it('contracts "de" with the article of the name', () => {
    expect(ofName('En Jordi')).toBe('d’en Jordi')
    expect(ofName('La Núria')).toBe('de la Núria')
    expect(ofName("L'avi Ramon")).toBe('de l’avi Ramon')
    expect(ofName('Senyora Pilar')).toBe('de la senyora Pilar')
    expect(ofName('Kim')).toBe('de Kim')
  })

  it('neighbours take turns, also for negative or huge visits', () => {
    expect(neighbourFor(0).name).toBeTruthy()
    expect(neighbourFor(-1).id).toBeTruthy()
    expect(neighbourFor(3).id).not.toBe(neighbourFor(4).id)
  })

  it('fallback uses the engine text, and the speech when present', () => {
    const item = { text: '3 + 4 = ?', speech: '' } as Parameters<typeof fallbackRequest>[0]
    expect(fallbackRequest(item)).toEqual({ text: '3 + 4 = ?', speech: '3 + 4 = ?' })
    expect(countWord(1, 'poma', 'pomes')).toBe('1 poma')
  })
})
