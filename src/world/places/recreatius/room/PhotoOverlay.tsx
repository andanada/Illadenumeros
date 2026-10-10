import { useState } from 'react'
import { Avatar, Neighbour, Pet } from '../../../characters'
import { useCast } from '../../../sandbox/CastContext'
import { useWorldReducedMotion } from '../../../scene/useReducedMotion'
import { arcadeSfx } from '../arcadeSfx'
import { frameAt, photoSaid } from './photoFrames'

const pill = 'min-h-16 rounded-full px-6 text-xl font-bold shadow-[var(--world-shadow-lift)] active:translate-y-0.5'

function Subject({ id }: { id: string }) {
  const cast = useCast()
  const seed = cast.seeds[id]
  if (!seed) return null
  if (seed.kind === 'pet' && seed.pet) return <Pet id={seed.pet} size={150} pose="happy" title="" />
  if (seed.kind === 'neighbour' && seed.neighbour) return <Neighbour id={seed.neighbour} size={190} pose="cheer" title="" />
  if (seed.avatar) return <Avatar spec={seed.avatar} size={190} pose="cheer" seed={seed.id} />
  return null
}

export interface PhotoOverlayProps {
  /** Who is in the picture (the character she is moving). */
  actorId: string
  onClose: () => void
}

/**
 * The photo booth's picture: the chosen character with a funny sticker frame. The existing sticker album only
 * holds the fixed collection stickers, so the picture is shown (and can be taken again) but not kept.
 */
export function PhotoOverlay({ actorId, onClose }: PhotoOverlayProps) {
  const cast = useCast()
  const reduced = useWorldReducedMotion()
  const [n, setN] = useState(0)
  const frame = frameAt(n)
  const name = cast.seeds[actorId]?.name ?? 'algú'
  return (
    <div role="dialog" aria-label="La cabina de fotos" data-testid="photo-overlay" className="absolute inset-0 z-[3600] flex flex-col items-center justify-center gap-3 bg-[#2b2440]/60 p-3">
      <div
        key={n}
        role="img"
        aria-label={`Foto de ${name} amb ${frame.name}`}
        data-frame={frame.id}
        className={`relative grid aspect-[4/5] h-[min(62vh,26rem)] place-items-end overflow-hidden rounded-[1.8rem] border-[14px] shadow-[var(--world-shadow-lift)] ${reduced ? '' : 'sb-pop'}`}
        style={{ background: frame.bg, borderColor: frame.border }}
      >
        <div className="mb-3 scale-[1.15]">
          <Subject id={actorId} />
        </div>
        {frame.stickers.map((s, i) => (
          <span key={i} aria-hidden="true" className="absolute leading-none drop-shadow" style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, fontSize: `${s.size * 2.6}rem`, transform: `translate(-50%, -50%) rotate(${s.rot}deg)` }}>
            {s.glyph}
          </span>
        ))}
      </div>
      <p role="status" aria-live="polite" className="rounded-full bg-white px-4 py-1 text-lg font-bold text-[var(--world-ink,#2b2440)]">
        {photoSaid(name, frame)}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            arcadeSfx.prize()
            setN((v) => v + 1)
          }}
          className={`${pill} bg-[var(--world-mango,#ffb834)] text-[var(--world-ink,#2b2440)]`}
        >
          <span aria-hidden="true">📸 </span>Una altra!
        </button>
        <button type="button" onClick={onClose} className={`${pill} bg-white text-[var(--world-ink,#2b2440)]`}>
          Torna a la sala
        </button>
      </div>
    </div>
  )
}
