import { useCallback, useEffect, useMemo, useRef } from 'react'
import { choiceForValue } from '../../../errands/adapters'
import { useCast } from '../../../sandbox/CastContext'
import { useItems } from '../../../sandbox/ItemsContext'
import { toPlace } from '../../../sandbox/logic/catalan'
import { pilePoints, taskState, supplyCount, type TaskState } from '../../../sandbox/logic/requestTask'
import { zoneCounts, zoneItems } from '../../../sandbox/logic/zones'
import type { TaskErrand } from '../../../sandbox/useRequestTask'

export interface ZonesTaskSpec {
  /** The zones whose things add up to the answer (the two sides of a head). */
  readonly zones: readonly string[]
  readonly def: string
  readonly source: { readonly def: string; readonly room: string; readonly at: { readonly x: number; readonly y: number } }
  /** How many things she has to add in all. */
  readonly expected: number
  readonly supply?: number
  readonly active: boolean
  readonly giveTo?: string
}

export interface ZonesTask {
  readonly state: TaskState
  readonly count: number
  /** What lies in each zone, in the order of `spec.zones`. */
  readonly counts: readonly number[]
  readonly submit: () => Promise<void>
  readonly hint: string | undefined
}

/**
 * Same contract as `useRequestTask` for an answer that is spread over several zones (clips on the left and on the
 * right of a head): the pile, the count, the gentle return after a wrong try, the solution after the last one and
 * the hand-over once it is right.
 */
export function useZonesTask(errand: TaskErrand, spec: ZonesTaskSpec): ZonesTask {
  const cast = useCast()
  const { spawn, remove, place, consume } = useItems()
  const items = useItems((api) => api.items)
  const floorTop = useItems((api) => api.floorTop)
  const latest = useRef(items)
  useEffect(() => {
    latest.current = items
  })
  const mine = useRef<string[]>([])
  const { item, phase, tries } = errand
  const { source, active, expected, def } = spec
  const key = spec.zones.join('|')
  const counts = useMemo(() => spec.zones.map((z) => zoneCounts(items, z)[def] ?? 0), [items, key, def]) // eslint-disable-line react-hooks/exhaustive-deps
  const count = counts.reduce((a, b) => a + b, 0)

  const clearAll = useCallback(() => {
    for (const uid of mine.current) remove(uid)
    mine.current = []
  }, [remove])

  useEffect(() => {
    clearAll()
    if (!active) return
    pilePoints(source.at, supplyCount(expected, spec), floorTop).forEach((at) => {
      const uid = spawn(source.def, { room: source.room, at })
      if (uid) mine.current = [...mine.current, uid]
    })
    return clearAll
    // The item and the request decide the pile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, active, expected, key, source.def])

  const seen = useRef(tries)
  useEffect(() => {
    if (active && tries > seen.current) {
      const back = spec.zones.flatMap((z) => zoneItems(latest.current, z).filter((i) => i.def === def))
      const spots = pilePoints(source.at, back.length, floorTop)
      back.forEach((it, n) => place(it.uid, { room: source.room, at: spots[n] ?? source.at }))
      if (back.length > 0) cast.announce('Ho tornem a provar: les pinces han tornat a la caixa.')
    }
    seen.current = tries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tries])

  useEffect(() => {
    if (!active || phase !== 'shown') return
    spec.zones.flatMap((z) => zoneItems(latest.current, z).filter((i) => i.def === def)).forEach((i) => remove(i.uid))
    for (let n = 0; n < expected; n++) {
      const uid = spawn(def, { room: source.room, at: source.at, zone: spec.zones[n % spec.zones.length] ?? '' })
      if (uid) mine.current = [...mine.current, uid]
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    if (!active || phase !== 'thanks' || !spec.giveTo) return
    spec.zones.flatMap((z) => zoneItems(latest.current, z).filter((i) => i.def === def)).forEach((i) => consume(i.uid))
    const name = cast.seeds[spec.giveTo]?.name
    if (name) {
      cast.emote(spec.giveTo, 'cor')
      cast.announce(`Has posat les pinces ${toPlace(name)}.`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const submit = useCallback(async (): Promise<void> => {
    if (!active || phase !== 'asking' || count === 0) return
    await errand.submit(choiceForValue(String(count), item))
  }, [active, phase, count, errand, item])

  return { state: taskState(phase, count), count, counts, submit, hint: errand.hintText }
}
