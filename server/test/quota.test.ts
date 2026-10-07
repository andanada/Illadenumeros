/* H1 (bounded rewards) and M1 (formats and per-profile/family quotas). */
import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { attemptPush, createProfile, isoDayAt, makeApp, profileBody, registerFamily, skillDoc, skillIdAt, type Client, type TestApp } from './helpers.js'

let t: TestApp | undefined
afterEach(async () => {
  await t?.app.close()
  t = undefined
})

/** The 36 sticker ids of the client catalogue (src/features/stickers/catalog.ts). */
const CLIENT_STICKERS = [
  'maduixa', 'arc', 'unicorn', 'flor', 'papallona', 'gira-sol', 'trevol', 'guineu', 'panda', 'conill', 'lluna', 'estel',
  'dofi', 'tortuga', 'gelat', 'sindria', 'petxina', 'pop', 'pingui', 'globus', 'piruleta', 'sol', 'cranc', 'balena',
  'corona', 'diamant', 'magdalena', 'donut', 'pastis', 'llac', 'cor-negre', 'calavera', 'castell', 'coet', 'planeta', 'musica',
]

const rewards = (data: Record<string, unknown>, updatedAt = 1000) => ({
  kind: 'rewards',
  key: 'me',
  updatedAt,
  data: { id: 'me', petals: 0, stickers: [], daysPlayed: [], missionsDone: [], ...data },
})
const fact = (factKey: string) => ({
  kind: 'fact',
  key: factKey,
  updatedAt: 1000,
  data: { factKey, box: 1, streak: 1, attempts: 2, correct: 1, recentRts: [900], lastSeen: 5, dueAt: 6 },
})
const n = (sql: string, ...args: unknown[]): number => (t!.ctx.db.prepare(sql).get(...args) as { n: number }).n

async function setup(env: Record<string, string> = {}): Promise<{ http: Client; id: string; push: (body: unknown) => Promise<{ status: number; json: any }> }> {
  t = await makeApp(env)
  const { http } = await registerFamily(t.app)
  const id = await createProfile(http)
  const push = async (body: unknown) => {
    const res = await http.request('POST', `/api/profiles/${id}/sync`, body)
    return { status: res.statusCode, json: res.json() }
  }
  return { http, id, push }
}

describe('H1 layer 1: bounded rewards formats', () => {
  it('accepts real client data: the 36 catalogue stickers, ISO days and mission days', async () => {
    const { push } = await setup()
    const r = await push({ since: 0, push: { docs: [rewards({ petals: 40, stickers: CLIENT_STICKERS, daysPlayed: ['2025-01-02', '2025-01-03'], missionsDone: ['2025-01-02'] })] } })
    expect(r.status).toBe(200)
    expect(r.json.docs[0].data.stickers).toHaveLength(36)
  })

  it('rejects malformed sticker ids, days and missions and oversize arrays', async () => {
    const { push } = await setup()
    for (const data of [
      { stickers: ['Arc'] },
      { stickers: ['x'.repeat(33)] },
      { stickers: Array.from({ length: 501 }, (_, i) => `s${i}`) },
      { daysPlayed: ['2025-1-2'] },
      { daysPlayed: ['yesterday'] },
      { daysPlayed: Array.from({ length: 3661 }, (_, i) => isoDayAt(i)) },
      { missionsDone: ['m1'] },
      { missionsDone: Array.from({ length: 3661 }, (_, i) => isoDayAt(i)) },
    ]) {
      expect((await push({ since: 0, push: { docs: [rewards(data)] } })).status).toBe(422)
    }
  })
})

describe('H1 layer 2: merged size is re-checked', () => {
  it('a merge that would exceed the caps aborts the whole push with 422 and keeps the stored doc', async () => {
    const { push } = await setup()
    const first = Array.from({ length: 2000 }, (_, i) => isoDayAt(i))
    const second = Array.from({ length: 2000 }, (_, i) => isoDayAt(2000 + i))
    expect((await push({ since: 0, push: { docs: [rewards({ daysPlayed: first, missionsDone: first })] } })).status).toBe(200)
    const before = t!.ctx.db.prepare("SELECT data FROM docs WHERE kind = 'rewards'").get() as { data: string }
    const r = await push({ since: 0, push: { docs: [skillDoc('A1'), rewards({ daysPlayed: second, missionsDone: second }, 2000)] } })
    expect(r.status).toBe(422)
    expect(r.json.error).toBe('validation_failed')
    const after = t!.ctx.db.prepare("SELECT data FROM docs WHERE kind = 'rewards'").get() as { data: string }
    expect(after.data).toBe(before.data)
    expect(n("SELECT COUNT(*) n FROM docs WHERE kind = 'skill'")).toBe(0) // the whole push was rolled back
  })

  it('a merge within the item counts but above 64 KB is also rejected', async () => {
    const { push } = await setup()
    const base = Array.from({ length: 2000 }, (_, i) => isoDayAt(i))
    expect((await push({ since: 0, push: { docs: [rewards({ daysPlayed: base, missionsDone: base })] } })).status).toBe(200)
    const more = Array.from({ length: 1200 }, (_, i) => isoDayAt(2000 + i)) // union: 3200 days (<= 3660) but ~68 KB
    const r = await push({ since: 0, push: { docs: [rewards({ daysPlayed: more }, 2000)] } })
    expect(r.status).toBe(422)
    expect(r.json.issues[0].code).toContain('too large')
  })

  it('a merge that stays under the caps still succeeds', async () => {
    const { push } = await setup()
    await push({ since: 0, push: { docs: [rewards({ daysPlayed: [isoDayAt(1)], stickers: ['arc'] })] } })
    const r = await push({ since: 0, push: { docs: [rewards({ daysPlayed: [isoDayAt(2)], stickers: ['sol'] }, 2000)] } })
    expect(r.status).toBe(200)
    expect(r.json.docs[0].data).toMatchObject({ stickers: ['arc', 'sol'], daysPlayed: [isoDayAt(1), isoDayAt(2)] })
  })
})

