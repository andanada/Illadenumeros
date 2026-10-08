import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { clipKey, normalizeSpeech } from '../../src/core/audio/normalize'
import { assertWithinBudget, BudgetError, BYTES_BASE, estimateBytes, LIMITS, RESERVED_BYTES, totalsOf } from './budget'
import {
  assertUniqueKeys,
  byValue,
  collectTexts,
  DEFAULT_SEEDS,
  enumerateCandidates,
  measureCoverage,
  selectWithinBudget,
} from './collect'
import type { Candidate } from './collect'
import { FIXED_PHRASES } from './phrases'
import { buildSsml, escapeXml, VOICE } from './ssml'

const SMALL_SEEDS = 12
/** The default 1500-seed sampling takes ~3 s, ~20 s under coverage instrumentation. */
const SLOW_TEST_MS = 120_000
const candidate = (text: string, weight: number): Candidate => ({ text, key: clipKey(text), weight, sources: ['t'] })

describe('collect', () => {
  it('is deterministic: same seeds, same selection, in the same order', () => {
    const first = collectTexts({ seeds: SMALL_SEEDS })
    const second = collectTexts({ seeds: SMALL_SEEDS })
    expect(second.selected.map((c) => [c.key, c.text, c.weight])).toEqual(first.selected.map((c) => [c.key, c.text, c.weight]))
    expect(second.chars).toBe(first.chars)
  })

  it('always includes every fixed phrase, normalised', () => {
    const texts = new Set(collectTexts({ seeds: SMALL_SEEDS }).selected.map((c) => c.text))
    for (const phrase of FIXED_PHRASES) expect(texts.has(normalizeSpeech(phrase))).toBe(true)
  })

  it('finds question prompts from the generators and keys them by their normalised text', () => {
    const candidates = enumerateCandidates(SMALL_SEEDS)
    const a4 = candidates.filter((c) => c.sources.includes('A4'))
    expect(a4.length).toBeGreaterThan(10)
    for (const c of candidates) {
      expect(c.text).toBe(normalizeSpeech(c.text))
      expect(c.key).toBe(clipKey(c.text))
      expect(c.text.length).toBeGreaterThan(0)
    }
    expect(() => assertUniqueKeys(candidates)).not.toThrow()
  })

  it('saturates fact skills: all additions up to 10 are enumerated', () => {
    const texts = new Set(enumerateCandidates(DEFAULT_SEEDS).map((c) => c.text))
    expect(texts.has('Quant fa 3 més 4?')).toBe(true)
    expect(texts.has('Quant fa 7 per 8?')).toBe(true)
  }, SLOW_TEST_MS)

  it('stays within the real budget at the default seeds', () => {
    const selection = collectTexts()
    expect(selection.chars).toBeLessThanOrEqual(LIMITS.maxChars)
    expect(selection.bytes).toBeLessThanOrEqual(LIMITS.maxBytes - RESERVED_BYTES)
    expect(() => assertWithinBudget(selection.selected)).not.toThrow()
    expect(selection.universe.clips).toBeGreaterThan(selection.clips)
  }, SLOW_TEST_MS)

  it('respects custom limits and keeps the most probable prompts', () => {
    const limits = { maxChars: 3_000, maxBytes: RESERVED_BYTES + 900_000 }
    const selection = collectTexts({ seeds: SMALL_SEEDS, limits })
    expect(selection.chars).toBeLessThanOrEqual(limits.maxChars)
    expect(selection.bytes).toBeLessThanOrEqual(limits.maxBytes - RESERVED_BYTES)
    expect(selection.selected.length).toBeGreaterThanOrEqual(FIXED_PHRASES.length)
  })

  it('measures coverage on seeds the selection never saw', () => {
    const coverage = measureCoverage(collectTexts({ seeds: SMALL_SEEDS }), 20)
    expect(coverage.overall).toBeGreaterThan(0)
    expect(coverage.overall).toBeLessThan(1)
    for (const skill of coverage.perSkill) {
      expect(skill.hitRate).toBeGreaterThanOrEqual(0)
      expect(skill.hitRate).toBeLessThanOrEqual(1)
    }
  })
})

