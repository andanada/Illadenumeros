import type { GameId } from '../../../../core/ambit/types'
import type { PaletteColor } from '../../../model/types'

export type CabinetId = 'duel' | 'tren' | 'pesca'

export interface CabinetDef {
  id: CabinetId
  /** The existing speed game this cabinet runs (it records under this id). */
  gameId: GameId
  title: string
  tagline: string
  body: PaletteColor
  glow: PaletteColor
  emoji: string
}

export const CABINETS: readonly CabinetDef[] = [
  {
    id: 'duel',
    gameId: 'duel-llampec',
    title: 'Duel Llampec',
    tagline: 'Arriba a les estrelles!',
    body: 'lila',
    glow: 'mango',
    emoji: '⚡',
  },
  { id: 'tren', gameId: 'tren-sumes', title: 'Tren de Sumes', tagline: 'Fes córrer el tren!', body: 'cel', glow: 'llima', emoji: '🚂' },
  { id: 'pesca', gameId: 'pesca-sumes', title: 'Pesca de Sumes', tagline: 'Pesca la resposta!', body: 'menta', glow: 'rosa', emoji: '🎣' },
]

export const cabinetById = (id: CabinetId): CabinetDef => CABINETS.find((c) => c.id === id) ?? (CABINETS[0] as CabinetDef)

/** The cabinet lit as «Escalfament»: the Duel, while the errand board still has warm-up pending. Pure. */
export const warmupCabinet = (pending: number): CabinetId | undefined => (pending > 0 ? 'duel' : undefined)
