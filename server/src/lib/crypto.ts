import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'

export const newId = (): string => randomUUID()

/** 32 random bytes, base64url. Only its SHA-256 is persisted. */
export const newSessionToken = (): string => randomBytes(32).toString('base64url')

export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex')

/** Constant-time string comparison that does not leak the length of the secret. */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb) && a.length === b.length
}

/** Salted, keyed hash of an IP or user agent. Not reversible without the salt. */
export const saltedHash = (salt: string, value: string): string => createHmac('sha256', salt).update(value).digest('hex').slice(0, 32)

export const normalizeEmail = (email: string): string => email.trim().toLowerCase()
