import type { Placement } from '../../../model/types'
import { useScene } from '../../../scene/SceneContext'
import { FURNITURE_BY_ID, withArticle } from '../furniture/catalog'
import type { Direction } from './homeLogic'
import { PLACED_KIND, placedPropId } from './PlacedPiece'

export interface PieceToolbarProps {
  piece: Placement
  lit: boolean
  onNudge: (dir: Direction) => void
  onFlip: () => void
  onColour: () => void
  onAction: () => void
  onStore: () => void
  onDone: () => void
}

const base = 'grid min-h-14 min-w-14 place-items-center rounded-2xl px-2 text-lg font-bold shadow-[var(--world-shadow-soft)] active:translate-y-0.5'
const btn = `${base} bg-white text-[var(--world-ink,#2b2440)]`

const ARROWS: readonly { dir: Direction; label: string; glyph: string }[] = [
  { dir: 'left', label: 'Mou-ho a l’esquerra', glyph: '←' },
  { dir: 'up', label: 'Mou-ho enrere', glyph: '↑' },
  { dir: 'down', label: 'Mou-ho endavant', glyph: '↓' },
  { dir: 'right', label: 'Mou-ho a la dreta', glyph: '→' },
]

/**
 * What she can do with the chosen piece, without dragging: step it around, pick it up to put it with a tap
 * elsewhere, flip it, change its colour, switch it on / sleep in it, or put it away (it stays bought).
 */
export function PieceToolbar({ piece, lit, onNudge, onFlip, onColour, onAction, onStore, onDone }: PieceToolbarProps) {
  const scene = useScene()
  const def = FURNITURE_BY_ID[piece.item]
  if (!def) return null
  const prop = { id: placedPropId(piece.uid), label: withArticle(def), kind: PLACED_KIND }
  return (
    <div role="toolbar" aria-label={`Què fem amb ${withArticle(def)}?`} className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-[1.6rem] bg-[#FFF3DC]/95 p-2 shadow-[var(--world-shadow-lift)]">
      {ARROWS.map((a) => (
        <button key={a.dir} type="button" aria-label={a.label} onClick={() => onNudge(a.dir)} className={`${btn} text-2xl`}>
          {a.glyph}
        </button>
      ))}
      <button type="button" onClick={() => scene.pick(prop)} className={btn}>
        <span aria-hidden="true">✋&nbsp;</span>Agafa
      </button>
      <button type="button" onClick={onFlip} className={btn}>
        <span aria-hidden="true">↔&nbsp;</span>Gira
      </button>
      {def.recolourable && (
        <button type="button" onClick={onColour} className={btn}>
          <span aria-hidden="true">🎨&nbsp;</span>Color
        </button>
      )}
      {def.action === 'lamp' && (
        <button type="button" onClick={onAction} className={btn}>
          <span aria-hidden="true">💡&nbsp;</span>
          {lit ? 'Apaga' : 'Encén'}
        </button>
      )}
      {def.action === 'bed' && (
        <button type="button" onClick={onAction} className={btn}>
          <span aria-hidden="true">🌙&nbsp;</span>A dormir
        </button>
      )}
      <button type="button" onClick={onStore} className={btn}>
        <span aria-hidden="true">📦&nbsp;</span>Guarda
      </button>
      <button type="button" onClick={onDone} className={`${base} bg-[var(--world-menta,#36c5a2)] px-5 text-white`}>
        Fet
      </button>
    </div>
  )
}
