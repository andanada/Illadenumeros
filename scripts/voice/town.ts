import { matesAmbit } from '../../src/ambits/mates'
import { CPA_STAGES } from '../../src/core/ambit/types'
import type { Item, SkillNode } from '../../src/core/ambit/types'
import { clipKey, normalizeSpeech } from '../../src/core/audio/normalize'
import { createRng } from '../../src/core/rng'
import { requestFor } from '../../src/world/errands/adapters'
import { WEARABLES } from '../../src/world/characters/wearables'
import { CASA_CATALOG } from '../../src/world/places/casa/furniture/catalog'
import { ALWAYS_LINES, giftLines, jarLines } from '../../src/world/townVoice'
import { TOWN_LIMITS, totalsOf } from './budget'
import type { Limits, Totals } from './budget'
import { GRADE_WEIGHT, selectWithinBudget, VALIDATION_SEEDS } from './collect'
import type { Candidate } from './collect'
import { TOWN_PLACES } from './townSources'
import type { TownPlaceSource } from './townSources'

/**
 * Which of the TOWN's lines get a studio clip, on top of the question clips (`collect.ts`).
 *
 *  - Fixed lines (thank-yous, "Obrim aviat!", the day's cheer, the jar's "all done / a little left") are always in.
 *  - The jar's per-minute lines and the gift box's lines are one-off events, weighted by how often they happen.
 *  - Requests: every skill a place serves is sampled with deterministic seeds; each sample is turned into the
 *    sentence the neighbour says by the place's OWN adapters (the ones `useErrand` is given at runtime), so what is
 *    counted is exactly what would be spoken. Items no adapter takes are read as the question (already a base clip).
 *  - Hints: the neighbour reads the hint after a wrong try or when the child asks for help.
 *
 * Probability: one "event" is one spoken request, spread evenly over the places and over the skills of each place,
 * times the same school-year weight as the questions (early grades count less). Candidates are taken by
 * probability per estimated byte until the town's allowance is full.
 */
const PLACE_SHARE = 1 / TOWN_PLACES.length
/** Chance that a request is followed by this hint (wrong try: the first two; the shown answer: the third). */
export const HINT_SHARE: readonly [number, number, number] = [0.25, 0.1, 0.05]
/** One star-jar tap or one opened gift per this many requests. */
const JAR_TAP_SHARE = 0.05
const GIFT_SHARE = 0.05
const MAIN_SET_SHARE = 0.6

const TOWN_GROUP = 'town' as const

export interface PlaceCoverage {
  readonly placeId: string
  readonly title: string
  /** Distinct request sentences found for the place (its universe, at the sampling seeds). */
  readonly universe: number
  /** Distinct request sentences of the place with a clip (question or town clip). */
  readonly covered: number
  /** Share of fresh requests (unseen seeds) that are read with a clip. */
  readonly requestHitRate: number
  /** Same for the hints the neighbour reads. */
  readonly hintHitRate: number
  /** Town clips that serve this place's requests. */
  readonly clips: number
}

export interface TownSelection extends Totals {
  readonly selected: readonly Candidate[]
  readonly universe: Totals
  readonly seeds: number
}

interface PlaceSampling {
  readonly source: TownPlaceSource
  /** Requests and hints with their summed probability. */
  readonly requests: Map<string, number>
  readonly hints: Map<string, number>
}

const skillById = new Map(matesAmbit.skills.map((s) => [s.id, s] as const))

function requestSpeech(source: TownPlaceSource, setIndex: number, item: Item): string {
  return normalizeSpeech(requestFor(source.adapterSets[setIndex] ?? [], item).request.speech)
}

/** The first adapter list is the place's own; the others (the casa's family requests) share the rest. */
const setShare = (set: number, sets: number): number => (sets === 1 ? 1 : set === 0 ? MAIN_SET_SHARE : (1 - MAIN_SET_SHARE) / (sets - 1))

function bump(map: Map<string, number>, text: string, weight: number): void {
  if (text.length > 0) map.set(text, (map.get(text) ?? 0) + weight)
}

