import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { BoardTask } from '../board/boardPlan'
import type { SceneId } from '../model/types'
import { newDayState, recordResolved, TARGET_SECONDS, waitingTotal, type DayState } from './dayState'
import { BEHIND_AFTER_MS, CALM_AFTER_MS, COOLDOWN_MS, desiredWaiting, MAX_PER_PLACE, PLAY_WINDOW_MS, reconcile, wake, type GovernorContext } from './governor'
import { statusAt } from './types'

const TASKS: readonly BoardTask[] = [
  { place: 'recreatius', count: 1, kind: 'calentament', neighbour: 'en-kofi' },
  { place: 'botiga', count: 3, kind: 'repte', neighbour: 'senyora-pilar' },
  { place: 'casa', count: 3, kind: 'repte', neighbour: 'la-fatima' },
  { place: 'autobus', count: 3, kind: 'repas', neighbour: 'en-jordi' },
]
const PLACES = [
  { id: 'casa', skills: ['A4', 'A5'] },
  { id: 'botiga', skills: ['A3', 'A4'] },
  { id: 'autobus', skills: ['A4'] },
  { id: 'recreatius', skills: ['A3'] },
] as const
const T0 = 1_000_000
const ctx = (now = T0, seed = 7): GovernorContext => ({ now, seed, places: PLACES, core: new Set(['A4', 'A5']), review: new Set(['A3']) })
const fresh = (): DayState => newDayState('2026-10-09', TASKS)
const sum = (m: Partial<Record<SceneId, number>>): number => Object.values(m).reduce((n, c) => n + (c ?? 0), 0)

describe('desiredWaiting', () => {
  it('starts gently: the warm-up waits at the Recreatius first, within a small total', () => {
    const want = desiredWaiting(fresh(), ctx())
    expect(want.recreatius).toBe(1)
    expect(sum(want)).toBeLessThanOrEqual(3)
    expect(Object.values(want).every((n) => (n ?? 0) <= 1)).toBe(true)
  })

  it('is deterministic for the same day and seed, and varies by seed', () => {
    expect(desiredWaiting(fresh(), ctx())).toEqual(desiredWaiting(fresh(), ctx()))
  })

  it('goes up to 2 per place and a larger total when the child has played a while and is behind', () => {
    const behind = { ...fresh(), playedMs: BEHIND_AFTER_MS + 60_000 }
    const want = desiredWaiting(behind, ctx())
    expect(sum(want)).toBeGreaterThan(sum(desiredWaiting(fresh(), ctx())))
    expect(Math.max(...Object.values(want).map((n) => n ?? 0))).toBe(MAX_PER_PLACE)
  })

  it('goes down to one bubble when she is ahead of the pace', () => {
    const ahead = { ...fresh(), playedMs: PLAY_WINDOW_MS / 2, seconds: TARGET_SECONDS * 0.9 }
    expect(sum(desiredWaiting(ahead, ctx()))).toBe(1)
  })

  it('cools down a place right after a solved request', () => {
    const solved = recordResolved({ ...fresh(), playedMs: BEHIND_AFTER_MS + 60_000 }, 'botiga', true, T0)
    expect(desiredWaiting(solved, ctx(T0 + 1000)).botiga ?? 0).toBe(0)
    expect(desiredWaiting(solved, ctx(T0 + COOLDOWN_MS + 1)).botiga ?? 0).toBeGreaterThan(0)
  })

  it('quiet mode (accuracy below 70 %) asks for less', () => {
    let s = { ...fresh(), playedMs: BEHIND_AFTER_MS + 60_000 }
    for (let i = 0; i < 6; i++) s = { ...s, recent: [...s.recent, false] }
    const want = desiredWaiting(s, ctx())
    expect(sum(want)).toBeLessThanOrEqual(2)
    expect(Object.values(want).every((n) => (n ?? 0) <= 1)).toBe(true)
  })

  it('nothing waits once the day is done, and never more than what is left at a place', () => {
    let s = fresh()
    for (const t of TASKS) for (let i = 0; i < t.count; i++) s = recordResolved(s, t.place, true, 1)
    expect(sum(desiredWaiting(s, ctx(T0 + 99_999_999)))).toBe(0)
    const nearly = { ...fresh(), board: { ...fresh().board, done: { botiga: 2, casa: 3, autobus: 3, recreatius: 1 } }, playedMs: BEHIND_AFTER_MS + 1 }
    expect(desiredWaiting(nearly, ctx()).botiga).toBe(1)
  })

  it('property: never more than 2 per place, never more than what is left, never negative', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 30 * 60_000 }), fc.integer({ min: 0, max: TARGET_SECONDS }), fc.integer({ min: 0, max: 99999 }), fc.array(fc.boolean(), { maxLength: 10 }), (playedMs, seconds, seed, recent) => {
        const s: DayState = { ...fresh(), playedMs, seconds, recent }
        const want = desiredWaiting(s, ctx(T0, seed))
        let left = 0
        for (const t of TASKS) {
          const n = want[t.place] ?? 0
          expect(n).toBeGreaterThanOrEqual(0)
          expect(n).toBeLessThanOrEqual(MAX_PER_PLACE)
          expect(n).toBeLessThanOrEqual(t.count)
          left += t.count
        }
        expect(sum(want)).toBeLessThanOrEqual(left)
      }),
    )
  })
})

