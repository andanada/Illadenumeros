import { useCallback, useEffect, useMemo, useRef } from 'react'
import { choiceForValue } from '../../../errands/adapters'
import { useCast } from '../../../sandbox/CastContext'
import { useItems } from '../../../sandbox/ItemsContext'
import { pilePoints, taskState, type TaskState } from '../../../sandbox/logic/requestTask'
import { zoneCounts } from '../../../sandbox/logic/zones'
import type { TaskErrand } from '../../../sandbox/useRequestTask'
import { BOWL_IDS, PILE_AT } from './shareLayout'
import { evaluateShare, leftoverSaid, type ShareReading, type ShareTask } from './shareLogic'

export interface ShareTaskView {
  state: TaskState
  reading: ShareReading
  /** What lies in each bowl / carton right now. */
  bowls: readonly number[]
  /** Spoken after a right sharing that leaves something over. */
  leftover: string
  submit: () => Promise<void>
  hint: string | undefined
}

/** The def of the loose things: grains of feed, or eggs for the boxes. */
export const shareDef = (task: ShareTask): string => (task.mode === 'groups' ? 'ou-peticio' : 'gra')

/** Equal numbers in each bowl, with what is left: the pile's remainder, or the cartons that fill up. */
export function shareSolution(task: ShareTask): readonly number[] {
  return task.mode === 'groups' ? Array.from({ length: task.parts }, () => task.size) : Array.from({ length: task.parts }, () => Math.floor(task.total / task.size))
}

/**
 * Lays the loose things out as a pile, reads what ends up in each bowl and answers through the errand's flow
 * (same attempt / hint / Leitner pipeline). A wrong sharing sends everything back to the pile, no red anywhere.
 */
export function useShareTask(errand: TaskErrand, task: ShareTask, room: string, active: boolean): ShareTaskView {
  const { spawn, remove, place, putInZone } = useItems()
  const cast = useCast()
  const items = useItems((api) => api.items)
  const floorTop = useItems((api) => api.floorTop)
  const ids = useMemo(() => BOWL_IDS(task.parts), [task.parts])
  const def = shareDef(task)
  const mine = useRef<string[]>([])
  const latest = useRef(items)
  useEffect(() => {
    latest.current = items
  })

  const bowls = useMemo(() => ids.map((id) => zoneCounts(items, id)[def] ?? 0), [items, ids, def])
  const left = Math.max(0, task.total - bowls.reduce((a, b) => a + b, 0))
  const reading = evaluateShare(task, bowls, left)
  const { item, phase, tries } = errand

  const clear = useCallback(() => {
    for (const uid of mine.current) remove(uid)
    mine.current = []
  }, [remove])

  const heap = useCallback(
    (uids: readonly string[]) => {
      const spots = pilePoints(PILE_AT, uids.length, floorTop)
      uids.forEach((uid, n) => place(uid, { room, at: spots[n] ?? PILE_AT }))
    },
    [place, floorTop, room],
  )

  // A new request: tidy the old things and heap the new ones.
  useEffect(() => {
    clear()
    if (!active) return
    const spots = pilePoints(PILE_AT, task.total, floorTop)
    spots.forEach((at) => {
      const uid = spawn(def, { room, at })
      if (uid) mine.current = [...mine.current, uid]
    })
    return clear
    // The item and the task decide the pile; spawn/remove are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, active, task.total, task.parts, def])

  // A wrong sharing: everything goes gently back to the pile.
  const seen = useRef(tries)
  useEffect(() => {
    if (active && tries > seen.current) {
      heap(mine.current)
      cast.announce('Ho tornem a provar: tot ha tornat a la pila.')
    }
    seen.current = tries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tries])

  // After the last try the right sharing is laid out so she can see it.
  useEffect(() => {
    if (!active || phase !== 'shown') return
    const uids = mine.current
    heap(uids)
    let next = 0
    shareSolution(task).forEach((n, i) => {
      for (let k = 0; k < n; k++) {
        const uid = uids[next++]
        const id = ids[i]
        if (uid && id) putInZone(uid, id)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const said = phase === 'thanks' ? leftoverSaid(task.mode === 'groups' ? left : task.remainder) : ''
  useEffect(() => {
    if (said) cast.announce(said)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [said])

  const submit = useCallback(async (): Promise<void> => {
    if (!active || phase !== 'asking' || !reading.ready || reading.value === undefined) return
    await errand.submit(choiceForValue(String(reading.value), item))
  }, [active, phase, reading, errand, item])

  const total = bowls.reduce((a, b) => a + b, 0)
  return { state: taskState(phase, total), reading, bowls, leftover: said, submit, hint: errand.hintText }
}