/** Items of every skill any place serves, sampled once and read by every place that serves the skill. */
function samplePlaces(seeds: number, namespace: string): PlaceSampling[] {
  const places: PlaceSampling[] = TOWN_PLACES.map((source) => ({ source, requests: new Map(), hints: new Map() }))
  const skillIds = [...new Set(TOWN_PLACES.flatMap((p) => p.skills))].sort()
  for (const skillId of skillIds) {
    const skill: SkillNode | undefined = skillById.get(skillId)
    const generator = matesAmbit.generators[skillId]
    if (!skill || !generator) throw new Error(`Falta l’habilitat o el generador de ${skillId}`)
    const facts = matesAmbit.factsForSkill(skillId)
    const serving = places.filter((p) => p.source.skills.includes(skillId))
    const samples = seeds * CPA_STAGES.length
    for (let n = 0; n < seeds; n++) {
      for (const cpaStage of CPA_STAGES) {
        const factKey = facts.length > 0 ? facts[n % facts.length] : undefined
        const item = generator({ rng: createRng(`${namespace}:${skillId}:${cpaStage}:${n}`), cpaStage, ...(factKey ? { factKey } : {}) })
        for (const place of serving) {
          const sets = place.source.adapterSets.length
          const each = (PLACE_SHARE * GRADE_WEIGHT[skill.grade]) / (place.source.skills.length * samples)
          for (let set = 0; set < sets; set++) {
            const share = each * setShare(set, sets)
            bump(place.requests, requestSpeech(place.source, set, item), share)
            item.hints.forEach((hint, i) => bump(place.hints, normalizeSpeech(hint), share * (HINT_SHARE[i] ?? 0)))
          }
        }
      }
    }
  }
  return places
}

/** Everything the town says that is not an engine item, with its weight (Infinity = always). */
function eventLines(): { text: string; weight: number; source: string }[] {
  const always = new Set(ALWAYS_LINES)
  const jar = jarLines().filter((line) => !always.has(line))
  const gifts = giftLines([...WEARABLES, ...CASA_CATALOG])
  return [
    ...ALWAYS_LINES.map((text) => ({ text, weight: Infinity, source: 'fixed' })),
    ...jar.map((text) => ({ text, weight: JAR_TAP_SHARE / jar.length, source: 'jar' })),
    ...gifts.map((text) => ({ text, weight: GIFT_SHARE / gifts.length, source: 'gift' })),
  ]
}

/** Every distinct normalised town text with its probability. Deterministic for a given `seeds`. */
export function enumerateTownCandidates(seeds: number): Candidate[] {
  const merged = new Map<string, { weight: number; sources: Set<string> }>()
  const add = (rawText: string, weight: number, source: string): void => {
    const text = normalizeSpeech(rawText)
    if (text.length === 0) return
    const entry = merged.get(text) ?? { weight: 0, sources: new Set<string>() }
    merged.set(text, { weight: entry.weight + weight, sources: entry.sources.add(source) })
  }
  for (const line of eventLines()) add(line.text, line.weight, line.source)
  for (const place of samplePlaces(seeds, 'train')) {
    for (const [text, weight] of place.requests) add(text, weight, `poble:${place.source.id}`)
    for (const [text, weight] of place.hints) add(text, weight, `pista:${place.source.id}`)
  }
  return [...merged]
    .map(([text, { weight, sources }]) => ({ text, key: clipKey(text), weight, sources: [...sources].sort(), group: TOWN_GROUP }))
    .sort((a, b) => (a.text < b.text ? -1 : a.text > b.text ? 1 : 0))
}

/** The town's clips: candidates the question set does not already cover, best probability per byte first. */
export function collectTown(base: readonly Candidate[], options: { seeds: number; limits?: Limits }): TownSelection {
  const have = new Set(base.map((c) => c.text))
  const fresh = enumerateTownCandidates(options.seeds).filter((c) => !have.has(c.text))
  const selected = selectWithinBudget(fresh, options.limits ?? TOWN_LIMITS)
  return { ...totalsOf(selected), selected, universe: totalsOf(fresh), seeds: options.seeds }
}

/** Honest per-place coverage with seeds the selection never saw. `hasClip` receives a normalised text. */
export function measureTownCoverage(hasClip: (text: string) => boolean, selected: readonly Candidate[] = [], seeds: number = VALIDATION_SEEDS): PlaceCoverage[] {
  const fresh = samplePlaces(seeds, 'validation')
  return fresh.map((place) => {
    const share = (map: Map<string, number>): number => {
      let total = 0
      let hit = 0
      for (const [text, weight] of map) {
        total += weight
        if (hasClip(text)) hit += weight
      }
      return total === 0 ? 0 : hit / total
    }
    const tag = `poble:${place.source.id}`
    return {
      placeId: place.source.id,
      title: place.source.title,
      universe: place.requests.size,
      covered: [...place.requests.keys()].filter(hasClip).length,
      requestHitRate: share(place.requests),
      hintHitRate: share(place.hints),
      clips: selected.filter((c) => c.sources.includes(tag)).length,
    }
  })
}
