import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { clipKey, clipKeyFor, normalizeSpeech } from '../../src/core/audio/normalize'
import { matesAmbit } from '../../src/ambits/mates'
import { createRng } from '../../src/core/rng'
import { requestFor } from '../../src/world/errands/adapters'
import { PLACES } from '../../src/world/places/registry'
import { fixedTownLines, THANKS } from '../../src/world/townVoice'
import { assertPlanWithinBudget, BudgetError, estimateBytes, LIMITS, SIZE_MODELS, TOWN_LIMITS, totalsOf } from './budget'
import { assertUniqueKeys } from './collect'
import { collectAll, measurePlan } from './plan'
import { collectTown, enumerateTownCandidates, HINT_SHARE, measureTownCoverage } from './town'
import { TOWN_PLACES } from './townSources'

const SMALL_SEEDS = 12
const SLOW_TEST_MS = 180_000

describe('town sources', () => {
  it('every place of the registry has a source with its own skills and at least one adapter list', () => {
    expect(TOWN_PLACES.map((p) => p.id)).toEqual(PLACES.map((p) => p.id))
    for (const place of TOWN_PLACES) {
      expect(place.skills.length).toBeGreaterThan(0)
      expect(place.adapterSets.length).toBeGreaterThan(0)
      for (const skill of place.skills) expect(matesAmbit.generators[skill]).toBeDefined()
    }
  })

  it('the casa also asks in the family’s themes (towels, kibble...)', () => {
    expect(TOWN_PLACES.find((p) => p.id === 'casa')?.adapterSets.length).toBeGreaterThan(1)
  })
})

describe('town candidates', () => {
  it('are deterministic: same seeds, same texts, keys and weights, in the same order', () => {
    const first = enumerateTownCandidates(SMALL_SEEDS)
    const second = enumerateTownCandidates(SMALL_SEEDS)
    expect(second.map((c) => [c.text, c.key, c.weight, c.sources])).toEqual(first.map((c) => [c.text, c.key, c.weight, c.sources]))
  })

  it('are normalised, keyed by their text, belong to the town group and have no key collisions', () => {
    const candidates = enumerateTownCandidates(SMALL_SEEDS)
    for (const c of candidates) {
      expect(c.text).toBe(normalizeSpeech(c.text))
      expect(c.key).toBe(clipKey(c.text))
      expect(c.group).toBe('town')
      expect(c.weight).toBeGreaterThan(0)
    }
    expect(() => assertUniqueKeys(candidates)).not.toThrow()
  })

  it('always include every fixed town line, with the highest priority where they are frequent', () => {
    const byText = new Map(enumerateTownCandidates(SMALL_SEEDS).map((c) => [c.text, c] as const))
    for (const line of fixedTownLines()) expect(byText.has(normalizeSpeech(line))).toBe(true)
    for (const thanks of THANKS) expect(byText.get(normalizeSpeech(thanks))?.weight).toBe(Infinity)
  })

  it('include the sentences each neighbour says, as the place’s own adapters word them', () => {
    const texts = enumerateTownCandidates(SMALL_SEEDS).map((c) => c)
    const botiga = texts.filter((c) => c.sources.includes('poble:botiga')).map((c) => c.text)
    expect(botiga.some((t) => /^Vull \d+ més \d+ .+! Posa.+ a la cistella\.$/.test(t))).toBe(true)
    const casa = texts.filter((c) => c.sources.includes('poble:casa')).map((c) => c.text)
    expect(casa.some((t) => /calen \d+ .+ Al bol ja n’hi ha \d+/.test(t))).toBe(true)
    // Hints are spoken by the neighbour too.
    expect(texts.some((c) => c.sources.some((s) => s.startsWith('pista:')))).toBe(true)
  })

  it('give hints less weight than the request they follow', () => {
    expect(HINT_SHARE.every((share) => share > 0 && share < 1)).toBe(true)
    expect(HINT_SHARE[0]).toBeGreaterThan(HINT_SHARE[2])
  })

  it('use the very sentence useErrand speaks: the text of requestFor(...) normalised', () => {
    const place = TOWN_PLACES.find((p) => p.id === 'botiga')
    const generator = matesAmbit.generators['A4']
    if (!place || !generator) throw new Error('missing botiga or A4')
    const item = generator({ rng: createRng('train:A4:concret:0'), cpaStage: 'concret', factKey: 'add:3+4' })
    const spoken = normalizeSpeech(requestFor(place.adapterSets[0] ?? [], item).request.speech)
    expect(spoken).toMatch(/^Vull [34] més [34] /)
    expect(spoken).not.toContain('+')
  })
})

