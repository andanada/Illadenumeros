import { mergeDoc } from './merge'
import { checkOutgoingAttempt, checkOutgoingDoc, type DocData, type DocKind } from './schemas'

/*
 * In-memory imitation of the sync API at the fetch level (same routes, same merge, same seq and
 * paging rules as server/src/repo/sync.ts). Lets the engine tests run against realistic behaviour
 * and inject failures (status codes, network errors, items that the server rejects).
 */

interface ServerDoc {
  kind: DocKind
  key: string
  data: DocData
  updatedAt: number
  seq: number
}
interface ServerAttempt {
  id: string
  data: unknown
  createdAt: number
  seq: number
}
interface ServerProfile {
  id: string
  name: string
  character: string
  color: string
  createdAt: number
  updatedAt: number
}

export interface Call {
  method: string
  path: string
  body: unknown
}

type Interceptor = (call: Call) => Response | Error | undefined

const json = (status: number, body: unknown, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })

export function createFakeServer(options: { pageSize?: number; maxDocs?: number } = {}) {
  const pageSize = options.pageSize ?? 1000
  const profiles = new Map<string, ServerProfile>()
  const docs = new Map<string, Map<string, ServerDoc>>()
  const attempts = new Map<string, Map<string, ServerAttempt>>()
  const calls: Call[] = []
  const interceptors: Interceptor[] = []
  /** Doc keys / attempt ids that make the whole push fail with 422 (like a merged-invalid doc). */
  const poison = new Set<string>()
  let seq = 0
  let authed = true
  let familyId = 'familia-1'

  const docsOf = (id: string) => docs.get(id) ?? docs.set(id, new Map()).get(id)!
  const attemptsOf = (id: string) => attempts.get(id) ?? attempts.set(id, new Map()).get(id)!

  function sync(id: string, body: { since: number; push?: { docs?: unknown[]; attempts?: unknown[] } }): Response {
    const pushDocs = (body.push?.docs ?? []) as { kind: DocKind; key: string; data: unknown; updatedAt: number }[]
    const pushAttempts = (body.push?.attempts ?? []) as { id: string; data: unknown; createdAt: number }[]
    const validDocs = pushDocs.map((d) => checkOutgoingDoc(d))
    const validAttempts = pushAttempts.map((a) => checkOutgoingAttempt(a))
    const bad =
      validDocs.includes(null) || validAttempts.includes(null) || pushDocs.some((d) => poison.has(d.key)) || pushAttempts.some((a) => poison.has(a.id))
    if (bad) return json(422, { error: 'validation_failed', issues: [{ path: 'push', code: 'invalid' }] })
    const store = docsOf(id)
    if (options.maxDocs !== undefined && new Set([...store.keys(), ...pushDocs.map((d) => `${d.kind}|${d.key}`)]).size > options.maxDocs) {
      return json(409, { error: 'quota_exceeded' })
    }
    for (const d of validDocs) {
      if (!d) continue
      const k = `${d.kind}|${d.key}`
      const existing = store.get(k)
      if (!existing) {
        store.set(k, { ...d, seq: ++seq })
        continue
      }
      const merged = mergeDoc(d.kind, existing, d)
      if (JSON.stringify(merged.data) === JSON.stringify(existing.data) && merged.updatedAt === existing.updatedAt) continue
      store.set(k, { kind: d.kind, key: d.key, ...merged, seq: ++seq })
    }
    const ats = attemptsOf(id)
    for (const a of validAttempts) if (a && !ats.has(a.id)) ats.set(a.id, { ...a, seq: ++seq })
    const just = new Set(pushAttempts.map((a) => a.id))
    const items = [
      ...[...store.values()].filter((d) => d.seq > body.since).map((d) => ({ seq: d.seq, doc: d })),
      ...[...ats.values()].filter((a) => a.seq > body.since && !just.has(a.id)).map((a) => ({ seq: a.seq, attempt: a })),
    ].sort((a, b) => a.seq - b.seq)
    const page = items.slice(0, pageSize)
    const hasMore = items.length > pageSize
    const last = page[page.length - 1]
    return json(200, {
      seq: hasMore && last ? last.seq : Math.max(body.since, seq),
      docs: page.flatMap((i) => ('doc' in i && i.doc ? [i.doc] : [])),
      attempts: page.flatMap((i) => ('attempt' in i && i.attempt ? [i.attempt] : [])),
      hasMore,
    })
  }

  const me = () => json(200, { family: { id: familyId, email: 'familia@exemple.cat' }, profiles: [...profiles.values()] })

  /** Invite code 'BON-CODI', password 'contrasenya-llarga' (anything with 'feble' is weak). */
  function auth(call: Call): Response | undefined {
    const body = (call.body ?? {}) as { password?: string; inviteCode?: string; new?: string }
    if (call.path === '/api/auth/register') {
      if (body.inviteCode !== 'BON-CODI') return json(403, { error: 'invalid_invite' })
      if (String(body.password).includes('feble')) return json(422, { error: 'validation_failed', issues: [{ path: 'password', code: 'custom' }] })
      authed = true
      return json(201, { family: { id: familyId, email: 'familia@exemple.cat' }, profiles: [] })
    }
    if (call.path === '/api/auth/login') {
      if (body.password !== 'contrasenya-llarga') return json(401, { error: 'invalid_credentials' })
      authed = true
      return me()
    }
    if (call.path === '/api/auth/logout') {
      authed = false
      return json(200, { ok: true })
    }
    if (!authed) return json(401, { error: 'unauthorized' })
    if (call.path === '/api/auth/me') return me()
    if (call.path === '/api/auth/change-password') {
      const { current } = call.body as { current?: string }
      if (current !== 'contrasenya-llarga') return json(403, { error: 'invalid_credentials' })
      return String(body.new).includes('feble') ? json(422, { error: 'validation_failed', issues: [{ path: 'new', code: 'custom' }] }) : json(200, { ok: true })
    }
    if (call.path === '/api/account' && call.method === 'DELETE') {
      if (body.password !== 'contrasenya-llarga') return json(403, { error: 'invalid_credentials' })
      profiles.clear()
      docs.clear()
      attempts.clear()
      authed = false
      return json(200, { ok: true })
    }
    return undefined
  }

  function route(call: Call): Response {
    const authAnswer = auth(call)
    if (authAnswer) return authAnswer
    const m = /^\/api\/profiles\/([^/?]+)(\/sync)?(\?purge=true)?$/.exec(call.path)
    if (call.path === '/api/profiles' && call.method === 'GET') return json(200, { profiles: [...profiles.values()] })
    if (!m?.[1]) return json(404, { error: 'not_found' })
    const id = m[1]
    if (m[2]) return profiles.has(id) ? sync(id, call.body as { since: number }) : json(404, { error: 'not_found' })
    if (call.method === 'PUT') {
      const input = call.body as Omit<ServerProfile, 'id' | 'updatedAt'>
      const created = !profiles.has(id)
      const profile = { ...input, id, createdAt: profiles.get(id)?.createdAt ?? input.createdAt, updatedAt: seq }
      profiles.set(id, profile)
      return json(created ? 201 : 200, { profile })
    }
    if (call.method === 'DELETE') {
      if (!profiles.delete(id)) return json(404, { error: 'not_found' })
      docs.delete(id)
      attempts.delete(id)
      return json(200, { ok: true })
    }
    return json(404, { error: 'not_found' })
  }

  const fetchImpl = async (url: string, init?: RequestInit): Promise<Response> => {
    const call: Call = { method: init?.method ?? 'GET', path: url, body: init?.body ? JSON.parse(String(init.body)) : undefined }
    calls.push(call)
    const intercept = interceptors.shift()?.(call)
    if (intercept instanceof Error) throw intercept
    if (intercept) return intercept
    return route(call)
  }

  return {
    fetch: fetchImpl as unknown as typeof fetch,
    calls,
    profiles,
    docsOf: (id: string) => [...docsOf(id).values()],
    attemptsOf: (id: string) => [...attemptsOf(id).values()],
    poison,
    /** The next request(s) get these answers instead (one interceptor per request; undefined = normal). */
    intercept: (...next: Interceptor[]) => interceptors.push(...next),
    setAuthed: (value: boolean) => {
      authed = value
    },
    setFamilyId: (value: string) => {
      familyId = value
    },
    syncCalls: () => calls.filter((c) => c.path.endsWith('/sync')),
    json,
  }
}

export type FakeServer = ReturnType<typeof createFakeServer>