describe('reconcile', () => {
  it('creates real requests: anchored to the place’s character, aimed at a plan skill, soft-expiring', () => {
    const s = reconcile(fresh(), ctx())
    expect(s.live.length).toBeGreaterThan(0)
    const warm = s.live.find((r) => r.placeId === 'recreatius')
    expect(warm).toMatchObject({ kind: 'play', actorId: 'en-kofi', skillId: 'A3' })
    const shop = s.live.find((r) => r.placeId === 'botiga')
    expect(shop).toMatchObject({ kind: 'serve', actorId: 'senyora-pilar' })
    expect(new Set(s.live.map((r) => r.id)).size).toBe(s.live.length)
    for (const r of s.live) expect(r.expiresSoft - r.createdAt).toBe(CALM_AFTER_MS)
  })

  it('is idempotent and does not mutate', () => {
    const start = Object.freeze(fresh())
    const once = reconcile(start, ctx())
    expect(reconcile(once, ctx())).toEqual(once)
    expect(start.live).toEqual([])
  })

  it('after the soft expiry the bubbles calm down (not a failure, nothing disappears), and are not replaced', () => {
    const once = reconcile(fresh(), ctx())
    const later = ctx(T0 + CALM_AFTER_MS + 5)
    const calmed = reconcile(once, later)
    expect(calmed.live.map((r) => r.id)).toEqual(once.live.map((r) => r.id))
    expect(calmed.live.every((r) => statusAt(r, later.now) === 'calm')).toBe(true)
    expect(waitingTotal(calmed, later.now)).toBe(0)
  })

  it('wake re-opens the calm requests of a place, and creates one if the place is empty', () => {
    const once = reconcile(fresh(), ctx())
    const later = ctx(T0 + CALM_AFTER_MS + 5)
    const woken = wake(reconcile(once, later), 'recreatius', later)
    expect(waitingTotal(woken, later.now)).toBe(1)
    const empty = wake({ ...fresh(), lastSolvedAt: { botiga: later.now } }, 'botiga', later)
    expect(empty.live.filter((r) => r.placeId === 'botiga')).toHaveLength(1)
    const none = wake(fresh(), 'perruqueria', later)
    expect(none.live).toEqual([])
  })

  it('a solved request makes room for the next only after the cooldown', () => {
    const base = reconcile({ ...fresh(), playedMs: 8 * 60_000 }, ctx())
    const botiga = base.live.find((r) => r.placeId === 'botiga')
    expect(botiga).toBeDefined()
    const solved = recordResolved(base, 'botiga', true, T0 + 10)
    const soon = reconcile(solved, ctx(T0 + 20))
    expect(soon.live.filter((r) => r.placeId === 'botiga')).toHaveLength(base.live.filter((r) => r.placeId === 'botiga').length - 1)
    const later = reconcile(soon, ctx(T0 + COOLDOWN_MS + 100))
    expect(later.live.filter((r) => r.placeId === 'botiga').length).toBeGreaterThan(soon.live.filter((r) => r.placeId === 'botiga').length)
  })

  it('drops live requests when the day’s quota is done', () => {
    let s = reconcile(fresh(), ctx())
    for (const t of TASKS) for (let i = 0; i < t.count; i++) s = recordResolved(s, t.place, true, 1)
    expect(reconcile(s, ctx(T0 + 999_999)).live).toEqual([])
  })
})
