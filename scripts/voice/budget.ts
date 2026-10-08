/**
 * Budget rules for the voice clips. Two hard limits, both checked before a single request is made:
 *  - characters sent to Azure (free tier F0 is 500,000/month; we never go above 300,000 in total);
 *  - clip payload committed to git (about 25 MB).
 * At 48 kbit/s one second of speech is 6 KB, so the payload limit (not the character one) is what binds.
 */
export interface Limits {
  readonly maxChars: number
  readonly maxBytes: number
}

export const LIMITS: Limits = { maxChars: 300_000, maxBytes: 25 * 1024 * 1024 }

/** Bytes of the manifest and small overhead reserved out of `maxBytes`. */
export const RESERVED_BYTES = 256 * 1024

/**
 * Size model of one clip: fixed part (leading/trailing silence, MP3 frame padding) plus a part per character.
 * Calibrated on real Joana clips at audio-24khz-48kbitrate-mono-mp3 (see README, "Calibration").
 */
export const BYTES_BASE = 2_700
export const BYTES_PER_CHAR = 617

export const estimateBytes = (text: string): number => Math.round(BYTES_BASE + BYTES_PER_CHAR * text.length)

export interface Sized {
  readonly text: string
}

export interface Totals {
  readonly clips: number
  readonly chars: number
  readonly bytes: number
}

export function totalsOf(items: readonly Sized[]): Totals {
  return {
    clips: items.length,
    chars: items.reduce((sum, item) => sum + item.text.length, 0),
    bytes: items.reduce((sum, item) => sum + estimateBytes(item.text), 0),
  }
}

export class BudgetError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BudgetError'
  }
}

/** Throws unless the selection fits both limits. Called by the generator before any network request. */
export function assertWithinBudget(items: readonly Sized[], limits: Limits = LIMITS): Totals {
  const totals = totalsOf(items)
  if (totals.chars > limits.maxChars) {
    throw new BudgetError(`Pressupost de caràcters superat: ${totals.chars} > ${limits.maxChars}`)
  }
  if (totals.bytes > limits.maxBytes - RESERVED_BYTES) {
    throw new BudgetError(`Pressupost de pes superat: ${totals.bytes} > ${limits.maxBytes - RESERVED_BYTES} bytes`)
  }
  return totals
}