describe('budget guard', () => {
  it('throws when the characters exceed the limit', () => {
    const items = [{ text: 'a'.repeat(300_001) }]
    expect(() => assertWithinBudget(items)).toThrow(BudgetError)
    expect(() => assertWithinBudget(items)).toThrow(/caràcters/)
  })

  it('throws when the estimated payload exceeds the limit', () => {
    const items = Array.from({ length: 2_000 }, () => ({ text: 'a'.repeat(100) }))
    expect(() => assertWithinBudget(items)).toThrow(/pes/)
  })

  it('accepts a selection inside both limits and reports totals', () => {
    const totals = assertWithinBudget([{ text: 'Hola' }, { text: 'Adéu' }])
    expect(totals).toEqual(totalsOf([{ text: 'Hola' }, { text: 'Adéu' }]))
    expect(totals.chars).toBe(8)
  })

  it('estimates larger clips for longer text', () => {
    expect(estimateBytes('')).toBe(BYTES_BASE)
    expect(estimateBytes('Quant fa 3 més 4?')).toBeLessThan(estimateBytes('Quant fa 3 més 4? Pensa-ho bé.'))
  })

  it('refuses a selection whose fixed phrases do not fit', () => {
    const limits = { maxChars: 5, maxBytes: LIMITS.maxBytes }
    expect(() => selectWithinBudget([candidate('Molt bé!', Infinity)], limits)).toThrow(BudgetError)
  })

  it('skips what does not fit and keeps filling with cheaper candidates, best value first', () => {
    const limits = { maxChars: 12, maxBytes: LIMITS.maxBytes }
    const chosen = selectWithinBudget([candidate('molt llarga frase', 0.9), candidate('curta', 0.5), candidate('altra', 0.4)], limits)
    expect(chosen.map((c) => c.text)).toEqual(['altra', 'curta'])
    expect(byValue([candidate('b', 0.1), candidate('a', 0.1), candidate('fixa', Infinity)]).map((c) => c.text)).toEqual(['fixa', 'a', 'b'])
  })

  it('detects a key collision between two different texts', () => {
    expect(() => assertUniqueKeys([{ ...candidate('un', 1), key: 'aaaaaaaaaaaa' }, { ...candidate('dos', 1), key: 'aaaaaaaaaaaa' }])).toThrow(/Col·lisió/)
    expect(() => assertUniqueKeys([candidate('un', 1), candidate('un', 2)])).not.toThrow()
  })
})

describe('ssml', () => {
  it('uses the Catalan voice, a slightly slower rate and escapes the text', () => {
    const ssml = buildSsml('Tom & Jerry <3 "hola"')
    expect(ssml).toContain(`name="${VOICE}"`)
    expect(ssml).toContain('xml:lang="ca-ES"')
    expect(ssml).toContain('rate="-5%"')
    expect(ssml).toContain('Tom &amp; Jerry &lt;3 &quot;hola&quot;')
    expect(escapeXml("l'a")).toBe('l&apos;a')
  })
})

describe('generated clips on disk', () => {
  const dir = join(__dirname, '..', '..', 'public', 'voice')
  const manifestFile = join(dir, 'manifest.json')

  it.skipIf(!existsSync(manifestFile))('manifest only lists existing, small-enough clips within the payload budget', () => {
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as { version: number; clips: string[] }
    expect(manifest.version).toBe(1)
    expect(new Set(manifest.clips).size).toBe(manifest.clips.length)
    const files = new Set(readdirSync(dir).filter((f) => f.endsWith('.mp3')))
    for (const key of manifest.clips) expect(files.has(`${key}.mp3`)).toBe(true)
    const bytes = [...files].reduce((sum, f) => sum + statSync(join(dir, f)).size, 0)
    expect(bytes).toBeLessThanOrEqual(LIMITS.maxBytes)
  })
})
