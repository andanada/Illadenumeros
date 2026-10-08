import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { checkDocData as serverCheck } from '../../../server/src/lib/docSchemas'
import { mergeDoc as serverMerge } from '../../../server/src/lib/merge'
import * as server from '../../../server/src/lib/worldSchema'
import { PALETTE_COLORS, SCENE_IDS, SKIN_TONES, worldDocSchema } from '../../world/model/types'
import { arbDoc } from './arbitraries.testutil'
import { worldData } from './worldArbitraries.testutil'
import { mergeDoc } from './merge'
import { checkDocData } from './schemas'
import * as client from './worldSchemas'

describe('contract: world doc constants are the same on client and server', () => {
  it('enums, id pattern and caps', () => {
    expect([...server.SKIN_TONES]).toEqual([...SKIN_TONES])
    expect([...server.PALETTE_COLORS]).toEqual([...PALETTE_COLORS])
    expect([...server.SCENE_IDS]).toEqual([...SCENE_IDS])
    expect(String(server.CATALOG_ID_RE)).toBe(String(client.CATALOG_ID_RE))
    expect([server.MAX_WORLD_BYTES, server.MAX_OWNED, server.MAX_PETS, server.MAX_PLACED_PER_SCENE]).toEqual([
      client.MAX_WORLD_BYTES,
      client.MAX_OWNED,
      client.MAX_PETS,
      client.MAX_PLACED_PER_SCENE,
    ])
  })
})

describe('contract: world docs', () => {
  it('the client validator accepts exactly what the server accepts (valid and corrupted)', () => {
    fc.assert(
      fc.property(arbDoc(true, 'world'), ({ data }) => {
        const s = serverCheck('world', data)
        const c = checkDocData('world', data)
        expect(c.ok).toBe(s.ok)
        if (s.ok && c.ok) expect(c.data).toEqual(s.data)
      }),
      { numRuns: 1500 },
    )
  })

  it('every doc the server accepts is also a valid shared-contract WorldDoc', () => {
    fc.assert(
      fc.property(arbDoc(true, 'world'), ({ data }) => {
        const s = serverCheck('world', data)
        if (s.ok) expect(worldDocSchema.safeParse(s.data).success).toBe(true)
      }),
      { numRuns: 600 },
    )
  })

  it('client merge == server merge on random world docs (both orders, with ties)', () => {
    const pair = arbDoc(false, 'world').chain((a) => arbDoc(false, 'world').map((b) => ({ a, b })))
    fc.assert(
      fc.property(pair, ({ a, b }) => {
        const va = { data: a.data, updatedAt: a.updatedAt }
        const vb = { data: b.data, updatedAt: b.updatedAt }
        expect(mergeDoc('world', va as never, vb as never)).toEqual(serverMerge('world', va as never, vb as never))
        expect(mergeDoc('world', vb as never, va as never)).toEqual(serverMerge('world', vb as never, va as never))
        expect(JSON.stringify(mergeDoc('world', va as never, vb as never))).toBe(JSON.stringify(serverMerge('world', va as never, vb as never)))
      }),
      { numRuns: 1500 },
    )
  })

  it('client merge == server merge also on raw, non-canonical docs (duplicates, foreign keys, odd times)', () => {
    fc.assert(
      fc.property(worldData, worldData, fc.nat(3), fc.nat(3), (a, b, ta, tb) => {
        const va = { data: a, updatedAt: ta }
        const vb = { data: b, updatedAt: tb }
        expect(JSON.stringify(mergeDoc('world', va as never, vb as never))).toBe(JSON.stringify(serverMerge('world', va as never, vb as never)))
      }),
      { numRuns: 1000 },
    )
  })
})
