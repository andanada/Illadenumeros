import { getDb } from '../../../core/storage/playerDbs'
import { SPEED_GAME_IDS, type PastAttempt } from './personalBest'

const WINDOW_DAYS = 45
const DAY_MS = 24 * 60 * 60 * 1000

/** The child's own recent speed-game attempts (empty if the database cannot be read). */
export async function loadPastAttempts(now: number): Promise<PastAttempt[]> {
  try {
    const rows = await getDb().attempts.where('createdAt').above(now - WINDOW_DAYS * DAY_MS).toArray()
    return rows
      .filter((row) => SPEED_GAME_IDS.includes(row.gameId))
      .map(({ gameId, correct, hintsUsed, rtMs, createdAt }) => ({ gameId, correct, hintsUsed, rtMs, createdAt }))
  } catch {
    return []
  }
}
