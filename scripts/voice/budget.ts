/**
 * Budget rules for the voice clips. Two hard limits, both checked before a single request is made:
 *  - characters sent to Azure (free tier F0 is 500,000/month; we never go above 300,000 in total);
 *  - clip payload committed to git (about 25 MB).
 * At 48 kbit/s one second of speech is 6 KB, so the payload limit (not the character one) is what binds.
 */
export interface Limits {
  readonly maxChars: number
  readonly maxBytes: number
  /** Bytes kept out of `maxBytes` for the manifest and overhead (default: RESERVED_BYTES). */
  readonly reserved?: number
}

export const LIMITS: Limits = { maxChars: 300_000, maxBytes: 25 * 1024 * 1024 }

/**
 * Extra allowance for the town's own clips (~15 MB of new payload in total, counting the few question clips still
 * pending). `maxChars` is the town's share of the 300,000 total, which the generator also checks against usage.json.
 */
export const TOWN_LIMITS: Limits = { maxChars: 150_000, maxBytes: 13 * 1024 * 1024, reserved: 0 }

/** Bytes of the manifest and small overhead reserved out of `maxBytes`. */
export const RESERVED_BYTES = 256 * 1024

/**
 * Size model of one clip: fixed part (leading/trailing silence, MP3 frame padding) plus a part per character.
 * Calibrated on real Joana clips at audio-24khz-48kbitrate-mono-mp3 (see README, "Calibration").
 */
export const BYTES_BASE = 2_700
export const BYTES_PER_CHAR = 617

/** Town clips: `audio-16khz-32kbitrate-mono-mp3`, calibrated on real clips (see README, "Calibration"). */
export const TOWN_BYTES_BASE = 3_100
export const TOWN_BYTES_PER_CHAR = 368

/**
 * The town's clips (neighbours' requests, hints, thanks...) have their own allowance on top of the question clips and
 * are encoded lighter, so the same payload buys more sentences. Same decoder in the browser (decodeAudioData).
 */
export type ClipGroup = 'base' | 'town'

export interface SizeModel {
  readonly base: number
  readonly perChar: number
}

export const SIZE_MODELS: Readonly<Record<ClipGroup, SizeModel>> = {
  base: { base: BYTES_BASE, perChar: BYTES_PER_CHAR },
  town: { base: TOWN_BYTES_BASE, perChar: TOWN_BYTES_PER_CHAR },
}

export const estimateBytes = (text: string, group: ClipGroup = 'base'): number => Math.round(SIZE_MODELS[group].base + SIZE_MODELS[group].perChar * text.length)

export interface Sized {
  readonly text: string
  readonly group?: ClipGroup
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
    bytes: items.reduce((sum, item) => sum + estimateBytes(item.text, item.group), 0),
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
  if (totals.bytes > limits.maxBytes - (limits.reserved ?? RESERVED_BYTES)) {
    throw new BudgetError(`Pressupost de pes superat: ${totals.bytes} > ${limits.maxBytes - (limits.reserved ?? RESERVED_BYTES)} bytes`)
  }
  return totals
}

/**
 * The whole plan (question clips + town clips): each group within its own allowance, and the characters of both
 * within the one shared total. Called by the generator before any request.
 */
export function assertPlanWithinBudget(items: readonly Sized[], limits: { base: Limits; town: Limits; maxChars: number } = { base: LIMITS, town: TOWN_LIMITS, maxChars: LIMITS.maxChars }): Totals {
  const isTown = (item: Sized): boolean => item.group === 'town'
  assertWithinBudget(items.filter((i) => !isTown(i)), limits.base)
  assertWithinBudget(items.filter(isTown), limits.town)
  const total = totalsOf(items)
  if (total.chars > limits.maxChars) throw new BudgetError(`Pressupost de caràcters superat: ${total.chars} > ${limits.maxChars}`)
  return total
}
