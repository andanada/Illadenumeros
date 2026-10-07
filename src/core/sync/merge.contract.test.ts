import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { mergeDoc as serverMerge } from '../../../server/src/lib/merge'
import { mergeDoc } from './merge'
import { arbDoc } from './arbitraries.testutil'

/** Two versions of the same (kind) doc, with colliding timestamps to exercise ties. */
const pair = arbDoc(false).chain((a) =>
  arbDoc(false, a.kind).map((b) => ({ kind: a.kind, a: { data: a.data, updatedAt: a.updatedAt }, b: { data: b.data, updatedAt: b.updatedAt } })),
)

describe('contract: client merge == server merge', () => {
  it('agrees on random inputs (both orders)', () => {
    fc.assert(
      fc.property(pair, ({ kind, a, b }) => {
        expect(mergeDoc(kind, a as never, b as never)).toEqual(serverMerge(kind, a as never, b as never))
        expect(mergeDoc(kind, b as never, a as never)).toEqual(serverMerge(kind, b as never, a as never))
      }),
      { numRuns: 1000 },
    )
  })
})
