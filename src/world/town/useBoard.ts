import { useCallback, useEffect, useRef } from 'react'
import { MATES_SKILLS } from '../../ambits/mates/skills'
import { todayKey, useProgress } from '../../core/progress/store'
import { buildBoard } from '../board/boardPlan'
import { remainingAt, remainingTotal, type BoardState } from '../board/boardState'
import { dismissReveal, openBoard, solveAt, useBoardStore, type BoardReveal } from '../board/boardStore'
import type { SceneId } from '../model/types'
import type { PlaceModule } from '../places/types'

export interface TownBoard {
  readonly board: BoardState | undefined
  /** Errands still on today's board (all places). */
  readonly pending: number
  readonly pendingAt: (place: SceneId) => number
  readonly solved: (place: SceneId) => void
  readonly reveal: BoardReveal | undefined
  readonly dismiss: () => void
}

/** Today's errand board for the active child; `now` is the clock (injected by tests). */
export function useBoard(now: () => number, openPlaces: readonly PlaceModule[]): TownBoard {
  const board = useBoardStore((s) => s.board)
  const status = useBoardStore((s) => s.status)
  const reveal = useBoardStore((s) => s.reveal)
  const activeId = useProgress((s) => s.activePlayerId)
  const day = todayKey(now())
  const opening = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (activeId === undefined) return
    if (status === 'ready' && board?.day === day) return
    const key = `${activeId}:${day}:${status}`
    if (opening.current === key) return
    opening.current = key
    const { skillStates, factStates } = useProgress.getState()
    void openBoard(day, () => buildBoard({ day, places: openPlaces.map((p) => ({ id: p.id, skills: p.skills })), skills: MATES_SKILLS, states: skillStates, factStates }).tasks)
  }, [activeId, status, board?.day, day, openPlaces])

  const today = board?.day === day ? board : undefined
  const pendingAt = useCallback((place: SceneId) => (today ? remainingAt(today, place) : 0), [today])
  const solved = useCallback((place: SceneId) => void solveAt(place), [])
  return { board: today, pending: today ? remainingTotal(today) : 0, pendingAt, solved, reveal, dismiss: dismissReveal }
}
