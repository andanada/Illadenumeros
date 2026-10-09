import { resolveHome } from './resolveHome'

const ID = '11111111-1111-4111-8111-111111111111'

describe('resolveHome', () => {
  it('sends a device without players to the start screen', () => {
    expect(resolveHome({ playerCount: 0, activePlayerId: undefined, profile: undefined })).toBe('/start')
  })

  it.each([1, 2, 5])('with %i player(s) and nobody selected it shows "Qui juga?"', (playerCount) => {
    expect(resolveHome({ playerCount, activePlayerId: undefined, profile: undefined })).toBe('/qui-juga')
  })

  it('sends the active player without diagnostic to the diagnostic', () => {
    expect(resolveHome({ playerCount: 2, activePlayerId: ID, profile: { diagnosticDone: false } })).toBe('/diagnostic')
  })

  it('sends the active player with diagnostic to the town', () => {
    expect(resolveHome({ playerCount: 1, activePlayerId: ID, profile: { diagnosticDone: true } })).toBe('/poble')
  })

  it('an active player whose profile could not be read goes back to the picker', () => {
    expect(resolveHome({ playerCount: 2, activePlayerId: ID, profile: undefined })).toBe('/qui-juga')
  })

  it('a profile kept only in memory (storage unavailable) still reaches the town', () => {
    expect(resolveHome({ playerCount: 0, activePlayerId: ID, profile: { diagnosticDone: true } })).toBe('/poble')
  })
})
