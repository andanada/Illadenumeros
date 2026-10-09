import type { Placement } from '../../../model/types'
import { Draggable } from '../../../scene/Draggable'
import { FurnitureArt } from '../furniture/FurnitureArt'
import { FURNITURE_BY_ID, withArticle } from '../furniture/catalog'
import { depthOf, toLocalX } from './homeLogic'

export const PLACED_KIND = 'moble-col·locat'
export const placedPropId = (uid: string): string => `col:${uid}`
export const uidOfProp = (id: string): string => id.replace(/^col:/, '')

export interface PlacedPieceProps {
  placement: Placement
  selected: boolean
  lit: boolean
  onSelect: (uid: string) => void
}

/** A piece standing in the room: drag it somewhere else, or tap it to pick it for the toolbar. */
export function PlacedPiece({ placement: p, selected, lit, onSelect }: PlacedPieceProps) {
  const def = FURNITURE_BY_ID[p.item]
  if (!def) return null
  const state = def.action === 'lamp' ? (lit ? ', encès' : ', apagat') : ''
  return (
    <div
      className="absolute"
      style={{
        left: `${toLocalX(p.x) * 100}%`,
        top: `${p.y * 100}%`,
        height: `calc(${def.h / 600} * min(100cqh, 105cqw))`,
        transform: 'translate(-50%, -100%)',
        zIndex: depthOf(p, def) + (selected ? 400 : 0),
      }}
      data-placed={p.item}
    >
      <Draggable
        prop={{ id: placedPropId(p.uid), label: withArticle(def), kind: PLACED_KIND }}
        name={`${def.name}${state}${selected ? ', triat' : ''}`}
        pickOnTap={false}
        sound={def.action === 'lamp' ? 'beep' : 'squish'}
        onTap={() => onSelect(p.uid)}
        className={`h-full rounded-2xl ${selected ? 'outline-dashed outline-4 outline-offset-4 outline-white/90' : ''}`}
      >
        <FurnitureArt id={p.item} color={p.color} flip={p.flip} lit={lit} />
      </Draggable>
    </div>
  )
}
