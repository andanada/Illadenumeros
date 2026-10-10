import { useCallback, useEffect, useMemo, useRef } from 'react'
import { choiceForValue } from '../../../errands/adapters'
import { useCast } from '../../../sandbox/CastContext'
import { useItems } from '../../../sandbox/ItemsContext'
import { toPlace } from '../../../sandbox/logic/catalan'
import { pilePoints, taskState, type TaskState } from '../../../sandbox/logic/requestTask'
import { zoneCounts, zoneItems } from '../../../sandbox/logic/zones'
import type { TaskErrand } from '../../../sandbox/useRequestTask'
import { shareAnswer, shareCaption, type ShareTask } from './shareLogic'

export interface ShareSpec {
  readonly task: ShareTask
  /** One counting zone per group, in order. */
  readonly zones: readonly string[]
  /** What is dealt out, and where the pile lies. */
  readonly source: { readonly def: string; readonly room: string; readonly at: { readonly x: number; readonly y: number } }
  /** false: nothing is laid out and nothing reacts (no request is open). */
  readonly active: boolean
  /** Who receives the shared things once the answer is right. */
  readonly giveTo?: string
}

export interface ShareProgress {
  readonly state: TaskState
  /** What lies in each group and what is still in the pile. */
  readonly counts: readonly number[]
  readonly left: number
  /** Words that guide the dealing without giving numbers away. */
  readonly caption: string
  /** The sharing is finished: «Comprova» can answer. */
  readonly ready: boolean
  readonly submit: () => Promise<void>
  readonly hint: string | undefined
}

/**
 * Sharing with the hands: lays out `total` things, the child deals them into the groups, and the answer
 * (share, leftover or the part) is read from what she did. A wrong try sends everything back to the pile.
 */
export function useShareTask(errand: TaskErrand, spec: ShareSpec): ShareProgress {
  const cast = useCast()
  const { spawn, remove, place, consume } = useItems()
  const items = useItems((api) => api.items)
  const floorTop = useItems((api) => api.floorTop)
  const latest = useRef(items)
  useEffect(() => {
    latest.current = items
  })
  const mine = useRef<string[]>([])
  const { task, source, active } = spec
  const zoneKey = spec.zones.join('|')
  const counts = useMemo(() => spec.zones.map((z) => zoneCounts(items, z)[source.def] ?? 0), [items, zoneKey, source.def]) // eslint-disable-line react-hooks/exhaustive-deps
  const placed = counts.reduce((a, b) => a + b, 0)
  const left = Math.max(0, task.total - placed)
  const { item, phase, tries } = errand

  const clearAll = useCallback(() => {
    for (const uid of mine.current) remove(uid)
    mine.current = []
  }, [remove])

  useEffect(() => {
    clearAll()
    if (!active) return
    pilePoints(source.at, task.total, floorTop).forEach((at) => {
      const uid = spawn(source.def, { room: source.room, at })
      if (uid) mine.current = [...mine.current, uid]
    })
    return clearAll
    // The item and the sharing decide the pile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, active, task.total, task.groups, source.def])

  const seen = useRef(tries)
  useEffect(() => {
    if (active && tries > seen.current) {
      const back = spec.zones.flatMap((z) => zoneItems(latest.current, z).filter((i) => i.def === source.def))
      const spots = pilePoints(source.at, back.length, floorTop)
      back.forEach((it, n) => place(it.uid, { room: source.room, at: spots[n] ?? source.at }))
      if (back.length > 0) cast.announce('Ho tornem a provar: tot ha tornat a la pila.')
    }
    seen.current = tries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tries])

  useEffect(() => {
    if (!active || phase !== 'shown') return
    const per = Math.floor(task.total / task.groups)
    spec.zones.forEach((z) => {
      const have = zoneItems(latest.current, z).filter((i) => i.def === source.def)
      have.slice(per).forEach((i) => remove(i.uid))
      for (let n = have.length; n < per; n++) {
        const uid = spawn(source.def, { room: source.room, at: source.at, zone: z })
        if (uid) mine.current = [...mine.current, uid]
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    if (!active || phase !== 'thanks' || !spec.giveTo) return
    spec.zones.flatMap((z) => zoneItems(latest.current, z)).forEach((i) => consume(i.uid))
    const name = cast.seeds[spec.giveTo]?.name
    if (name) {
      cast.emote(spec.giveTo, 'cor')
      cast.announce(`Has repartit tot ${toPlace(name)}.`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const answer = shareAnswer(counts, left, task.ask, task.take)
  const submit = useCallback(async (): Promise<void> => {
    if (!active || phase !== 'asking' || answer === undefined) return
    await errand.submit(choiceForValue(String(answer), item))
  }, [active, phase, answer, errand, item])

  return { state: taskState(phase, placed), counts, left, caption: shareCaption(counts, left, task.groups), ready: answer !== undefined, submit, hint: errand.hintText }
}
