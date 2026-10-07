import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { checkDocData, validateAttemptData } from '../../../server/src/lib/docSchemas'
import { CPA_STAGES, GAME_IDS, MISCONCEPTIONS } from '../ambit/types'
import { SKILL_STATUSES } from '../engine/mastery'
import { CHARACTER_IDS, THEME_COLORS } from '../storage/db'
import { checkAttemptData, checkDocData as clientCheck, FACT_KEY_RE, ISO_DAY_RE, SKILL_ID_RE, STICKER_ID_RE } from './schemas'
import { arbAttemptData, arbDoc } from './arbitraries.testutil'

const SERVER_FILE = resolve(process.cwd(), 'server/src/lib/docSchemas.ts')
const source = readFileSync(SERVER_FILE, 'utf8')

/** Reads `NAME = [ 'a', 'b' ] as const` from the server source (text, so non-exported constants count too). */
function serverArray(name: string): string[] {
  const match = new RegExp(String.raw`${name}\s*=\s*\[([^\]]*)\]\s*as const`).exec(source)
  if (!match?.[1]) throw new Error(`No trobo ${name} a docSchemas.ts`)
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1] ?? '')
}

function serverRegex(name: string): string {
  const match = new RegExp(String.raw`${name}\s*=\s*(/.+/[a-z]*)\s*$`, 'm').exec(source)
  if (!match?.[1]) throw new Error(`No trobo ${name} a docSchemas.ts`)
  return match[1]
}

describe('contract: client and server enums and formats are the same', () => {
  it.each([
    ['GAME_IDS', GAME_IDS],
    ['MISCONCEPTIONS', MISCONCEPTIONS],
    ['CPA_STAGES', CPA_STAGES],
    ['CHARACTER_IDS', CHARACTER_IDS],
    ['THEME_COLORS', THEME_COLORS],
    ['SKILL_STATUSES', SKILL_STATUSES],
  ] as const)('%s', (name, client) => {
    expect(serverArray(name)).toEqual([...client])
  })

  it.each([
    ['SKILL_ID_RE', SKILL_ID_RE],
    ['FACT_KEY_RE', FACT_KEY_RE],
    ['ISO_DAY_RE', ISO_DAY_RE],
    ['STICKER_ID_RE', STICKER_ID_RE],
  ] as const)('%s', (name, client) => {
    expect(serverRegex(name)).toBe(String(client))
  })
})

describe('contract: the client validator accepts exactly what the server accepts', () => {
  it('docs (valid and corrupted)', () => {
    fc.assert(
      fc.property(arbDoc(true), ({ kind, data }) => {
        const server = checkDocData(kind, data)
        const client = clientCheck(kind, data)
        expect(client.ok).toBe(server.ok)
        if (server.ok && client.ok) expect(client.data).toEqual(server.data)
      }),
      { numRuns: 600 },
    )
  })

  it('attempts (valid and corrupted)', () => {
    fc.assert(
      fc.property(arbAttemptData(true), (data) => {
        expect(checkAttemptData(data) !== null).toBe(validateAttemptData(data) !== null)
      }),
      { numRuns: 600 },
    )
  })
})
