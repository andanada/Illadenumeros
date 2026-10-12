import { useEffect, useState } from 'react'
import { todayKey, useProgress } from '../../core/progress/store'
import { DEFAULT_DAILY_MINUTES, readDailyMinutes } from '../../core/storage/meta'
import { getDb } from '../../core/storage/playerDbs'
import { WORLD_ROW_ID, worldRowSchema } from '../../core/storage/worldRow'
import { PLACES } from '../../world/places/registry'
import { dayStateSchema, REQUESTS_META_KEY } from '../../world/requests/dayState'
import { parseAttempts } from './attemptSchema'
import { buildTownReport, VISIT_DAYS, type TownReport } from './townReport'

export type TownReportState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; report: TownReport }

const DAY_MS = 86_400_000

/** Reads the active player's town data (today's requests, coins, recent poble-* attempts) from this device. */
export function useTownReport(now: () => number = Date.now): TownReportState {
  const playerId = useProgress((s) => s.activePlayerId)
  const skillStates = useProgress((s) => s.skillStates)
  const petals = useProgress((s) => s.rewards.petals)
  const [state, setState] = useState<{ playerId: string | undefined; result: TownReportState }>()

  useEffect(() => {
    let active = true
    const at = now()
    const db = getDb()
    Promise.resolve()
      .then(async () => {
        const [dayRow, worldRow, attempts, minutes] = await Promise.all([
          db.meta.get(REQUESTS_META_KEY),
          db.world.get(WORLD_ROW_ID),
          db.attempts.filter((a) => typeof a.gameId === 'string' && a.gameId.startsWith('poble-') && a.createdAt >= at - VISIT_DAYS * DAY_MS).toArray(),
          readDailyMinutes(db).catch(() => DEFAULT_DAILY_MINUTES),
        ])
        const day = dayStateSchema.safeParse(dayRow?.value)
        const world = worldRowSchema.safeParse(worldRow)
        return buildTownReport({
          places: PLACES,
          skillStates,
          day: day.success && day.data.day === todayKey(at) ? day.data : undefined,
          dailyMinutes: minutes,
          petals,
          petalsSpent: world.success ? world.data.petalsSpent : 0,
          attempts: parseAttempts(attempts),
          now: at,
        })
      })
      .then((report) => active && setState({ playerId, result: { status: 'ready', report } }))
      .catch(() => active && setState({ playerId, result: { status: 'error' } }))
    return () => {
      active = false
    }
    // `now` is read when the data changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, skillStates, petals])

  return state && state.playerId === playerId ? state.result : { status: 'loading' }
}
