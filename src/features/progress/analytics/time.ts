export const MINUTE_MS = 60_000
export const DAY_MS = 24 * 60 * MINUTE_MS

/** Local day as YYYY-MM-DD (same format the store uses for `daysPlayed`). */
export const dayKey = (at: number): string => new Date(at).toLocaleDateString('sv-SE')

export const startOfDay = (at: number): number => {
  const d = new Date(at)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Calendar day number (local date), immune to daylight saving changes. */
export const dayIndex = (at: number): number => {
  const d = new Date(at)
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS)
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export const daysBetween = (from: number, to: number): number => dayIndex(to) - dayIndex(from)

/** Timestamp of the local noon `offset` days from `at` (safe for DST). */
export const addDays = (at: number, offset: number): number => {
  const d = new Date(at)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset, 12).getTime()
}
