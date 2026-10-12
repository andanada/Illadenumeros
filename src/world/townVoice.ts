import type { CatalogEntry } from './model/types'
import { GIFT_KINDS } from './board/boardState'
import { isWearable } from './board/wearGift'
import { jarMessage } from './hud/jarMessage'

/**
 * Every line of the town that is always the same, in one place. The runtime (`speak(...)`) and the clip
 * collector (`scripts/voice`) both import from here, so a sentence the town says is a sentence that gets a studio
 * clip: change the text here and `npm run voice` picks it up; nothing is duplicated.
 *
 * Lines that depend on the engine's item (the neighbour's request and hints) are not listed here: the collector
 * samples them from the places' own adapters. Names of people never go into a spoken line (they are shown, not
 * read), so there is nothing to interpolate and no line that can only be read by the device voice.
 */

/** The neighbour's thank-you, by turns (visit % 4). */
export const THANKS = ['Moltes gràcies!', 'Perfecte, gràcies!', 'Genial! Fins aviat!', 'Que bé! Gràcies!'] as const

/** A place still under construction on the street. */
export const CLOSED_PLACE_LINE = 'Obrim aviat!'

/** The surprise when the board was finished but the wardrobe has nothing left to give. */
export const CHEER_LINE = 'Has fet tots els encàrrecs d’avui!'

/** What the gift box says once opened. */
export const giftMessage = (entry: Pick<CatalogEntry, 'name' | 'kind'>): string =>
  `${entry.name}! És per a tu. ${isWearable(entry) ? 'Ja és al teu armari.' : 'Ja és a casa teva.'}`

/** Daily goals the parents can pick (8, 12, 16, 20 minutes): the jar never has to say more than this. */
export const JAR_MAX_MINUTES = 20

/** All the sentences the star jar can say (done, "a little left", and one per whole number of minutes). */
export const jarLines = (): readonly string[] => [
  jarMessage({ done: true, minutesLeft: 0 }),
  jarMessage({ done: false, minutesLeft: 1 }),
  ...Array.from({ length: JAR_MAX_MINUTES - 1 }, (_, i) => jarMessage({ done: false, minutesLeft: i + 2 })),
]

/** Every gift the box can hold, from the entries the town registers. */
export const giftLines = (entries: readonly CatalogEntry[]): readonly string[] =>
  entries.filter((e) => GIFT_KINDS.has(e.kind) && e.price > 0).map((e) => giftMessage(e))

/** The lines said often enough to always have a clip. A new fixed line of the town goes here (and is spoken through `speak`). */
export const ALWAYS_LINES: readonly string[] = [...THANKS, CLOSED_PLACE_LINE, CHEER_LINE, jarMessage({ done: true, minutesLeft: 0 }), jarMessage({ done: false, minutesLeft: 1 })]

/** The lines that never change, without the gifts (they depend on the catalogue). */
export const fixedTownLines = (): readonly string[] => [...new Set([...ALWAYS_LINES, ...jarLines()])]
