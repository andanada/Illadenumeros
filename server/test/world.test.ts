import fc from 'fast-check'
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase } from '../src/db/connection.js'
import { loadMigrations, migrate } from '../src/db/migrate.js'
import { checkDocData, validateDoc } from '../src/lib/docSchemas.js'
import { mergeDoc } from '../src/lib/merge.js'
import { MAX_WORLD_BYTES, SCENE_IDS, type WorldData } from '../src/lib/worldSchema.js'
import { createProfile, makeApp, registerFamily, type TestApp } from './helpers.js'

const avatar = (top = 'samarreta'): WorldData['avatar'] => ({
  skin: 's2',
  hair: { style: 'cuetes', color: 'xocolata' },
  eyes: 'punt',
  mouth: 'somriure',
  top: { item: top, color: 'coral' },
  bottom: { item: 'pantalo', color: 'cel' },
  shoes: { item: 'bambes', color: 'neu' },
  accessory: null,
})

const world = (o: Partial<WorldData> = {}): WorldData =>
  ({
    id: 'world',
    avatar: avatar(),
    owned: [],
    placed: {},
    placedAt: {},
    pets: [],
    avatarUpdatedAt: 0,
    petalsSpent: 0,
    ...o,
  }) as WorldData

const sofa = (uid: string, x = 0.5) => ({ uid, item: 'sofa', x, y: 0.5, z: 1 })
const v = (data: WorldData, updatedAt = 1) => ({ data, updatedAt })

describe('world doc validation', () => {
  it('accepts a full valid doc and strips unknown keys', () => {
    const doc = world({ owned: ['sofa'], placed: { casa: [{ ...sofa('u1'), color: 'menta', flip: true }] }, placedAt: { casa: 5 }, pets: ['nyx'] })
    const checked = checkDocData('world', { ...doc, hacker: 1 })
    expect(checked).toEqual({ ok: true, data: doc })
  })

  it.each([
    ['unknown scene', { placed: { lluna: [] } }],
    ['bad catalogue id', { owned: ['Sofa Gran'] }],
    ['coordinates out of range', { placed: { casa: [sofa('u1', 1.5)] } }],
    ['negative coins spent', { petalsSpent: -1 }],
    ['fractional timestamp', { avatarUpdatedAt: 1.5 }],
    ['bad skin', { avatar: { ...avatar(), skin: 's9' } }],
    ['too many pets', { pets: Array.from({ length: 51 }, (_, i) => `p${i}`) }],
    ['too many placements in a scene', { placed: { casa: Array.from({ length: 201 }, (_, i) => sofa(`u${i}`)) } }],
  ])('rejects %s', (_name, patch) => {
    expect(checkDocData('world', { ...world(), ...patch }).ok).toBe(false)
  })

  it('rejects a doc over the size cap even when every field is valid', () => {
    const owned = Array.from({ length: 1990 }, (_, i) => `${'a'.repeat(30)}-${i}`)
    const placed = Object.fromEntries(SCENE_IDS.map((s) => [s, Array.from({ length: 150 }, (_, i) => sofa(`uid-${s}-${i}`))]))
    const checked = checkDocData('world', world({ owned, placed }))
    expect(checked).toEqual({ ok: false, error: 'world: too large' })
    expect(MAX_WORLD_BYTES).toBe(64 * 1024)
  })

  it("the key must be 'world'", () => {
    expect(validateDoc({ kind: 'world', key: 'me', data: world(), updatedAt: 1 }).ok).toBe(false)
    expect(validateDoc({ kind: 'world', key: 'world', data: world(), updatedAt: 1 }).ok).toBe(true)
  })
})

