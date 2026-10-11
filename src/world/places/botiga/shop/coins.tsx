import type { InteractableDef } from '../../../sandbox/defs'
import { centsOfPiece, MoneyArt, PIECES, pieceId, pieceLabel, pieceSingle } from '../../mercat/market/MoneyArt'

export { centsOfPiece, pieceId }

/** True for the defs of the coins and notes of the till. */
export const isPiece = (defId: string): boolean => centsOfPiece(defId) !== undefined

/** Coins and notes of the till drawer, drawn with the euro art of the town. They ask for a big touch target. */
export const COIN_DEFS: readonly InteractableDef[] = PIECES.map((cents) => ({
  id: pieceId(cents),
  label: pieceLabel(cents),
  single: pieceSingle(cents),
  height: cents >= 500 ? 0.07 : 0.075,
  pickup: true,
  minHit: 64,
  art: () => <MoneyArt cents={cents} />,
}))
