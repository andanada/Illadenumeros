/** Euro denominations in cents, from the biggest to the smallest. */
export const DENOMINATIONS = [2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1] as const

/** Values from 5 € up are drawn as notes, the rest as coins. */
export const NOTE_FROM = 500

export const isNote = (cents: number): boolean => cents >= NOTE_FROM

/** "2,50 €", "3 €" (no decimals when exact), "0,50 €". Catalan decimal comma. */
export function formatEuros(cents: number): string {
  const safe = Math.max(0, Math.round(cents))
  const euros = Math.floor(safe / 100)
  const rest = safe % 100
  return rest === 0 ? `${euros} €` : `${euros},${String(rest).padStart(2, '0')} €`
}

/** Short label for one piece: "50 cts", "2 €", "10 €". */
export function pieceLabel(cents: number): string {
  return cents < 100 ? `${cents} cts` : `${cents / 100} €`
}

export const sumCents = (pieces: readonly number[]): number => pieces.reduce((total, p) => total + p, 0)

/** Change owed: never negative. */
export function changeDue(price: number, given: number): number {
  return Math.max(0, given - price)
}

/** Greedy split of an amount into the fewest pieces (valid for the euro system). */
export function breakdown(cents: number): number[] {
  const pieces: number[] = []
  let left = Math.max(0, Math.round(cents))
  for (const d of DENOMINATIONS) {
    while (left >= d) {
      pieces.push(d)
      left -= d
    }
  }
  return pieces
}

export type PayStatus = 'short' | 'exact' | 'over'

export function payStatus(paid: number, target: number): PayStatus {
  return paid === target ? 'exact' : paid < target ? 'short' : 'over'
}

/** Pieces offered in the purse: all those needed for the target plus a few common extras (never cutting the needed ones). */
export function purseFor(target: number): number[] {
  const needed = breakdown(target)
  const room = Math.max(0, 14 - needed.length)
  const extras = [100, 50, 200, 20, 10].filter((d) => d <= Math.max(target, 200)).slice(0, Math.max(room, 2))
  return [...needed, ...extras].sort((x, y) => y - x)
}

/** Parses an amount like "2,50 €", "1,5", "50 cts" or "3 euros" into cents; undefined when it is not a number. */
export function parseEuros(text: string): number | undefined {
  const m = /(\d+)(?:[.,](\d{1,2}))?/.exec(text)
  if (!m) return undefined
  const whole = Number(m[1])
  if (m[2] === undefined && /cts|cèntim|centim/i.test(text)) return whole
  const decimals = m[2] === undefined ? 0 : Number(m[2].padEnd(2, '0'))
  return whole * 100 + decimals
}
