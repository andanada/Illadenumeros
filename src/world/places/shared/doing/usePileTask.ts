import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { Choice } from '../../../../core/ambit/types'
import { useCast } from '../../../sandbox/CastContext'
import { useItems } from '../../../sandbox/ItemsContext'
import type { Pt } from '../../../sandbox/logic/actorMachine'
import type { Rect } from '../../../sandbox/logic/zones'
import { toPlace } from '../../../sandbox/logic/catalan'
import { taskState, type TaskState } from '../../../sandbox/logic/requestTask'
import { zoneItems } from '../../../sandbox/logic/zones'
import type { TaskErrand } from '../../../sandbox/useRequestTask'
import { centreOf, pileSpots } from './areaPile'
import { looseOf, solutionMoves, zoneDefs } from './pileTask'

export interface PileSpec {
  /** The counting zone she fills (or empties). */
  readonly zone: string
  readonly room: string
  /** Where the loose pile lies (fractions of the stage): the things are spread evenly over it. */
  readonly pile: Rect
  /** Defs that already lie in the zone when the request opens (the apples she is told she has). */
  readonly start: readonly string[]
  /** Defs of the loose things laid out as a pile (the right ones and some spare). */
  readonly loose: readonly string[]
  /** Defs that make the right answer when they lie in the zone: the solution laid out after the last try. */
  readonly solution: readonly string[]
  /** false: nothing is laid out and nothing reacts (no request is on). */
  readonly active: boolean
  /** Reads what lies in the zone as the choice to answer; undefined while there is nothing to answer yet. */
  readonly choose: (inZone: readonly string[]) => Choice | undefined
  /** Who receives the things once the answer is right (they get a heart). */
  readonly giveTo?: string
  /** What is announced when the zone is handed over, e.g. «Has donat 12 pomes a la Fàtima.». */
  readonly gave?: (count: number, to: string) => string
}

export interface PileTask {
  readonly state: TaskState
  /** What lies in the zone right now (never shown: counting is her job). */
  readonly inZone: number
  /** Loose things still lying in the pile. */
  readonly loose: number
  /** «Comprova» can answer. */
  readonly ready: boolean
  readonly submit: () => Promise<void>
  readonly hint: string | undefined
}

interface Mine {
  readonly uid: string
  /** Where it goes back to when a try was wrong: the zone, or its place in the pile. */
  readonly home: 'zone' | Pt
}

/**
 * The hands-on side of a request that is answered by what lies in a zone: lays out the zone's start and a pile of
 * loose things, reads the zone, answers through the errand's flow. A wrong try sends everything back (no red, no loss);
 * after the last try the solution is laid out; a right answer hands the things over. Purely a hook: the place draws.
 */
export function usePileTask(errand: TaskErrand, spec: PileSpec): PileTask {
  const cast = useCast()
  const { spawn, remove, place, consume, putInZone } = useItems()
  const items = useItems((api) => api.items)
  const latest = useRef(items)
  const live = useRef(spec)
  useEffect(() => {
    latest.current = items
    live.current = spec
  })
  const mine = useRef<Mine[]>([])
  const { item, phase, tries } = errand
  const specKey = JSON.stringify([spec.zone, spec.room, spec.pile, spec.start, spec.loose, spec.active])

  const inZoneDefs = useMemo(() => zoneDefs(items, spec.zone), [items, spec.zone])
  const choice = spec.active ? spec.choose(inZoneDefs) : undefined
  const looseLeft = spec.active ? looseOf(items, mine.current.map((m) => m.uid)).length : 0

  const clearAll = useCallback(() => {
    for (const m of mine.current) remove(m.uid)
    mine.current = []
  }, [remove])

  // A new request (or a new item): tidy the old things and lay out the new ones.
  useEffect(() => {
    clearAll()
    if (!spec.active) return
    const s = live.current
    const made: Mine[] = []
    for (const def of s.start) {
      const uid = spawn(def, { room: s.room, at: centreOf(s.pile), zone: s.zone })
      if (uid) made.push({ uid, home: 'zone' })
    }
    const spots = pileSpots(s.loose.length, s.pile)
    s.loose.forEach((def, n) => {
      const at = spots[n] ?? centreOf(s.pile)
      const uid = spawn(def, { room: s.room, at })
      if (uid) made.push({ uid, home: at })
    })
    mine.current = made
    return clearAll
    // The item and the layout decide what lies there; spawn/remove are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, specKey])

  // Wrong try: everything goes gently back where it came from.
  const seenTries = useRef(tries)
  useEffect(() => {
    if (live.current.active && tries > seenTries.current) {
      const s = live.current
      for (const m of mine.current) {
        place(m.uid, { room: s.room, at: m.home === 'zone' ? centreOf(s.pile) : m.home })
        if (m.home === 'zone') putInZone(m.uid, s.zone)
      }
      cast.announce('Ho tornem a provar: tot ha tornat al seu lloc.')
    }
    seenTries.current = tries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tries])

  // After the last try the solution is laid out so she sees it.
  useEffect(() => {
    const s = live.current
    if (!s.active || phase !== 'shown') return
    const now = latest.current
    const ids = mine.current.map((m) => m.uid)
    const moves = solutionMoves(
      zoneItems(now, s.zone).map((i) => ({ uid: i.uid, def: i.def })),
      looseOf(now, ids).map((i) => ({ uid: i.uid, def: i.def })),
      s.solution,
    )
    for (const uid of moves.out) {
      const m = mine.current.find((x) => x.uid === uid)
      place(uid, { room: s.room, at: m && m.home !== 'zone' ? m.home : centreOf(s.pile) })
    }
    for (const uid of moves.into) putInZone(uid, s.zone)
    for (const def of moves.make) {
      const uid = spawn(def, { room: s.room, at: centreOf(s.pile), zone: s.zone })
      if (uid) mine.current = [...mine.current, { uid, home: centreOf(s.pile) }]
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Right: hand the zone over.
  useEffect(() => {
    const s = live.current
    if (!s.active || phase !== 'thanks' || !s.giveTo) return
    const given = zoneItems(latest.current, s.zone)
    given.forEach((i) => consume(i.uid))
    const name = cast.seeds[s.giveTo]?.name
    if (name && given.length > 0) {
      cast.emote(s.giveTo, 'cor')
      cast.announce(s.gave ? s.gave(given.length, toPlace(name)) : `Has donat ${given.length} ${toPlace(name)}.`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const submit = useCallback(async (): Promise<void> => {
    if (!spec.active || phase !== 'asking' || !choice) return
    await errand.submit(choice)
  }, [spec.active, phase, choice, errand])

  return { state: taskState(phase, choice ? 1 : 0), inZone: inZoneDefs.length, loose: looseLeft, ready: choice !== undefined, submit, hint: errand.hintText }
}
