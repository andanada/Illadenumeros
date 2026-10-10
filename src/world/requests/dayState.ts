import { z } from 'zod'
import { MASTERY_THRESHOLDS } from '../../core/engine/thresholds'
import { sceneIdSchema, type SceneId } from '../model/types'
import { boardStateSchema, isBoardDone, newBoardState, recordSolved, remainingAt, remainingTotal, type BoardState } from '../board/boardState'
import type { BoardTask } from '../board/boardPlan'
import { requestSchema, statusAt, type Request } from './types'

/** Dexie `meta` key of today's ambient-requests state (local to the device, like the old board). */
export const REQUESTS_META_KEY = 'dailyRequests'

/** Estimated seconds of maths one solved request is worth (the jar counts these). */
export const REQUEST_SECONDS = 72
export const TARGET_SECONDS = MASTERY_THRESHOLDS.mission.minutes * 60
export const RECENT_WINDOW = MASTERY_THRESHOLDS.mission.softenWindow
/** Answers needed before the recent accuracy is judged. */
export const MIN_JUDGED = 5

export const dayStateSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** The frozen daily allotment and what is done (same shape as the old board, so old data migrates). */
  board: boardStateSchema,
  live: z.array(requestSchema).max(12),
  spawned: z.number().int().nonnegative(),
  /** Seconds of maths credited so far (the jar). */
  seconds: z.number().int().min(0).max(100_000),
  /** Milliseconds the child has been in the town today. */
  playedMs: z.number().int().min(0).max(86_400_000),
  recent: z.array(z.boolean()).max(RECENT_WINDOW),
  lastSolvedAt: z.partialRecord(sceneIdSchema, z.number().int().nonnegative()),
})
export type DayState = z.infer<typeof dayStateSchema>

const doneCount = (board: BoardState): number => Object.values(board.done).reduce((n, c) => n + (c ?? 0), 0)

/** A fresh day. `board` lets a day already played on the old board keep its progress. */
export const newDayState = (day: string, tasks: readonly BoardTask[], board: BoardState = newBoardState(day, tasks)): DayState => ({
  day,
  board,
  live: [],
  spawned: 0,
  seconds: doneCount(board) * REQUEST_SECONDS,
  playedMs: 0,
  recent: [],
  lastSolvedAt: {},
})

export const remainingFor = (state: DayState, place: SceneId): number => remainingAt(state.board, place)
export const remainingAll = (state: DayState): number => remainingTotal(state.board)
export const isQuotaDone = (state: DayState): boolean => isBoardDone(state.board)

export const liveAt = (state: DayState, place: SceneId): readonly Request[] => state.live.filter((r) => r.placeId === place)
export const waitingAt = (state: DayState, place: SceneId, now: number): readonly Request[] => liveAt(state, place).filter((r) => statusAt(r, now) === 'waiting')
export const waitingTotal = (state: DayState, now: number): number => state.live.filter((r) => statusAt(r, now) === 'waiting').length

/** Share right at the first try in the last answers; undefined while there are too few to judge. */
export function recentAccuracy(state: DayState): number | undefined {
  if (state.recent.length < MIN_JUDGED) return undefined
  return state.recent.filter(Boolean).length / state.recent.length
}

export const isQuiet = (state: DayState): boolean => {
  const accuracy = recentAccuracy(state)
  return accuracy !== undefined && accuracy < MASTERY_THRESHOLDS.mission.softenBelow
}

const allotted = (state: DayState): number => state.board.tasks.reduce((n, t) => n + t.count, 0)

/** Fraction of the day's maths done, 0..1 (the jar level): requests done over the day's allotment. */
export function jarLevel(state: DayState): number {
  const total = allotted(state)
  return total === 0 ? 0 : Math.min(1, (total - remainingAll(state)) / total)
}

/** Minutes of maths still to do today, rounded up (plain text for the jar's popup). */
export const minutesLeft = (state: DayState): number => Math.ceil((remainingAll(state) * REQUEST_SECONDS) / 60)

/**
 * One request was solved at `place`: leaves the live list (a waiting one first), counts on the board
 * while allotment is left (extras only give coins), credits the jar and the recent window. Immutable.
 */
export function recordResolved(state: DayState, place: SceneId, clean: boolean, now: number): DayState {
  const calm = (r: Request): number => Number(statusAt(r, now) === 'calm')
  const leaving = state.live.filter((r) => r.placeId === place).sort((a, b) => calm(a) - calm(b))[0]
  const board = recordSolved(state.board, place)
  return {
    ...state,
    board,
    live: leaving ? state.live.filter((r) => r.id !== leaving.id) : state.live,
    seconds: board !== state.board ? state.seconds + REQUEST_SECONDS : state.seconds,
    recent: [...state.recent, clean].slice(-RECENT_WINDOW),
    lastSolvedAt: { ...state.lastSolvedAt, [place]: now },
  }
}
