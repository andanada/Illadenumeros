import { useEffect, useMemo, useState } from 'react'
import { matesAmbit } from '../../ambits/mates'
import { useProgress } from '../../core/progress/store'
import { getDb } from '../../core/storage/playerDbs'
import type { Attempt } from '../../core/progress/applyAnswer'
import { parseAttempts } from './attemptSchema'
import { buildProgressReport, type ProgressReport } from './analytics/report'

export type ReportState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; report: ProgressReport }

/** Reads the active player's attempts once and builds the dashboard report from local data. */
export function useProgressReport(enabled: boolean, now: () => number = Date.now): ReportState {
  const playerId = useProgress((s) => s.activePlayerId)
  const skillStates = useProgress((s) => s.skillStates)
  const factStates = useProgress((s) => s.factStates)
  const daysPlayed = useProgress((s) => s.rewards.daysPlayed)
  const [loaded, setLoaded] = useState<{ playerId: string | undefined; attempts: Attempt[] } | 'error'>()

  useEffect(() => {
    if (!enabled) return
    let active = true
    Promise.resolve()
      .then(() => getDb().attempts.toArray())
      .then((rows) => active && setLoaded({ playerId, attempts: parseAttempts(rows) }))
      .catch(() => active && setLoaded('error'))
    return () => {
      active = false
    }
  }, [enabled, playerId])

  return useMemo<ReportState>(() => {
    if (!enabled || loaded === undefined || (loaded !== 'error' && loaded.playerId !== playerId)) return { status: 'loading' }
    if (loaded === 'error') return { status: 'error' }
    return { status: 'ready', report: buildProgressReport({ skills: matesAmbit.skills, skillStates, factStates, daysPlayed, attempts: loaded.attempts }, now()) }
    // `now` is read when the data changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, loaded, playerId, skillStates, factStates, daysPlayed])
}