describe('town selection', () => {
  it('respects the town’s own limits and leaves out what the question set already has', () => {
    const limits = { maxChars: 4_000, maxBytes: 600_000, reserved: 0 }
    const base = [{ text: 'Moltes gràcies!', key: clipKeyFor('Moltes gràcies!'), weight: Infinity, sources: ['x'] }]
    const town = collectTown(base, { seeds: SMALL_SEEDS, limits })
    expect(town.chars).toBeLessThanOrEqual(limits.maxChars)
    expect(town.bytes).toBeLessThanOrEqual(limits.maxBytes)
    expect(town.selected.map((c) => c.text)).not.toContain('Moltes gràcies!')
    expect(town.selected.every((c) => c.group === 'town')).toBe(true)
  })

  it('refuses a town allowance that cannot hold the fixed lines', () => {
    expect(() => collectTown([], { seeds: SMALL_SEEDS, limits: { maxChars: 10, maxBytes: 1_000_000, reserved: 0 } })).toThrow(BudgetError)
  })

  it('estimates the lighter town encoding as cheaper per character than the question clips', () => {
    expect(SIZE_MODELS.town.perChar).toBeLessThan(SIZE_MODELS.base.perChar)
    expect(estimateBytes('Vull 3 més 4 pomes!', 'town')).toBeLessThan(estimateBytes('Vull 3 més 4 pomes!', 'base'))
    expect(estimateBytes('Hola')).toBe(estimateBytes('Hola', 'base'))
  })

  it('measures the coverage of each place on unseen seeds', () => {
    const everything = measureTownCoverage(() => true, [], 10)
    expect(everything.map((p) => p.placeId)).toEqual(PLACES.map((p) => p.id))
    for (const place of everything) {
      expect(place.requestHitRate).toBeCloseTo(1)
      expect(place.covered).toBe(place.universe)
    }
    const nothing = measureTownCoverage(() => false, [], 10)
    for (const place of nothing) expect(place.requestHitRate).toBe(0)
  })
})

describe('plan budget guard', () => {
  const town = (n: number, length: number) => Array.from({ length: n }, () => ({ text: 'a'.repeat(length), group: 'town' as const }))
  const base = (n: number, length: number) => Array.from({ length: n }, () => ({ text: 'a'.repeat(length) }))

  it('throws when the town’s clips exceed the town’s payload, even if the questions are small', () => {
    expect(() => assertPlanWithinBudget([...base(10, 20), ...town(1_500, 60)])).toThrow(/pes/)
  })

  it('throws when the characters of both groups together exceed the shared total', () => {
    const roomy = { maxChars: 1_000_000, maxBytes: 10 ** 12 }
    const limits = { base: roomy, town: roomy, maxChars: 100 }
    expect(() => assertPlanWithinBudget([...base(1, 60), ...town(1, 60)], limits)).toThrow(/caràcters/)
    expect(() => assertPlanWithinBudget([...base(1, 40), ...town(1, 40)], limits)).not.toThrow()
  })

  it('throws when the question clips exceed their own allowance', () => {
    expect(() => assertPlanWithinBudget(base(2_000, 100))).toThrow(BudgetError)
  })

  it('accepts a plan inside every limit and reports the totals', () => {
    const items = [...base(3, 20), ...town(3, 20)]
    expect(assertPlanWithinBudget(items)).toEqual(totalsOf(items))
  })
})

describe('full plan at the default seeds', () => {
  let plan: ReturnType<typeof collectAll>

  beforeAll(() => {
    plan = collectAll()
  }, SLOW_TEST_MS)

  it('stays within both allowances and the 300,000-character total', () => {
    expect(plan.base.bytes).toBeLessThanOrEqual(LIMITS.maxBytes)
    expect(plan.town.bytes).toBeLessThanOrEqual(TOWN_LIMITS.maxBytes)
    expect(plan.totals.chars).toBeLessThanOrEqual(LIMITS.maxChars)
    expect(() => assertPlanWithinBudget(plan.selected)).not.toThrow()
  })

  it('has no key shared by two different texts and no text in both groups', () => {
    expect(() => assertUniqueKeys(plan.selected)).not.toThrow()
    expect(new Set(plan.selected.map((c) => c.text)).size).toBe(plan.selected.length)
  })

  it('gives every place its own requests or hints a measurable coverage', () => {
    const { places } = measurePlan(plan)
    expect(places).toHaveLength(PLACES.length)
    for (const place of places) {
      expect(place.requestHitRate).toBeGreaterThan(0)
      expect(place.requestHitRate).toBeLessThanOrEqual(1)
      expect(place.hintHitRate).toBeGreaterThan(0)
    }
  }, SLOW_TEST_MS)
})

describe('town clips on disk (after npm run voice)', () => {
  const manifestFile = join(__dirname, '..', '..', 'public', 'voice', 'manifest.json')
  const clipOnDisk = (key: string): boolean => existsSync(join(__dirname, '..', '..', 'public', 'voice', `${key}.mp3`))

  it.skipIf(!existsSync(manifestFile))('has a clip, under the key speak() computes, for every fixed town line', () => {
    const manifest = new Set((JSON.parse(readFileSync(manifestFile, 'utf8')) as { clips: string[] }).clips)
    for (const line of fixedTownLines()) {
      const key = clipKeyFor(line)
      expect(manifest.has(key), line).toBe(true)
      expect(clipOnDisk(key), line).toBe(true)
    }
  })
})
