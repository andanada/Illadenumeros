import { MATES_SKILLS } from '../../../ambits/mates/skills'
import type { GameId } from '../../../core/ambit/types'

export const BOTIGA_GAME_ID: GameId = 'poble-botiga'

/** Games whose skills the shop serves: the old Botiga de la Pluja (money) and the addition / subtraction games. */
const SOURCE_GAMES: readonly GameId[] = ['botiga-pluja', 'marc-magic', 'tren-sumes', 'pesca-sumes', 'cursa-recta', 'bombolles']

/** Skills of the A and B series and euros that the shop's errands practise (adds, subtracts, money). */
const isAddSubOrMoney = (id: string, operation: string | undefined): boolean =>
  operation === 'add' || operation === 'sub' || ['A3', 'A10', 'B4', 'B5', 'B6', 'B7', 'C2', 'C9', 'E10'].includes(id)

export const BOTIGA_SKILLS: readonly string[] = MATES_SKILLS.filter((s) => s.games.some((g) => SOURCE_GAMES.includes(g)) && isAddSubOrMoney(s.id, s.operation)).map((s) => s.id)
