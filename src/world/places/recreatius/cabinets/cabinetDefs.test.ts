import { describe, expect, it } from 'vitest'
import { GAME_REGISTRY } from '../../../../features/play/gameRegistry'
import { CABINETS, cabinetById, warmupCabinet } from './cabinetDefs'

describe('arcade cabinets', () => {
  it('each one runs an existing speed game under its own id', () => {
    expect(CABINETS.map((c) => c.gameId)).toEqual(['duel-llampec', 'tren-sumes', 'pesca-sumes'])
    for (const c of CABINETS) expect(GAME_REGISTRY[c.gameId], c.id).toBeDefined()
    expect(cabinetById('pesca').title).toBe('Pesca de Sumes')
  })

  it('the pending warm-up lights the Duel (Escalfament)', () => {
    expect(warmupCabinet(0)).toBeUndefined()
    expect(warmupCabinet(1)).toBe('duel')
    expect(warmupCabinet(3)).toBe('duel')
  })
})
