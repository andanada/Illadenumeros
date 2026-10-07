import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, createApi } from './api'

const json = (status: number, body: unknown, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })

const FAMILY = { family: { id: 'f1', email: 'a@b.cat' }, profiles: [] }
const PROFILE = { id: '1b4e28ba-2fa1-41d2-883f-0016d3cca427', name: 'Laia', character: 'nyx', color: 'rosa', createdAt: 1, updatedAt: 2 }

function setup(response: Response | Error | (() => Promise<Response>)) {
  const fetchMock = vi.fn((_url: string, _init?: RequestInit) =>
    typeof response === 'function' ? response() : response instanceof Error ? Promise.reject(response) : Promise.resolve(response.clone()),
  )
  return { api: createApi({ fetch: fetchMock as unknown as typeof fetch, timeoutMs: 50 }), fetchMock }
}

afterEach(() => vi.useRealTimers())

describe('api client', () => {
  it('GET same-origin with credentials and no CSRF body headers', async () => {
    const { api, fetchMock } = setup(json(200, FAMILY))
    await expect(api.me()).resolves.toEqual(FAMILY)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/api/auth/me')
    expect(init?.credentials).toBe('same-origin')
    expect(init?.method).toBe('GET')
  })

  it('non-GET sends JSON + X-Requested-With: mm', async () => {
    const { api, fetchMock } = setup(json(201, FAMILY))
    await api.register('a@b.cat', 'una contrasenya llarga', 'CODE')
    const init = fetchMock.mock.calls[0]?.[1]
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('X-Requested-With')).toBe('mm')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(String(init?.body))).toEqual({ email: 'a@b.cat', password: 'una contrasenya llarga', inviteCode: 'CODE' })
  })

  it('strips unknown fields from responses', async () => {
    const { api } = setup(json(200, { ...FAMILY, family: { ...FAMILY.family, secret: 'x' }, extra: 1 }))
    expect(await api.me()).toEqual(FAMILY)
  })

  it('maps error bodies to ApiError with status, code and issues', async () => {
    const { api } = setup(json(422, { error: 'validation_failed', issues: [{ path: 'password', code: 'custom' }] }))
    const err = await api.login('a@b.cat', 'x').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 422, code: 'validation_failed', issues: [{ path: 'password', code: 'custom' }] })
  })

  it('reads Retry-After (seconds) on 429', async () => {
    const { api } = setup(json(429, { error: 'too_many_attempts' }, { 'Retry-After': '120' }))
    await expect(api.login('a@b.cat', 'x')).rejects.toMatchObject({ status: 429, retryAfterMs: 120_000 })
  })

  it('network failure -> status 0 network', async () => {
    const { api } = setup(new TypeError('Failed to fetch'))
    await expect(api.me()).rejects.toMatchObject({ status: 0, code: 'network' })
  })

  it('times out with AbortController', async () => {
    const { api } = setup(
      () =>
        new Promise<Response>(() => {
          /* never answers */
        }),
    )
    const fetchImpl = vi.fn((_u: string, init?: RequestInit) => new Promise<Response>((_r, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('a', 'AbortError')))))
    const slow = createApi({ fetch: fetchImpl as unknown as typeof fetch, timeoutMs: 10 })
    await expect(slow.me()).rejects.toMatchObject({ status: 0, code: 'timeout' })
    expect(api).toBeDefined()
  })

  it('invalid response body -> bad_response', async () => {
    const { api } = setup(json(200, { nope: true }))
    await expect(api.me()).rejects.toMatchObject({ code: 'bad_response' })
  })

  it('non-JSON error body keeps the status', async () => {
    const { api } = setup(new Response('<html>502</html>', { status: 502 }))
    await expect(api.me()).rejects.toMatchObject({ status: 502, code: 'http_502' })
  })

  it('profiles: list, put, delete with purge', async () => {
    const { api, fetchMock } = setup(json(200, { profiles: [PROFILE] }))
    expect(await api.listProfiles()).toEqual([PROFILE])
    const put = setup(json(201, { profile: PROFILE }))
    expect(await put.api.putProfile(PROFILE.id, { name: 'Laia', character: 'nyx', color: 'rosa', createdAt: 1 })).toEqual(PROFILE)
    expect(put.fetchMock.mock.calls[0]?.[1]?.method).toBe('PUT')
    const del = setup(json(200, { ok: true }))
    await del.api.deleteProfile(PROFILE.id, true)
    expect(del.fetchMock.mock.calls[0]?.[0]).toBe(`/api/profiles/${PROFILE.id}?purge=true`)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sync posts since + push and parses the page', async () => {
    const page = { seq: 9, docs: [{ kind: 'rewards', key: 'me', data: { any: 1 }, updatedAt: 3, seq: 8 }], attempts: [], hasMore: false }
    const { api, fetchMock } = setup(json(200, page))
    expect(await api.sync(PROFILE.id, { since: 2, push: { docs: [], attempts: [] } })).toEqual(page)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/api/profiles/${PROFILE.id}/sync`)
  })

  it('logout, change password and delete account', async () => {
    const ok = () => setup(json(200, { ok: true }))
    const a = ok()
    await a.api.logout()
    const b = ok()
    await b.api.changePassword('old', 'new password 123')
    expect(JSON.parse(String(b.fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ current: 'old', new: 'new password 123' })
    const c = ok()
    await c.api.deleteAccount('pw')
    expect(c.fetchMock.mock.calls[0]?.[1]?.method).toBe('DELETE')
    const d = setup(json(200, FAMILY))
    expect(await d.api.login('a@b.cat', 'pw')).toEqual(FAMILY)
  })
})
