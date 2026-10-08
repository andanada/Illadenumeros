/** Contract shared by every game component and the screens that host them. */
export interface GameSummary {
  answered: number
  correct: number
  petals: number
  /** Skills that became "dominada" during the game. */
  masteredSkillIds: string[]
}

export interface GameProps {
  /** Skills this game may show (already restricted by the host, e.g. the daily mission). */
  skillIds?: readonly string[]
  /** Maximum number of questions/rounds; undefined = play freely until the child leaves. */
  maxRounds?: number
  /** Called when the child leaves the game (back button) without finishing. */
  onExit: () => void
  /** Called when the game ends by itself (round limit or timer). */
  onComplete: (summary: GameSummary) => void
}

export const GAME_TITLES: Record<string, string> = {
  'repte-illa': 'El Repte de l’Illa',
  'duel-llampec': 'Duel Llampec',
  'tren-sumes': 'Tren de Sumes',
  'pesca-sumes': 'Pesca de Sumes',
  bombolles: 'Bombolles Amigues del 10',
  'marc-magic': 'El Marc Màgic',
  'cursa-recta': 'Cursa a la Recta',
  'fleca-files': 'La Fleca de les Files',
  llaminadures: 'Repartim Llaminadures',
  'botiga-pluja': 'La Botiga de la Pluja',
  'numero-amagat': 'El Número Amagat',
  'pastis-fraccions': 'Pastís de Fraccions',
  'laberint-aventura': 'Laberint de l’Aventura',
  'poble-botiga': 'La Botiga del Poble',
  'poble-casa': 'La Casa del Poble',
  'poble-autobus': 'L’Autobús del Poble',
}
