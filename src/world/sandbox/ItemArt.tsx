import type { ArtState, InteractableDef } from './defs'
import { surpriseProgress } from './logic/surprise'
import type { ItemState } from './logic/itemsState'
import { currentStage } from './logic/useChain'

export const artStateOf = (def: InteractableDef, item: ItemState, held: boolean): ArtState => ({
  stage: def.use ? currentStage(def.use, item.chain).id : '',
  open: item.open,
  charge: def.surpriseTaps ? surpriseProgress({ seed: '', taps: def.surpriseTaps, options: [] }, item.surprise) : 0,
  revealed: item.surprise.revealed,
  held,
})

/** An object as a standalone svg, `size` px tall. */
export function ItemArt({ def, item, size, held = false }: { def: InteractableDef; item: ItemState; size: number; held?: boolean }) {
  const aspect = def.aspect ?? 1
  return (
    <svg viewBox={`0 0 100 ${100 / aspect}`} height={size} width={size * aspect} aria-hidden="true" style={{ overflow: 'visible' }}>
      {def.art(artStateOf(def, item, held))}
    </svg>
  )
}

/** The same art for the avatar's hand: ~44 px wide, centred on (0, 0). */
export function HeldArt({ def, item }: { def: InteractableDef; item: ItemState }) {
  const aspect = def.aspect ?? 1
  const k = 44 / Math.max(100, 100 / aspect)
  return (
    <g transform={`scale(${k}) translate(-50 ${-(100 / aspect) / 2})`}>
      <g key={item.uid} className="sb-hand-pop" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        {def.art(artStateOf(def, item, true))}
      </g>
    </g>
  )
}
