import { PALETTE as P } from '../../../art/palette'
import { Avatar } from '../../../scene/art'
import { useStage } from '../../../sandbox/StageContext'
import type { AvatarSpec } from '../../../model/types'

/** The mirror on the wall: it shows the customer from the front, so the new look is seen at once. */
export function SalonMirror({ look, name }: { look: AvatarSpec | undefined; name: string | undefined }) {
  const { unit } = useStage()
  const w = unit * 0.24
  const h = unit * 0.3
  return (
    <div
      role="img"
      data-testid="mirall"
      aria-label={name ? `El mirall, amb ${name}` : 'El mirall, buit'}
      className="pointer-events-none absolute overflow-hidden rounded-[2rem] shadow-[var(--world-shadow-lift)]"
      style={{ left: '50%', top: '43%', transform: 'translate(-50%, -100%)', width: w, height: h, padding: 7, background: P.mango.base, zIndex: 2 }}
    >
      <div className="relative grid h-full w-full place-items-center overflow-hidden rounded-[1.6rem]" style={{ background: 'linear-gradient(135deg, #DDF3FF, #BFE6FF 60%, #EAF8FF)' }}>
        {look && (
          <div style={{ transform: 'scaleX(-1)' }}>
            <Avatar spec={look} crop="head" size={h * 0.78} title="" animated={false} />
          </div>
        )}
        <span aria-hidden="true" className="absolute left-3 top-3 h-2 w-10 -rotate-[20deg] rounded-full bg-white/70" />
        <span aria-hidden="true" className="absolute left-3 top-7 h-2 w-4 -rotate-[20deg] rounded-full bg-white/60" />
      </div>
    </div>
  )
}