describe('H1 layer 3: duplicate (kind,key) in one push', () => {
  it('rejects duplicated skill keys too', async () => {
    const { push } = await setup()
    const r = await push({ since: 0, push: { docs: [skillDoc('A1'), skillDoc('A1', {}, 2000)] } })
    expect(r.status).toBe(422)
    expect(r.json.issues[0].code).toContain('duplicate')
  })
})

describe('M1: id formats', () => {
  it('accepts the real skill ids and fact keys the client produces', async () => {
    const { push } = await setup()
    const keys = ['add:3+5', 'sub:12-7', 'mul:3x7', 'div:21:3', 'c10:3']
    const attempts = keys.map((factKey) => ({ ...attemptPush(), data: { ...attemptPush().data, skillId: 'C10', factKey } }))
    const r = await push({ since: 0, push: { docs: [skillDoc('A10'), skillDoc('D9'), ...keys.map(fact)], attempts } })
    expect(r.status).toBe(200)
  })

  it('rejects free-form skill ids and fact keys in docs and attempts', async () => {
    const { push } = await setup()
    for (const doc of [skillDoc('s1'), skillDoc('A100'), skillDoc('a1'), fact('2x3'), fact('add:3*5'), fact('c10:x')]) {
      expect((await push({ since: 0, push: { docs: [doc] } })).status).toBe(422)
    }
    for (const data of [{ skillId: 'add-1' }, { factKey: 'pow:2^3' }]) {
      const bad = { ...attemptPush(), data: { ...attemptPush().data, ...data } }
      expect((await push({ since: 0, push: { attempts: [bad] } })).status).toBe(422)
    }
  })
})

describe('M1: per-profile quotas', () => {
  it('refuses with 409 quota_exceeded once a profile holds too many docs, atomically', async () => {
    const { push } = await setup({ QUOTA_DOCS_PER_PROFILE: '10' })
    expect((await push({ since: 0, push: { docs: Array.from({ length: 10 }, (_, i) => skillDoc(skillIdAt(i))) } })).status).toBe(200)
    const r = await push({ since: 0, push: { docs: [skillDoc(skillIdAt(10))], attempts: [attemptPush()] } })
    expect(r.status).toBe(409)
    expect(r.json.error).toBe('quota_exceeded')
    expect(n('SELECT COUNT(*) n FROM attempts')).toBe(0)
    expect((await push({ since: 0, push: { docs: [skillDoc(skillIdAt(3), {}, 5000)] } })).status).toBe(200) // updates still fine
  })

  it('refuses with 409 once a profile holds too many attempts', async () => {
    const { push } = await setup({ QUOTA_ATTEMPTS_PER_PROFILE: '5' })
    expect((await push({ since: 0, push: { attempts: Array.from({ length: 5 }, () => attemptPush()) } })).status).toBe(200)
    expect((await push({ since: 0, push: { attempts: [attemptPush()] } })).status).toBe(409)
  })

  it('defaults to 2000 docs and 200000 attempts', async () => {
    await setup()
    expect(t!.config.quota).toEqual({ docsPerProfile: 2000, attemptsPerProfile: 200_000 })
  })
})

describe('M1: per-family caps', () => {
  it('keeps at most 20 sessions per family (oldest dropped)', async () => {
    t = await makeApp()
    const { http, email } = await registerFamily(t.app)
    for (let i = 0; i < 25; i++) {
      const c = await registerOrLogin(email, `10.2.0.${i}`)
      expect(c).toBe(200)
    }
    expect(n('SELECT COUNT(*) n FROM sessions')).toBe(20)
    expect((await http.request('GET', '/api/auth/me')).statusCode).toBe(401) // the first (oldest) session was evicted
  })

  it('counts soft-deleted profiles towards a total cap of 24 rows', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    for (let i = 0; i < 24; i++) {
      const id = await createProfile(http, `P${i}`)
      expect((await http.request('DELETE', `/api/profiles/${id}`)).statusCode).toBe(200)
    }
    const res = await http.request('PUT', `/api/profiles/${randomUUID()}`, profileBody())
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toBe('profile_limit')
  })
})

async function registerOrLogin(email: string, ip: string): Promise<number> {
  const res = await t!.app.inject({
    method: 'POST',
    url: '/api/auth/login',
    remoteAddress: ip,
    headers: { 'x-requested-with': 'mm', 'content-type': 'application/json' },
    payload: JSON.stringify({ email, password: 'correct horse battery' }),
  })
  return res.statusCode
}
