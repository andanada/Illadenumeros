import { z } from 'zod'
import { sceneIdSchema, type CatalogEntry, type SceneId } from '../model/types'
import type { BoardTask } from './boardPlan'

/**
 * Today's board as stored for one player (Dexie `meta` row 'errandBoard', local to the device): the plan is
 * FROZEN when the day's board is first opened (progress made during the day never reshuffles it), plus the
 * errands done per place and the surprise gift once claimed. Completion of the whole board is ALSO written
 * to `rewards.missionsDone` (synced, read by the adults' pages), exactly like the old daily mission.
 */
export const BOARD_META_KEY = 'errandBoard'

const catalogId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(40)

const taskSchema = z.object({
  place: sceneIdSchema,
  count: z.number().int().min(1).max(50),
  kind: z.enum(['calentament', 'repte', 'repas']),
  neighbour: z.string().min(1).max(40),
})

export const boardStateSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tasks: z.array(taskSchema).max(20),
  done: z.partialRecord(sceneIdSchema, z.number().int().min(0).max(50)),
  gift: catalogId.optional(),
})
export type BoardState = z.infer<typeof boardStateSchema>

export const newBoardState = (day: string, tasks: readonly BoardTask[]): BoardState => ({ day, tasks: tasks.map((t) => ({ ...t })), done: {} })

const taskOf = (state: BoardState, place: SceneId): BoardState['tasks'][number] | undefined => state.tasks.find((t) => t.place === place)

/** Errands still waiting at `place` today. */
export const remainingAt = (state: BoardState, place: SceneId): number => Math.max(0, (taskOf(state, place)?.count ?? 0) - (state.done[place] ?? 0))

export const remainingTotal = (state: BoardState): number => state.tasks.reduce((n, t) => n + remainingAt(state, t.place), 0)

export const isBoardDone = (state: BoardState): boolean => state.tasks.length > 0 && remainingTotal(state) === 0

/** An errand was solved at `place`. Extra errands (none left there) change nothing: they only give coins. */
export function recordSolved(state: BoardState, place: SceneId): BoardState {
  if (remainingAt(state, place) === 0) return state
  return { ...state, done: { ...state.done, [place]: (state.done[place] ?? 0) + 1 } }
}

const GIFT_KINDS: ReadonlySet<CatalogEntry['kind']> = new Set(['top', 'bottom', 'shoes', 'accessory', 'furniture'])

/**
 * The day's surprise: a clothing item or a piece of furniture she does not own yet, from those that cost
 * coins (a gift worth having). Same day + same wardrobe = same gift. Undefined when she owns everything.
 */
export function pickGift(entries: readonly CatalogEntry[], owned: readonly string[], seed: number): CatalogEntry | undefined {
  const mine = new Set(owned)
  const candidates = entries.filter((e) => GIFT_KINDS.has(e.kind) && e.price > 0 && !mine.has(e.id)).sort((a, b) => a.id.localeCompare(b.id))
  return candidates[seed % Math.max(candidates.length, 1)]
}
