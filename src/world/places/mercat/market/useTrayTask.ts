import { useCallback, useEffect, useMemo, useRef } from 'react'
import { choiceForValue } from '../../../errands/adapters'
import { useCast } from '../../../sandbox/CastContext'
import { useItems } from '../../../sandbox/ItemsContext'
import { pilePoints, taskState, type TaskState } from '../../../sandbox/logic/requestTask'
import { zoneCounts } from '../../../sandbox/logic/zones'
import type { TaskErrand } from '../../../sandbox/useRequestTask'
import { centsOfPiece, pieceId } from './MoneyArt'
import { coinPile, formatLike, type TrayTask } from './priceLogic'
import { PILE_AT, ROOM } from './rooms'

export interface TrayView {
  state: TaskState
  /** Cents lying on the tray right now (never shown: adding up is her job). */
  total: number
  submit: () => Promise<void>
  hint: string | undefined
}

const TRAY = 'safata'

/** Cents on the tray: every piece counts its own value. Pure over the zone's counts. */
export const trayTotal = (counts: Readonly<Record<string, number>>): number => Object.entries(counts).reduce((sum, [def, n]) => sum + (centsOfPiece(def) ?? 0) * n, 0)

/**
 * Heaps the coins and notes of the counter, reads what she puts on the cashier tray and answers with that sum
 * through the errand's flow. A wrong sum sends every piece back to the heap (no red, no loss); the last try lays the
 * exact pieces on the tray.
 */
export function useTrayTask(errand: TaskErrand, task: TrayTask, active: boolean): TrayView {
  const { spawn, remove, place, putInZone } = useItems()
  const { announce } = useCast()
  const items = useItems((api) => api.items)
  const floorTop = useItems((api) => api.floorTop)
  const mine = useRef<string[]>([])
  const latest = useRef(items)
  useEffect(() => {
    latest.current = items
  })
  const total = useMemo(() => trayTotal(zoneCounts(items, TRAY)), [items])
  const { item, phase, tries } = errand
  const pile = useMemo(() => coinPile(task.target), [task.target])

  const clear = useCallback(() => {
    for (const uid of mine.current) remove(uid)
    mine.current = []
  }, [remove])

  useEffect(() => {
    clear()
    if (!active) return
    const spots = pilePoints(PILE_AT, pile.length, floorTop)
    pile.forEach((cents, n) => {
      const uid = spawn(pieceId(cents), { room: ROOM, at: spots[n] ?? PILE_AT })
      if (uid) mine.current = [...mine.current, uid]
    })
    return clear
    // The item and its pile decide what lies on the counter; spawn/remove are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, active, pile])

  const seen = useRef(tries)
  useEffect(() => {
    if (active && tries > seen.current) {
      const spots = pilePoints(PILE_AT, mine.current.length, floorTop)
      mine.current.forEach((uid, n) => place(uid, { room: ROOM, at: spots[n] ?? PILE_AT }))
      announce('Ho tornem a provar: les monedes han tornat al munt.')
    }
    seen.current = tries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tries])

  // After the last try the exact pieces are laid on the tray.
  useEffect(() => {
    if (!active || phase !== 'shown') return
    const spots = pilePoints(PILE_AT, mine.current.length, floorTop)
    mine.current.forEach((uid, n) => place(uid, { room: ROOM, at: spots[n] ?? PILE_AT }))
    const wanted = [...pile]
    const exact: number[] = []
    let left = task.target
    for (const cents of [...wanted].sort((a, b) => b - a)) {
      if (cents <= left) {
        exact.push(cents)
        left -= cents
      }
    }
    const used = new Set<string>()
    for (const cents of exact) {
      const uid = mine.current.find((u) => !used.has(u) && latest.current[u]?.def === pieceId(cents))
      if (uid) {
        used.add(uid)
        putInZone(uid, TRAY)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const submit = useCallback(async (): Promise<void> => {
    if (!active || phase !== 'asking' || total === 0) return
    await errand.submit(choiceForValue(formatLike(item.answer, total), item))
  }, [active, phase, total, errand, item])

  return { state: taskState(phase, total > 0 ? 1 : 0), total, submit, hint: errand.hintText }
}
