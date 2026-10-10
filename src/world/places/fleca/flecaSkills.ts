import type { GameId } from '../../../core/ambit/types'

export const FLECA_GAME_ID: GameId = 'poble-fleca'

/**
 * What the bakery's customers ask: what multiplying means (C3), every table (C4, C5, D2, D3), 2-digit × 1-digit (D5),
 * squares (E7) and sharing the bake onto trays (C6). All of them have a version done with trays and boxes or, when it
 * does not fit the room, the price tags.
 */
export const FLECA_SKILLS: readonly string[] = ['C3', 'C4', 'C5', 'C6', 'D2', 'D3', 'D5', 'E7']
