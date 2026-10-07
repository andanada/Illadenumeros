import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { attemptPush, createProfile, makeApp, registerFamily, skillDoc, skillIdAt, type Client, type TestApp } from './helpers.js'

let t: TestApp | undefined
afterEach(async () => {
  await t?.app.close()
  t = undefined
})

async function setup(): Promise<{ http: Client; id: string; sync: (body: unknown) => Promise<{ status: number; json: any }> }> {
  t = await makeApp()
  const { http } = await registerFamily(t.app)
  const id = await createProfile(http)
  const sync = async (body: unknown) => {
    const res = await http.request('POST', `/api/profiles/${id}/sync`, body)
    return { status: res.statusCode, json: res.json() }
  }
  return { http, id, sync }
}

const fact = (factKey: string, o: Record<string, unknown> = {}, updatedAt = 1000) => ({
  kind: 'fact',
  key: factKey,
  updatedAt,
  data: { factKey, box: 1, streak: 1, attempts: 2, correct: 1, recentRts: [900], lastSeen: 5, dueAt: 6, ...o },
})
const rewards = (o: Record<string, unknown> = {}, updatedAt = 1000) => ({
  kind: 'rewards',
  key: 'me',
  updatedAt,
  data: { id: 'me', petals: 3, stickers: ['arc'], daysPlayed: ['2025-01-02'], missionsDone: [], ...o },
})

describe('sync basics', () => {
  it('first sync with nothing returns an empty page', async () => {
    const { sync } = await setup()
    const r = await sync({ since: 0 })
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ seq: 0, docs: [], attempts: [], hasMore: false })
  })

  it('first push stores everything and a second device pulls it', async () => {
    const { sync, http, id } = await setup()
    const a = attemptPush()
    const push = await sync({ since: 0, push: { docs: [skillDoc('A1'), fact('mul:2x3'), rewards()], attempts: [a] } })
    expect(push.status).toBe(200)
    expect(push.json.attempts).toEqual([]) // just pushed: not echoed back
    expect(push.json.docs).toHaveLength(3)
    // device 2 starts from scratch
    const pull = (await http.request('POST', `/api/profiles/${id}/sync`, { since: 0 })).json()
    expect(pull.docs.map((d: { kind: string }) => d.kind).sort()).toEqual(['fact', 'rewards', 'skill'])
    expect(pull.attempts).toHaveLength(1)
    expect(pull.attempts[0].id).toBe(a.id)
    expect(pull.attempts[0].data.gameId).toBe('bombolles')
    expect(pull.hasMore).toBe(false)
  })

  it('pull since only returns what changed', async () => {
    const { sync } = await setup()
    const first = await sync({ since: 0, push: { docs: [skillDoc('A1')], attempts: [attemptPush()] } })
    const cursor = first.json.seq
    const idle = await sync({ since: cursor })
    expect(idle.json.docs).toEqual([])
    expect(idle.json.attempts).toEqual([])
    expect(idle.json.seq).toBe(cursor)
    await sync({ since: cursor, push: { docs: [skillDoc('A2')] } })
    const next = await sync({ since: cursor })
    expect(next.json.docs.map((d: { key: string }) => d.key)).toEqual(['A2'])
  })

  it('dedupes attempts by id', async () => {
    const { sync } = await setup()
    const a = attemptPush()
    await sync({ since: 0, push: { attempts: [a, a] } })
    await sync({ since: 0, push: { attempts: [a] } })
    const all = await sync({ since: 0 })
    expect(all.json.attempts).toHaveLength(1)
    expect((t!.ctx.db.prepare('SELECT COUNT(*) n FROM attempts').get() as { n: number }).n).toBe(1)
  })

  it('an unchanged re-push does not bump seq (no useless re-downloads)', async () => {
    const { sync } = await setup()
    const first = await sync({ since: 0, push: { docs: [skillDoc('A1')] } })
    const again = await sync({ since: first.json.seq, push: { docs: [skillDoc('A1')] } })
    expect(again.json.docs).toEqual([])
    expect(again.json.seq).toBe(first.json.seq)
  })

  it('paginates pulls at 1000 rows until hasMore is false', async () => {
    const { sync } = await setup()
    const attempts = Array.from({ length: 1000 }, (_, i) => attemptPush(randomUUID(), i))
    const more = Array.from({ length: 300 }, (_, i) => attemptPush(randomUUID(), 2000 + i))
    await sync({ since: 0, push: { attempts } })
    await sync({ since: 0, push: { attempts: more } })
    let since = 0
    let total = 0
    let pages = 0
    for (;;) {
      const r = await sync({ since })
      pages += 1
      total += r.json.attempts.length + r.json.docs.length
      expect(r.json.attempts.length).toBeLessThanOrEqual(1000)
      since = r.json.seq
      if (!r.json.hasMore) break
    }
    expect(total).toBe(1300)
    expect(pages).toBe(2)
  })

  it('pull pages interleave docs and attempts without losing rows', async () => {
    const { sync } = await setup()
    await sync({ since: 0, push: { docs: Array.from({ length: 500 }, (_, i) => skillDoc(skillIdAt(i))), attempts: Array.from({ length: 1000 }, () => attemptPush()) } })
    await sync({ since: 0, push: { docs: Array.from({ length: 100 }, (_, i) => fact(`add:${i}+1`)) } })
    let since = 0
    const seen = new Set<string>()
    for (let i = 0; i < 5; i++) {
      const r = await sync({ since })
      for (const d of r.json.docs) seen.add(`d:${d.kind}:${d.key}`)
      for (const a of r.json.attempts) seen.add(`a:${a.id}`)
      since = r.json.seq
      if (!r.json.hasMore) break
    }
    expect(seen.size).toBe(1600)
  })
})

