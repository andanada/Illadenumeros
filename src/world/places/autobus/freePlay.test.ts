import { describe, expect, it } from 'vitest'
import { SEATS } from './errands/seatsLogic'
import { alight, board, crowdAt, honk, initialBus, signal, toggleDrive, toggleNight, toggleWipers } from './freePlay'
import { busViewport } from './interior/useBusViewport'

describe('bus free play', () => {
  it('passengers get on and off only with the bus stopped', () => {
    const s0 = initialBus()
    const first = s0.waiting[0]
    if (!first) throw new Error('ningú a la parada')
    const s1 = board(s0, first)
    expect(s1.seated).toContain(first)
    expect(s1.waiting).not.toContain(first)
    const s2 = alight(s1, first)
    expect(s2.waiting).toContain(first)
    const moving = toggleDrive(s1)
    expect(board(moving, s1.waiting[0] ?? '')).toBe(moving)
    expect(alight(moving, first)).toBe(moving)
    expect(board(s0, 'ningú')).toBe(s0)
  })

  it('never more than 20 seated', () => {
    const full = { ...initialBus(), seated: Array.from({ length: SEATS }, (_, i) => `p${i}`) }
    expect(board(full, full.waiting[0] ?? '')).toBe(full)
  })

  it('stopping reaches the next stop with new people waiting (always the same for the same stop)', () => {
    const s0 = initialBus()
    const moving = toggleDrive({ ...s0, indicator: 'left' })
    expect(moving.driving).toBe(true)
    expect(moving.indicator).toBe('off')
    const stopped = toggleDrive(moving)
    expect(stopped).toMatchObject({ driving: false, stop: 2 })
    expect(stopped.waiting).toEqual(crowdAt(2))
    expect(crowdAt(5)).toEqual(crowdAt(5))
    for (let i = 0; i < 9; i++) expect(crowdAt(i).length).toBeGreaterThanOrEqual(2)
  })

  it('indicators, wipers, lights and horn', () => {
    const s0 = initialBus()
    expect(signal(s0, 'left').indicator).toBe('left')
    expect(signal(signal(s0, 'left'), 'left').indicator).toBe('off')
    expect(signal(signal(s0, 'left'), 'right').indicator).toBe('right')
    expect(toggleWipers(s0).wipers).toBe(true)
    expect(toggleNight(s0).night).toBe(true)
    expect(honk(honk(s0)).honks).toBe(2)
  })

  it('sizes people for the screen', () => {
    expect(busViewport(1024, 768).portrait).toBe(false)
    expect(busViewport(390, 844)).toMatchObject({ portrait: true })
    expect(busViewport(390, 844).neighbour).toBeLessThanOrEqual(160)
    expect(busViewport(2000, 1400).neighbour).toBe(260)
  })
})
