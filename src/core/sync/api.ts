import { z } from 'zod'
import type { OutgoingAttempt, OutgoingDoc, ProfileInput } from './schemas'

/*
 * Tiny same-origin client for the family API (server/README.md). Cookie session (HttpOnly; no token
 * in JS), CSRF headers on every non-GET, 15 s timeout, every response parsed with zod (unknown
 * fields stripped). Passwords are only sent, never stored or logged.
 */

export const API_TIMEOUT_MS = 15_000

export interface Issue {
  readonly path: string
  readonly code: string
}

/** status 0 = no answer (code 'network' or 'timeout'). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly issues?: readonly Issue[]
  readonly retryAfterMs?: number

  constructor(status: number, code: string, issues?: readonly Issue[], retryAfterMs?: number) {
    super(code)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    if (issues !== undefined) this.issues = issues
    if (retryAfterMs !== undefined) this.retryAfterMs = retryAfterMs
  }
}

const familySchema = z.object({ id: z.string(), email: z.string() })

export const remoteProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  character: z.string().nullable(),
  color: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type RemoteProfile = z.infer<typeof remoteProfileSchema>

const authSchema = z.object({ family: familySchema, profiles: z.array(remoteProfileSchema) })
export type AuthResponse = z.infer<typeof authSchema>

const okSchema = z.object({ ok: z.literal(true) })
const profilesSchema = z.object({ profiles: z.array(remoteProfileSchema) })
const profileSchema = z.object({ profile: remoteProfileSchema })

const syncResponseSchema = z.object({
  seq: z.number().int().min(0),
  docs: z.array(z.object({ kind: z.string(), key: z.string(), data: z.unknown(), updatedAt: z.number(), seq: z.number() })),
  attempts: z.array(z.object({ id: z.string(), data: z.unknown(), createdAt: z.number(), seq: z.number() })),
  hasMore: z.boolean(),
})
export type SyncResponse = z.infer<typeof syncResponseSchema>

export interface SyncRequest {
  readonly since: number
  readonly push: { readonly docs: readonly OutgoingDoc[]; readonly attempts: readonly OutgoingAttempt[] }
}

const errorBodySchema = z.object({
  error: z.string().max(64),
  issues: z.array(z.object({ path: z.string(), code: z.string() })).optional(),
})

export interface ApiOptions {
  readonly fetch?: typeof fetch
  readonly timeoutMs?: number
}

function retryAfterMs(res: Response): number | undefined {
  const seconds = Number(res.headers.get('Retry-After'))
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined
}

async function errorFrom(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => undefined)
  const parsed = errorBodySchema.safeParse(body)
  const code = parsed.success ? parsed.data.error : `http_${res.status}`
  return new ApiError(res.status, code, parsed.success ? parsed.data.issues : undefined, retryAfterMs(res))
}

export function createApi(options: ApiOptions = {}) {
  const timeoutMs = options.timeoutMs ?? API_TIMEOUT_MS

  async function call<T>(method: string, path: string, schema: z.ZodType<T>, body?: unknown): Promise<T> {
    const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const headers: Record<string, string> = method === 'GET' ? { Accept: 'application/json' } : { 'Content-Type': 'application/json', 'X-Requested-With': 'mm' }
    let res: Response
    try {
      res = await doFetch(`/api${path}`, {
        method,
        credentials: 'same-origin',
        cache: 'no-store',
        headers,
        signal: controller.signal,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
    } catch {
      throw new ApiError(0, controller.signal.aborted ? 'timeout' : 'network')
    } finally {
      clearTimeout(timer)
    }
    if (!res.ok) throw await errorFrom(res)
    const parsed = schema.safeParse(await res.json().catch(() => undefined))
    if (!parsed.success) throw new ApiError(res.status, 'bad_response')
    return parsed.data
  }

  const ok = async (method: string, path: string, body?: unknown): Promise<void> => {
    await call(method, path, okSchema, body)
  }

  return {
    me: () => call('GET', '/auth/me', authSchema),
    register: (email: string, password: string, inviteCode: string) => call('POST', '/auth/register', authSchema, { email, password, inviteCode }),
    login: (email: string, password: string) => call('POST', '/auth/login', authSchema, { email, password }),
    logout: () => ok('POST', '/auth/logout', {}),
    changePassword: (current: string, next: string) => ok('POST', '/auth/change-password', { current, new: next }),
    deleteAccount: (password: string) => ok('DELETE', '/account', { password }),
    listProfiles: async () => (await call('GET', '/profiles', profilesSchema)).profiles,
    putProfile: async (id: string, input: ProfileInput) => (await call('PUT', `/profiles/${encodeURIComponent(id)}`, profileSchema, input)).profile,
    deleteProfile: (id: string, purge: boolean) => ok('DELETE', `/profiles/${encodeURIComponent(id)}${purge ? '?purge=true' : ''}`, {}),
    sync: (id: string, request: SyncRequest) => call('POST', `/profiles/${encodeURIComponent(id)}/sync`, syncResponseSchema, request),
  }
}

export type Api = ReturnType<typeof createApi>