describe('sync merge rules over HTTP', () => {
  it('skill: newer wins, counters are max', async () => {
    const { sync } = await setup()
    await sync({ since: 0, push: { docs: [skillDoc('A1', { attempts: 10, correct: 9, mastery: 0.9 }, 1000)] } })
    const r = await sync({ since: 0, push: { docs: [skillDoc('A1', { attempts: 4, correct: 4, mastery: 0.3 }, 2000)] } })
    expect(r.json.docs[0].data).toMatchObject({ mastery: 0.3, attempts: 10, correct: 9 })
    expect(r.json.docs[0].updatedAt).toBe(2000)
  })

  it('skill: an older push does not replace but still lifts counters; ties keep existing', async () => {
    const { sync } = await setup()
    await sync({ since: 0, push: { docs: [skillDoc('A1', { mastery: 0.8, attempts: 3, correct: 3 }, 2000)] } })
    const stale = await sync({ since: 0, push: { docs: [skillDoc('A1', { mastery: 0.1, attempts: 9, correct: 5 }, 1000)] } })
    expect(stale.json.docs[0].data).toMatchObject({ mastery: 0.8, attempts: 9, correct: 5 })
    const tie = await sync({ since: 0, push: { docs: [skillDoc('A1', { mastery: 0.2 }, 2000)] } })
    expect(tie.json.docs[0].data.mastery).toBe(0.8)
  })

  it('fact: newer wins, attempts and correct are max', async () => {
    const { sync } = await setup()
    await sync({ since: 0, push: { docs: [fact('mul:2x3', { attempts: 8, correct: 6, box: 3 }, 1000)] } })
    const r = await sync({ since: 0, push: { docs: [fact('mul:2x3', { attempts: 5, correct: 7, box: 1 }, 3000)] } })
    expect(r.json.docs[0].data).toMatchObject({ box: 1, attempts: 8, correct: 7 })
  })

  it('rewards: petals max, sets are unions, nothing is lost', async () => {
    const { sync } = await setup()
    await sync({ since: 0, push: { docs: [rewards({ petals: 10, stickers: ['maduixa', 'arc'], daysPlayed: ['2025-01-01'], missionsDone: ['2025-01-01'] }, 1000)] } })
    const r = await sync({
      since: 0,
      push: { docs: [rewards({ petals: 4, stickers: ['unicorn'], daysPlayed: ['2025-01-02'], missionsDone: ['2025-01-02'] }, 500)] },
    })
    expect(r.json.docs[0].data).toEqual({
      id: 'me',
      petals: 10,
      stickers: ['arc', 'maduixa', 'unicorn'],
      daysPlayed: ['2025-01-01', '2025-01-02'],
      missionsDone: ['2025-01-01', '2025-01-02'],
    })
  })

  it('settings: last write wins', async () => {
    const { sync } = await setup()
    const s = (v: string, updatedAt: number) => ({ kind: 'settings', key: 'profile', updatedAt, data: { diagnosticDone: v === 'yes', note: v } })
    await sync({ since: 0, push: { docs: [s('yes', 2000)] } })
    const r = await sync({ since: 0, push: { docs: [s('no', 1000)] } })
    expect(r.json.docs[0].data).toEqual({ diagnosticDone: true, note: 'yes' })
  })
})

