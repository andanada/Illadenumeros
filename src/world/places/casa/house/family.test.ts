import { describe, expect, it } from 'vitest'
import { assignAnchors, ASKERS, MEMBERS } from './family'

const ask = (id: string, kind: 'cook' | 'serve' | 'give' | 'drive' | 'style' | 'play') => ({ id, kind, actorId: 'x' })

describe('assignAnchors', () => {
  it('gives each kind to the member that usually asks for it', () => {
    const m = assignAnchors([ask('a', 'cook'), ask('b', 'give'), ask('c', 'play')])
    expect(m.get('iaia')).toBe('a')
    expect(m.get('pare')).toBe('b')
    expect(m.get('mascota')).toBe('c')
  })

  it('never puts two requests on one character; spare ones go to the next free member', () => {
    const m = assignAnchors([ask('a', 'cook'), ask('b', 'cook'), ask('c', 'cook')])
    expect(new Set(m.keys()).size).toBe(3)
    expect(m.get('iaia')).toBe('a')
    expect([...m.values()].sort()).toEqual(['a', 'b', 'c'])
  })

  it('drops the surplus quietly when there are more requests than characters', () => {
    const many = Array.from({ length: ASKERS.length + 2 }, (_, i) => ask(`r${i}`, 'cook'))
    expect(assignAnchors(many).size).toBe(ASKERS.length)
  })

  it('is stable', () => {
    const list = [ask('a', 'serve'), ask('b', 'style')]
    expect([...assignAnchors(list)]).toEqual([...assignAnchors(list)])
  })

  it('members are on a real floor with room to stand', () => {
    for (const m of MEMBERS) {
      expect(m.at.y).toBeGreaterThan(0.5)
      expect(m.at.x).toBeGreaterThan(0.1)
      expect(m.at.x).toBeLessThan(0.9)
    }
  })
})