describe('world doc merge', () => {
  it('unions owned and pets (sorted, no duplicates) and keeps the max coins spent', () => {
    const merged = mergeDoc('world', v(world({ owned: ['sofa', 'llum'], pets: ['nyx'], petalsSpent: 30 }), 1), v(world({ owned: ['catifa', 'sofa'], pets: ['melo'], petalsSpent: 12 }), 9))
    expect(merged.updatedAt).toBe(9)
    expect(merged.data).toMatchObject({ owned: ['catifa', 'llum', 'sofa'], pets: ['melo', 'nyx'], petalsSpent: 30 })
  })

  it('avatar is last-writer-wins by avatarUpdatedAt (ties keep the existing one), not by the doc time', () => {
    const a = world({ avatar: avatar('jersei'), avatarUpdatedAt: 50 })
    const b = world({ avatar: avatar('vestit'), avatarUpdatedAt: 40 })
    expect((mergeDoc('world', v(a, 1), v(b, 99)).data as WorldData).avatar.top.item).toBe('jersei')
    expect((mergeDoc('world', v(b, 1), v(a, 0)).data as WorldData).avatar.top.item).toBe('jersei')
    const tie = world({ avatar: avatar('vestit'), avatarUpdatedAt: 50 })
    expect((mergeDoc('world', v(a), v(tie)).data as WorldData).avatar.top.item).toBe('jersei')
  })

  it('placements are last-writer-wins per scene by placedAt', () => {
    const a = world({ placed: { casa: [sofa('a')], botiga: [sofa('b')] }, placedAt: { casa: 10, botiga: 1 } })
    const b = world({ placed: { botiga: [sofa('c')], fleca: [sofa('d')] }, placedAt: { casa: 20, botiga: 5, fleca: 3 } })
    const merged = mergeDoc('world', v(a), v(b)).data as WorldData
    // casa: b is newer and empty (everything removed) -> empty; botiga: b; fleca: only b.
    expect(merged.placed).toEqual({ botiga: [sofa('c')], fleca: [sofa('d')] })
    expect(merged.placedAt).toEqual({ casa: 20, botiga: 5, fleca: 3 })
    expect(Object.keys(merged.placed)).toEqual(['botiga', 'fleca'])
  })

  it('is idempotent and the union/max fields commute (property)', () => {
    const arbWorld = fc.record({
      owned: fc.uniqueArray(fc.constantFrom('a', 'b', 'c', 'd'), { maxLength: 4 }),
      pets: fc.uniqueArray(fc.constantFrom('nyx', 'mixa', 'melo'), { maxLength: 3 }),
      petalsSpent: fc.nat(100),
      avatarUpdatedAt: fc.nat(5),
      casaAt: fc.option(fc.nat(5), { nil: undefined }),
    })
    const toDoc = (r: { owned: string[]; pets: string[]; petalsSpent: number; avatarUpdatedAt: number; casaAt: number | undefined }) =>
      world({
        owned: [...r.owned].sort(),
        pets: [...r.pets].sort(),
        petalsSpent: r.petalsSpent,
        avatarUpdatedAt: r.avatarUpdatedAt,
        ...(r.casaAt === undefined ? {} : { placed: { casa: [sofa(`u${r.casaAt}`)] }, placedAt: { casa: r.casaAt } }),
      })
    fc.assert(
      fc.property(arbWorld, arbWorld, (ra, rb) => {
        const a = v(toDoc(ra))
        const b = v(toDoc(rb))
        expect(mergeDoc('world', a, a)).toEqual(a)
        const ab = mergeDoc('world', a, b).data as WorldData
        const ba = mergeDoc('world', b, a).data as WorldData
        expect(ab.owned).toEqual(ba.owned)
        expect(ab.pets).toEqual(ba.pets)
        expect(ab.petalsSpent).toBe(ba.petalsSpent)
        expect(ab.placedAt).toEqual(ba.placedAt)
      }),
      { numRuns: 300 },
    )
  })
})

describe('world doc through the sync route', () => {
  let t: TestApp | undefined
  afterEach(async () => {
    await t?.app.close()
    t = undefined
  })

  it('stores, merges and returns the world doc to another device', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    const id = await createProfile(http)
    const sync = async (body: unknown) => (await http.request('POST', `/api/profiles/${id}/sync`, body)).json()
    const doc = (data: WorldData, updatedAt: number) => ({ kind: 'world', key: 'world', updatedAt, data })
    await sync({ since: 0, push: { docs: [doc(world({ owned: ['sofa'], petalsSpent: 10 }), 100)] } })
    const second = await sync({ since: 0, push: { docs: [doc(world({ owned: ['catifa'], petalsSpent: 4, avatar: avatar('vestit'), avatarUpdatedAt: 7 }), 50)] } })
    const stored = second.docs.find((d: { kind: string }) => d.kind === 'world')
    expect(stored.updatedAt).toBe(100)
    expect(stored.data).toMatchObject({ owned: ['catifa', 'sofa'], petalsSpent: 10, avatarUpdatedAt: 7 })
    expect(stored.data.avatar.top.item).toBe('vestit')
  })

  it('rejects an invalid world doc with a path-only 422', async () => {
    t = await makeApp()
    const { http } = await registerFamily(t.app)
    const id = await createProfile(http)
    const res = await http.request('POST', `/api/profiles/${id}/sync`, { since: 0, push: { docs: [{ kind: 'world', key: 'world', updatedAt: 1, data: { ...world(), owned: ['<script>'] } }] } })
    expect(res.statusCode).toBe(422)
    expect(JSON.stringify(res.json())).not.toContain('<script>')
  })
})

describe('migration 005: the docs table accepts the world kind', () => {
  it('keeps every existing doc and allows kind world', () => {
    const db = openDatabase(':memory:')
    const all = loadMigrations()
    migrate(db, all.filter((m) => m.version <= 4))
    db.prepare("INSERT INTO families (id,email,password_hash,created_at) VALUES ('f','e','h',1)").run()
    db.prepare("INSERT INTO profiles (id,family_id,name,created_at,updated_at) VALUES ('p','f','Ok',1,1)").run()
    db.prepare("INSERT INTO docs (profile_id,kind,key,data,updated_at,seq) VALUES ('p','rewards','me','{}',5,7)").run()
    expect(() => db.prepare("INSERT INTO docs (profile_id,kind,key,data,updated_at,seq) VALUES ('p','world','world','{}',5,8)").run()).toThrow()
    migrate(db, all)
    expect(db.prepare('SELECT profile_id, kind, key, data, updated_at, seq FROM docs').all()).toEqual([
      { profile_id: 'p', kind: 'rewards', key: 'me', data: '{}', updated_at: 5, seq: 7 },
    ])
    db.prepare("INSERT INTO docs (profile_id,kind,key,data,updated_at,seq) VALUES ('p','world','world','{}',5,8)").run()
    expect(() => db.prepare("INSERT INTO docs (profile_id,kind,key,data,updated_at,seq) VALUES ('p','nope','k','{}',5,9)").run()).toThrow()
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'idx_docs_profile_seq'").get()).toBeTruthy()
    db.prepare("DELETE FROM families WHERE id='f'").run()
    expect(db.prepare('SELECT COUNT(*) n FROM docs').get()).toEqual({ n: 0 })
  })
})
