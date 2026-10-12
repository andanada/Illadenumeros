import type { Attempt } from '../../core/progress/applyAnswer'
import type { SkillState } from '../../core/engine/mastery'
import { coinsOf } from '../../core/storage/worldRow'
import { errandsFor } from '../../world/board/boardPlan'
import { streetEntries, capitalised } from '../../world/places/streetPlan'
import type { PlaceModule } from '../../world/places/types'
import { isPlaceOpen, unlockHint } from '../../world/places/unlock'
import { minutesDone, requestsDone, requestsTarget, REQUEST_SECONDS, type DayState } from '../../world/requests/dayState'
import type { SceneId } from '../../world/model/types'

const DAY_MS = 86_400_000
export const WEEK_DAYS = 7
export const VISIT_DAYS = 14

export interface TownPlaceRow {
  readonly id: SceneId
  /** «La Botiga». */
  readonly name: string
  readonly open: boolean
  /** Why it is closed, in plain Catalan; empty when open. */
  readonly hint: string
}

export interface TownVisit {
  readonly id: SceneId
  readonly name: string
  readonly answers: number
}

export interface TownToday {
  readonly started: boolean
  readonly done: number
  readonly target: number
  readonly minutes: number
  readonly targetMinutes: number
  readonly complete: boolean
}

export interface TownReport {
  readonly places: readonly TownPlaceRow[]
  readonly today: TownToday
  readonly solvedThisWeek: number
  readonly coins: { readonly earned: number; readonly spent: number; readonly balance: number }
  readonly visits: readonly TownVisit[]
}

export interface TownReportInput {
  readonly places: readonly PlaceModule[]
  readonly skillStates: Readonly<Record<string, SkillState>>
  /** Today's state of the requests, if the town was opened today. */
  readonly day: DayState | undefined
  readonly dailyMinutes: number
  readonly petals: number
  readonly petalsSpent: number
  /** Attempts of the town's places only (any age; filtered here). */
  readonly attempts: readonly Attempt[]
  readonly now: number
}

const isTownAttempt = (a: Attempt): boolean => a.gameId.startsWith('poble-')

function todayOf(day: DayState | undefined, dailyMinutes: number): TownToday {
  if (!day) return { started: false, done: 0, target: errandsFor(dailyMinutes), minutes: 0, targetMinutes: dailyMinutes, complete: false }
  const done = requestsDone(day)
  const target = requestsTarget(day)
  // The day's allotment was frozen when the town opened, so its minutes are the ones it really holds.
  const targetMinutes = Math.round((target * REQUEST_SECONDS) / 60)
  return { started: true, done, target, minutes: minutesDone(day), targetMinutes, complete: target > 0 && done >= target }
}

/** What the adults see of the town: pure, from local data. Never a grade, only what happened. */
export function buildTownReport(input: TownReportInput): TownReport {
  const lots = streetEntries(input.places)
  const places = lots.map<TownPlaceRow>((lot) => {
    const open = lot.place !== undefined && isPlaceOpen(lot.place, { skillStates: input.skillStates })
    return { id: lot.id, name: capitalised(lot.name), open, hint: open ? '' : unlockHint(lot.place?.unlock) }
  })
  const town = input.attempts.filter(isTownAttempt)
  const since = (days: number): number => input.now - days * DAY_MS
  const solvedThisWeek = town.filter((a) => a.correct && a.createdAt >= since(WEEK_DAYS) && a.createdAt <= input.now).length
  const recent = town.filter((a) => a.createdAt >= since(VISIT_DAYS) && a.createdAt <= input.now)
  const visits = lots
    .flatMap<TownVisit>((lot) => {
      if (!lot.place || !lot.place.gameId.startsWith('poble-')) return []
      const answers = recent.filter((a) => a.gameId === lot.place?.gameId).length
      return answers > 0 ? [{ id: lot.id, name: capitalised(lot.name), answers }] : []
    })
    .sort((a, b) => b.answers - a.answers)
  return {
    places,
    today: todayOf(input.day, input.dailyMinutes),
    solvedThisWeek,
    coins: { earned: input.petals, spent: input.petalsSpent, balance: coinsOf(input.petals, input.petalsSpent) },
    visits,
  }
}
