import type { Placement } from '../../../model/types'
import { FURNITURE_BY_ID } from '../furniture/catalog'
import { pieceHeightPx } from './walkables'
import { decode, stageX, ZONE_BY_ID, type FloorId } from './zones'
import { useStage } from '../../../sandbox/StageContext'

const GLOW = 'radial-gradient(circle, rgba(255,236,160,0.8) 0%, rgba(255,214,120,0.38) 40%, rgba(255,214,120,0) 70%)'

export interface NightLayerProps {
  floor: FloorId
  /** It is night in the whole house. */
  night: boolean
  /** The ceiling light of this floor is on. */
  lightOn: boolean
  pieces: readonly Placement[]
  lit: readonly string[]
}

/** Night dims a floor unless its light is on; lit lamps glow through the dark. Decorative. */
export function NightLayer({ floor, night, lightOn, pieces, lit }: NightLayerProps) {
  const size = useStage()
  const dark = night && !lightOn
  const lamps = pieces.filter((p) => lit.includes(p.uid) && FURNITURE_BY_ID[p.item]?.action === 'lamp' && ZONE_BY_ID[decode(p).zone].floor === floor)
  return (
    <div aria-hidden="true" data-testid={`nit-${floor}`} data-dark={dark} className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 1100 }}>
      <div className="absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none" style={{ background: '#2F2A5A', opacity: dark ? 0.55 : night ? 0.12 : 0, mixBlendMode: 'multiply' }} />
      {lightOn && <div className="absolute left-1/2 top-0 h-[70%] w-[60%] -translate-x-1/2" style={{ background: GLOW, mixBlendMode: 'screen', opacity: night ? 0.55 : 0.22 }} />}
      {lamps.map((p) => {
        const s = decode(p)
        const top = p.y - (pieceHeightPx(p.item, size) / size.h) * 0.75
        return <span key={p.uid} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${stageX(s.zone, s.x) * 100}%`, top: `${top * 100}%`, width: size.h * 1.1, height: size.h * 1.1, background: GLOW, mixBlendMode: 'screen' }} />
      })}
    </div>
  )
}
