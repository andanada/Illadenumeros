import type { GameId } from '../../../core/ambit/types'

export const PIZZERIA_GAME_ID: GameId = 'poble-pizzeria'

/**
 * What the pizzeria's customers ask: sharing (C6, C7, D4, D6), the half, third and quarter (C8), a fraction of a
 * collection (D7) and equivalent fractions (E9). Sharing, parts of a collection and cutting a pizza are done with
 * the hands; the rest is played with the price tags.
 */
export const PIZZERIA_SKILLS: readonly string[] = ['C6', 'C7', 'C8', 'D4', 'D6', 'D7', 'E9']
