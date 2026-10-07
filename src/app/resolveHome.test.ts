import { resolveHome } from './resolveHome'

describe('resolveHome', () => {
  it('sends a brand new child to the start screen', () => {
    expect(resolveHome(undefined)).toBe('/start')
  })
  it('sends a child without diagnostic to the diagnostic', () => {
    expect(resolveHome({ diagnosticDone: false })).toBe('/diagnostic')
  })
  it('sends a child with diagnostic to the map', () => {
    expect(resolveHome({ diagnosticDone: true })).toBe('/map')
  })
})
