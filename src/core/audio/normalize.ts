/**
 * One shared text normalisation for speech, used by the runtime (`speak`) and by the clip generator
 * (`scripts/voice`), so the text that is looked up is exactly the text that was synthesised.
 * Math symbols become the Catalan words a teacher would say; emoji and decorative marks are dropped.
 */

const UNIT_WORDS: Readonly<Record<string, string>> = {
  km: 'quilòmetres',
  cm: 'centímetres',
  mm: 'mil·límetres',
  kg: 'quilos',
  mL: 'mil·lilitres',
  ml: 'mil·lilitres',
  cL: 'centilitres',
  L: 'litres',
  m: 'metres',
  g: 'grams',
  cts: 'cèntims',
}

// Longest first, so "km" is not read as "k" + "m". `\p{L}` keeps "1 més" from matching the unit "m".
const UNIT_ALTERNATIVES = Object.keys(UNIT_WORDS)
  .sort((a, b) => b.length - a.length)
  .join('|')
const UNIT_PATTERN = new RegExp(String.raw`(\d)\s*(${UNIT_ALTERNATIVES})(?![\p{L}\d])`, 'gu')

// Emoji, variation selector and zero-width joiner: decorative, never read aloud.
const INVISIBLE = String.fromCodePoint(0xfe0f, 0x200d)
const DECORATION = new RegExp(String.raw`[\p{Extended_Pictographic}${INVISIBLE}]`, 'gu')

// An operand sits on both sides of a colon used as a division sign ("12 : 4", "? : 3"); prose colons do not.
const DIVISION_COLON = /(?<=[\d?)]\s*):(?=\s*[\d?(])/g
const HYPHEN_MINUS = /(?<=[\d?)]\s+)-(?=\s+[\d?(])/g

/** Text as it is sent to the voice (and used as the clip key). Pure and idempotent. */
export function normalizeSpeech(text: string): string {
  return text
    .replace(DECORATION, ' ')
    .replace(UNIT_PATTERN, (_, digit: string, unit: string) => `${digit} ${UNIT_WORDS[unit] ?? unit}`)
    .replace(/(?<![\d,.])1\s*€/g, ' 1 euro')
    .replace(/\s*€/g, ' euros')
    .replace(/\s*%/g, ' per cent')
    .replace(/[−–]/g, ' menys ')
    .replace(HYPHEN_MINUS, ' menys ')
    .replace(/[×·]/g, ' per ')
    .replace(/÷/g, ' entre ')
    .replace(DIVISION_COLON, ' entre ')
    .replace(/\+/g, ' més ')
    .replace(/=/g, ' és igual a ')
    .replace(/</g, ' és menor que ')
    .replace(/>/g, ' és major que ')
    .replace(/²/g, ' al quadrat')
    .replace(/³/g, ' al cub')
    .replace(/\s+/g, ' ')
    .replace(/\s+([?!.,;:])/g, '$1')
    .trim()
}

const KEY_LENGTH = 12

/**
 * Stable 48-bit content hash of the normalised text (cyrb53 variant), as 12 hex digits.
 * Synchronous on purpose: the browser can compute it without `crypto.subtle`.
 */
export function clipKey(normalized: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i)
    h1 = Math.imul(h1 ^ code, 2654435761)
    h2 = Math.imul(h2 ^ code, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  const hex = (n: number): string => (n >>> 0).toString(16).padStart(8, '0')
  return (hex(h2) + hex(h1)).slice(-KEY_LENGTH)
}

/** Key of a raw (not yet normalised) phrase. */
export const clipKeyFor = (text: string): string => clipKey(normalizeSpeech(text))