describe('sync validation', () => {
  const expect422 = async (body: unknown) => {
    const { sync } = await setup()
    const r = await sync(body)
    expect(r.status).toBe(422)
    return r.json
  }

  it('rejects unknown kinds and malformed bodies', async () => {
    await expect422({ since: 0, push: { docs: [{ kind: 'weird', key: 'x', data: {}, updatedAt: 1 }] } })
    await expect422({ since: -1 })
    await expect422({ since: 'zero' })
    await expect422({})
  })

  it('rejects bad doc shapes without echoing content, listing at most 5 issues', async () => {
    const docs = Array.from({ length: 8 }, (_, i) => skillDoc(skillIdAt(i), { mastery: 7, status: 'SECRET-VALUE' }))
    const body = await expect422({ since: 0, push: { docs } })
    expect(body.issues).toHaveLength(5)
    expect(JSON.stringify(body)).not.toContain('SECRET-VALUE')
  })

  it('rejects a key that does not match the doc, and wrong rewards id', async () => {
    await expect422({ since: 0, push: { docs: [{ ...skillDoc('A1'), key: 'A2' }] } })
    await expect422({ since: 0, push: { docs: [rewards({ id: 'you' })] } })
    await expect422({ since: 0, push: { docs: [{ ...rewards(), key: 'x' }] } })
  })

  it('rejects oversized docs (> 8 KB) and too many items', async () => {
    await expect422({ since: 0, push: { docs: [{ kind: 'settings', key: 'big', updatedAt: 1, data: { a: 'x'.repeat(250), ...Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`k${i}`, 'y'.repeat(250)])) } }] } })
    await expect422({ since: 0, push: { docs: Array.from({ length: 501 }, (_, i) => skillDoc(skillIdAt(i))) } })
    await expect422({ since: 0, push: { attempts: Array.from({ length: 1001 }, () => attemptPush()) } })
  })

  it('rejects invalid attempts and attempt ids', async () => {
    const bad = { ...attemptPush(), data: { ...attemptPush().data, gameId: 'hack' } }
    await expect422({ since: 0, push: { attempts: [bad] } })
    await expect422({ since: 0, push: { attempts: [{ ...attemptPush(), id: "x'; DROP TABLE attempts;--" }] } })
  })

  it('is atomic: one invalid doc means nothing is applied', async () => {
    const { sync } = await setup()
    const r = await sync({ since: 0, push: { docs: [skillDoc('A1'), skillDoc('A2', { accuracy: 5 })] } })
    expect(r.status).toBe(422)
    expect((t!.ctx.db.prepare('SELECT COUNT(*) n FROM docs').get() as { n: number }).n).toBe(0)
  })

  it('SQL-injection style keys are stored as plain data', async () => {
    const { sync } = await setup()
    const key = "x'); DROP TABLE docs;--"
    const r = await sync({ since: 0, push: { docs: [{ kind: 'settings', key, updatedAt: 1, data: { v: 1 } }] } })
    expect(r.status).toBe(200)
    expect(r.json.docs[0].key).toBe(key)
  })
})

describe('export', () => {
  it('streams every doc and attempt as one valid JSON document', async () => {
    const { sync, http, id } = await setup()
    await sync({ since: 0, push: { docs: [skillDoc('A1'), rewards()] } })
    for (let i = 0; i < 3; i++) {
      await sync({ since: 0, push: { attempts: Array.from({ length: i < 2 ? 1000 : 500 }, () => attemptPush()) } })
    }
    const res = await http.request('GET', `/api/profiles/${id}/export`)
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('application/json')
    expect(res.headers['cache-control']).toBe('no-store')
    const body = JSON.parse(res.body)
    expect(body.profile.id).toBe(id)
    expect(body.docs).toHaveLength(2)
    expect(body.attempts).toHaveLength(2500)
  })
})
