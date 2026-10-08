import { createRng } from '../../core/rng'
import { regularOf } from '../stickers/catalog'

/** Source of "now" (ms). Injected in tests; the app passes `Date.now`. */
export type Clock = () => number

export const DAILY_PETALS = 15
const DAILY_SERIES = 'repte'
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Calendar day ("YYYY-MM-DD") of an instant in a time zone (the device's one when omitted).
 * Same format as the progress store's todayKey, but the zone can be fixed so tests never depend on the machine.
 */
export function dayKey(now: number, timeZone?: string): string {
  return new Intl.DateTimeFormat('sv-SE', { ...(timeZone ? { timeZone } : {}), year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** Day arithmetic on the date string itself (UTC maths), so daylight-saving changes cannot shift it. */
export function addDays(day: string, delta: number): string {
  const [y = 0, m = 1, d = 1] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10)
}

export interface DailyGoal {
  /** Questions in the challenge. */
  of: number
  /** Questions to get right at the first try. */
  target: number
}

export interface DailyChallenge {
  day: string
  gameId: string
  goal: DailyGoal
}

/** Games that can host a challenge: they all accept a round limit and finish by themselves. */
export const CHALLENGE_GAMES: readonly string[] = [
  'repte-illa',
  'duel-llampec',
  'tren-sumes',
  'pesca-sumes',
  'bombolles',
  'marc-magic',
  'cursa-recta',
  'fleca-files',
  'llaminadures',
  'botiga-pluja',
  'numero-amagat',
  'pastis-fraccions',
  'detectiu-errors',
  'contes-numeros',
  'escape-room',
]

const GOALS: readonly DailyGoal[] = [
  { of: 10, target: 8 },
  { of: 8, target: 6 },
  { of: 6, target: 5 },
]
/** The escape room always has five doors. */
const ESCAPE_GOAL: DailyGoal = { of: 5, target: 4 }

/**
 * The challenge of a day: the same date always gives the same game order and goal on every device.
 * The first game of that order the child has open is offered (`isOpen`), so nobody gets a closed game.
 */
export function challengeFor(day: string, isOpen: (gameId: string) => boolean = () => true, games: readonly string[] = CHALLENGE_GAMES): DailyChallenge | undefined {
  if (!DAY_RE.test(day)) return undefined
  const rng = createRng(`repte-diari:${day}`)
  const order = rng.shuffle(games)
  const goal = rng.pick(GOALS)
  const gameId = order.find(isOpen)
  if (gameId === undefined) return undefined
  return { day, gameId, goal: gameId === 'escape-room' ? ESCAPE_GOAL : goal }
}

export const goalReached = (goal: DailyGoal, correct: number): boolean => correct >= goal.target

/** The sticker of the day: the order of the series depends on the date; nothing when the series is complete. */
export function dailyStickerFor(day: string, owned: readonly string[]): string | undefined {
  const order = createRng(`repte-pegatina:${day}`).shuffle(regularOf(DAILY_SERIES))
  return order.find((s) => !owned.includes(s.id))?.id
}

/**
 * Days in a row with a finished challenge, counted back from today. Forgiving by design: today still
 * pending does not break it, and a single missed day is bridged (only two missed days in a row end it).
 */
export function streakOf(done: ReadonlySet<string>, today: string): number {
  let day = done.has(today) ? today : addDays(today, -1)
  let count = 0
  let gap = 0
  for (let i = 0; i < 400; i++) {
    if (done.has(day)) {
      count += 1
      gap = 0
    } else {
      gap += 1
      if (gap >= 2) break
    }
    day = addDays(day, -1)
  }
  return count
}

export interface CalendarCell {
  day: string
  done: boolean
  today: boolean
}

/** The last `days` days ending today (oldest first), for the little calendar on the map. */
export function recentCalendar(done: ReadonlySet<string>, today: string, days = 7): CalendarCell[] {
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(today, i - (days - 1))
    return { day, done: done.has(day), today: day === today }
  })
}
