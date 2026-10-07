import { COMMON_PASSWORD_LIST } from './commonPasswords.js'

/** Lower-cased set of very common passwords (built in, no network access). */
export const COMMON_PASSWORDS: ReadonlySet<string> = new Set(COMMON_PASSWORD_LIST.map((p) => p.toLowerCase()))

const ASCENDING = '0123456789'
const DESCENDING = '9876543210'

const isRepeatedChar = (p: string): boolean => p.length > 0 && [...p].every((c) => c === p[0])

/** True for runs of consecutive digits, ascending or descending, wrapping 9 -> 0 (e.g. 1234567890, 98765432109). */
function isSequentialDigits(p: string): boolean {
  if (!/^\d+$/.test(p)) return false
  const cycle = (s: string): string => s.repeat(Math.ceil(p.length / 10) + 2)
  return cycle(ASCENDING).includes(p) || cycle(DESCENDING).includes(p)
}

/** M3: rejects listed common passwords, single repeated characters and sequential digits (case-insensitive). */
export function isWeakPassword(password: string): boolean {
  const lower = password.toLowerCase()
  return COMMON_PASSWORDS.has(lower) || isRepeatedChar(lower) || isSequentialDigits(lower)
}
