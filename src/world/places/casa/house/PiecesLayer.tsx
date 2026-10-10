import type { Placement } from '../../../model/types'
import { Draggable } from '../../../scene/Draggable'
import { DropZone } from '../../../scene/DropZone'
import type { PropInfo } from '../../../scene/SceneContext'
import { stackOf, useStage } from '../../../sandbox/StageContext'
import { PLACED_KIND, placedPropId } from '../home/placedProps'
import { CATALOGUE_KIND } from '../home/Catalogue'
import { FURNITURE_BY_ID, withArticle } from '../furniture/catalog'
import { FurnitureArt } from '../furniture/FurnitureArt'
import { pieceHeightPx } from './walkables'
import { decode, FLOOR_BY_ID, COLUMN, stageX, ZONE_BY_ID, type FloorId, type ZoneId } from './zones'

export interface PiecesLayerProps {
  floor: FloorId
  pieces: readonly Placement[]
  decorating: boolean
  selectedUid: string | undefined
  lit: readonly string[]
  onSelect: (uid: string) => void
  onToggleLamp: (uid: string) => void
  onDrop: (zone: ZoneId, prop: PropInfo) => void
}

const depth = (p: Placement, flat: boolean, wall: boolean): number => (flat ? 3 : wall ? 6 : stackOf(p.y) - 5)

/** The furniture she placed on this floor: part of the scene while playing, draggable while decorating. */
export function PiecesLayer({ floor, pieces, decorating, selectedUid, lit, onSelect, onToggleLamp, onDrop }: PiecesLayerProps) {
  const size = useStage()
  const here = pieces.filter((p) => ZONE_BY_ID[decode(p).zone].floor === floor)
  return (
    <>
      {here.map((p) => {
        const def = FURNITURE_BY_ID[p.item]
        if (!def) return null
        const s = decode(p)
        const px = pieceHeightPx(p.item, size)
        const isLit = lit.includes(p.uid)
        const selected = selectedUid === p.uid
        const z = decorating ? 2100 + depth(p, !!def.flat, !!def.wall) + (selected ? 900 : 0) : depth(p, !!def.flat, !!def.wall)
        const style = { left: `${stageX(s.zone, s.x) * 100}%`, top: `${p.y * 100}%`, height: px, transform: 'translate(-50%, -100%)', zIndex: z }
        const state = def.action === 'lamp' ? (isLit ? ', encès' : ', apagat') : ''
        if (decorating) {
          return (
            <div key={p.uid} className="absolute" style={style} data-placed={p.item} data-uid-placed={p.uid}>
              <Draggable
                prop={{ id: placedPropId(p.uid), label: withArticle(def), kind: PLACED_KIND }}
                name={`${def.name}${state}${selected ? ', triat' : ''}`}
                pickOnTap={false}
                sound={def.action === 'lamp' ? 'beep' : 'squish'}
                onTap={() => onSelect(p.uid)}
                className={`h-full min-w-16 rounded-2xl ${selected ? 'outline-dashed outline-4 outline-offset-4 outline-white/90' : ''}`}
              >
                <FurnitureArt id={p.item} color={p.color} flip={p.flip} lit={isLit} />
              </Draggable>
            </div>
          )
        }
        const lamp = def.action === 'lamp'
        return (
          <div key={p.uid} className="absolute" style={{ ...style, pointerEvents: lamp ? 'auto' : 'none' }} data-placed={p.item} data-uid-placed={p.uid}>
            {lamp ? (
              <button
                type="button"
                aria-label={`${def.name}${state}: ${isLit ? 'apaga-la' : 'encén-la'}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleLamp(p.uid)
                }}
                className="h-full min-w-16 cursor-pointer border-0 bg-transparent p-0 outline-none focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--world-focus,#4da6ec)]"
              >
                <FurnitureArt id={p.item} color={p.color} flip={p.flip} lit={isLit} />
              </button>
            ) : (
              <FurnitureArt id={p.item} color={p.color} flip={p.flip} lit={isLit} />
            )}
          </div>
        )
      })}
      {decorating && FLOOR_BY_ID[floor].zones.map((zone, i) => <ZoneDrop key={zone} zone={zone} left={COLUMN + i * 0.4} onDrop={onDrop} />)}
    </>
  )
}

function ZoneDrop({ zone, left, onDrop }: { zone: ZoneId; left: number; onDrop: (zone: ZoneId, prop: PropInfo) => void }) {
  const name = ZONE_BY_ID[zone].name
  return (
    <DropZone
      id={`zona-${zone}`}
      label={name.charAt(0).toLowerCase() + name.slice(1)}
      accepts={(p) => p.kind === CATALOGUE_KIND || p.kind === PLACED_KIND}
      onDrop={(p) => onDrop(zone, p)}
      className="absolute! rounded-none! border-2 border-dashed border-white/50"
      style={{ left: `${left * 100}%`, top: 0, width: '40%', height: '100%', zIndex: 2000 }}
    />
  )
}
