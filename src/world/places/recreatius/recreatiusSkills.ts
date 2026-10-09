import type { GameId } from '../../../core/ambit/types'
import { DUEL_SKILLS } from '../../../games/duel-llampec/duelLogic'

/**
 * The arcade has no errands of its own: the three cabinets run the speed games, and each records under its own
 * game id. The place itself is registered under the warm-up game (the Duel), whose facts it counts on the board.
 */
export const RECREATIUS_GAME_ID: GameId = 'duel-llampec'

export const RECREATIUS_SKILLS: readonly string[] = DUEL_SKILLS
