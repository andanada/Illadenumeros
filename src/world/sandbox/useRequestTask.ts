import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useCast } from './CastContext'
import { useItems } from './ItemsContext'
import { toPlace } from './logic/catalan'
import { expectedCount, pilePoints, requestTaskSpecSchema, supplyCount, taskState, type RequestTaskSpec, type TaskState } from './logic/requestTask'
import { zoneCounts, zoneItems } from './logic/zones'
import { choiceForValue } from '../errands/adapters'
import type { Errand } from '../errands/useErrand'

/** What the hook needs from an errand (a real `Errand` fits; so does a fake one in a test or a demo). */
export type TaskErrand = Pick<Errand, 'item' | 'phase' | 'tries' | 'hintText' | 'submit'>

export interface RequestTask {
  /** empty: nothing counted yet · counting · checking (answer on its way) · done (right) · shown (solution laid out). */
  state: TaskState
  /** What lies in the target zone right now (of `spec.def` when given). */
  count: number
  /** What the item asks for, when it is a count at all. */
  expected: number | undefined
  /** Answers with the counted value through the errand's flow: same attempt, hint ladder, Leitner and fluency pipeline. */
  submit: () => Promise<void>
  /** Hint ladder text to show (from errors or the child's own «ajuda»). */
  hint: string | undefined
}

/**
 * Turns the engine item of an errand into something done with the hands: lays out the source objects,
 * counts what ends up in the zone, answers with that count. A wrong count never shows a red cross: the
 * things pop back to the pile and the hint ladder runs. A right one can hand the things to an actor.
 */
export function useRequestTask(errand: TaskErrand, rawSpec: RequestTaskSpec): RequestTask {
  const spec = useMemo(() => requestTaskSpecSchema.parse(rawSpec), [rawSpec])
  const cast = useCast()
  const { spawn, remove, place, consume } = useItems()
  const { announce } = cast
  const zone = useItems((api) => api.zones[spec.zone])
  const count = useItems((api) => (spec.def ? (zoneCounts(api.items, spec.zone)[spec.def] ?? 0) : Object.values(zoneCounts(api.items, spec.zone)).reduce((a, b) => a + b, 0)))
  const itemsNow = useItems((api) => api.items)
  const latest = useRef(itemsNow)
  useEffect(() => {
    latest.current = itemsNow
  })

  const { item, phase, tries } = errand
  const expected = expectedCount(item, spec.expected)
  const mine = useRef<string[]>([])
  const floorTop = useItems((api) => api.floorTop)
  const specKey = JSON.stringify(spec)
  const source = spec.source

  const clearAll = useCallback(() => {
    for (const uid of mine.current) remove(uid)
    mine.current = []
  }, [remove])

  // A new neighbour with a new item: tidy the old pile and lay out the new one.
  useEffect(() => {
    clearAll()
    if (spec.active === false || !source || expected === undefined) return
    pilePoints(source.at, supplyCount(expected, spec), floorTop).forEach((at) => {
      const uid = spawn(source.def, { room: source.room, at })
      if (uid) mine.current = [...mine.current, uid]
    })
    return clearAll
    // The item's id and the spec decide the pile; spawn/remove are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, specKey, expected])

  // Wrong count: everything pops gently back to the pile (no red, no loss).
  const seenTries = useRef(tries)
  useEffect(() => {
    if (spec.active !== false && tries > seenTries.current && zone) {
      const back = zoneItems(latest.current, spec.zone).filter((i) => !spec.def || i.def === spec.def)
      const room = source?.room ?? zone.room
      const spots = pilePoints(source?.at ?? { x: zone.rect.x + zone.rect.w / 2, y: Math.min(0.95, zone.rect.y + zone.rect.h + 0.08) }, back.length, floorTop)
      back.forEach((it, n) => place(it.uid, { room, at: spots[n] ?? { x: 0.5, y: 0.8 } }))
      if (back.length > 0) announce('Ho tornem a provar: les coses han tornat a la pila.')
    }
    seenTries.current = tries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tries])

  // After the last try the solution is laid out so the child sees it.
  useEffect(() => {
    if (spec.active === false || phase !== 'shown' || expected === undefined || !zone || !source) return
    const inZone = zoneItems(latest.current, spec.zone).filter((i) => i.def === source.def)
    inZone.slice(expected).forEach((i) => remove(i.uid))
    for (let n = inZone.length; n < expected; n++) {
      const uid = spawn(source.def, { room: zone.room, at: { x: zone.rect.x, y: zone.rect.y }, zone: spec.zone })
      if (uid) mine.current = [...mine.current, uid]
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Right: optionally hand the counted things to someone.
  useEffect(() => {
    if (spec.active === false || phase !== 'thanks' || !spec.giveTo) return
    const given = zoneItems(latest.current, spec.zone).filter((i) => !spec.def || i.def === spec.def)
    const name = cast.seeds[spec.giveTo]?.name
    given.forEach((i) => consume(i.uid))
    if (name) {
      cast.emote(spec.giveTo, 'cor')
      announce(`Has donat ${given.length} ${toPlace(name)}.`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const submit = useCallback(async (): Promise<void> => {
    if (spec.active === false || phase !== 'asking' || count === 0) return
    await errand.submit(choiceForValue(String(count), item))
  }, [phase, count, errand, item, spec.active])

  return { state: taskState(phase, count), count, expected, submit, hint: errand.hintText }
}
