import { PALETTE as P } from '../../../art/palette'
import { sparklePath } from '../../../art/paths'
import type { RoomId } from '../furniture/types'

/** The decorative shell of each room: wallpaper, skirting, floor and a window (day or night outside). */

interface Look {
  wall: string
  stripe: string
  dot: string
  floor: string
  floorLine: string
  skirting: string
}

const LOOKS: Readonly<Record<RoomId, Look>> = {
  sala: { wall: '#FFE2CF', stripe: '#FFD6BD', dot: P.coral.light, floor: '#C98D5E', floorLine: '#B57849', skirting: P.xocolata.base },
  habitacio: { wall: '#E4DDFB', stripe: '#D9D0F7', dot: P.cel.light, floor: '#D9A274', floorLine: '#C08656', skirting: P.lila.shade },
  cuina: { wall: '#DDF5EC', stripe: '#CFEFE3', dot: P.menta.light, floor: '#F3E3C3', floorLine: '#E0CB9F', skirting: P.menta.shade },
}

function Wallpaper({ room }: { room: RoomId }) {
  const l = LOOKS[room]
  const id = `casa-paper-${room}`
  return (
    <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <pattern id={id} width="56" height="56" patternUnits="userSpaceOnUse">
          <rect width="56" height="56" fill={l.wall} />
          {room === 'cuina' ? (
            <>
              <rect x="1" y="1" width="26" height="26" rx="5" fill={l.stripe} />
              <rect x="29" y="29" width="26" height="26" rx="5" fill={l.stripe} />
            </>
          ) : (
            <rect x="0" width="18" height="56" fill={l.stripe} />
          )}
          {room === 'habitacio' ? (
            <path d="M38 14 l2.4 5 5.4 .6 -4 3.6 1.2 5.4 -5 -2.8 -5 2.8 1.2 -5.4 -4 -3.6 5.4 -.6 Z" fill={l.dot} />
          ) : (
            <circle cx="38" cy="16" r="4" fill={l.dot} />
          )}
          <circle cx="38" cy="44" r="2.4" fill={l.dot} opacity="0.7" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

function Floor({ room }: { room: RoomId }) {
  const l = LOOKS[room]
  const id = `casa-floor-${room}`
  return (
    <div className="absolute inset-x-0 bottom-0 h-[34%]" aria-hidden="true">
      <div className="absolute inset-x-0 -top-3 h-3" style={{ background: l.skirting }} />
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <pattern id={id} width={room === 'cuina' ? 64 : 220} height={room === 'cuina' ? 64 : 48} patternUnits="userSpaceOnUse">
            {room === 'cuina' ? (
              <>
                <rect width="64" height="64" fill={l.floor} />
                <rect width="32" height="32" fill={l.floorLine} />
                <rect x="32" y="32" width="32" height="32" fill={l.floorLine} />
              </>
            ) : (
              <>
                <rect width="220" height="48" fill={l.floor} />
                <rect y="22" width="220" height="2" fill={l.floorLine} />
                <rect y="46" width="220" height="2" fill={l.floorLine} />
                <rect x="150" width="2" height="22" fill={l.floorLine} />
                <rect x="50" y="24" width="2" height="22" fill={l.floorLine} />
              </>
            )}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    </div>
  )
}

/** The window: sunny hills by day, a moon and stars by night. */
export function HomeWindow({ night, className = '' }: { night: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 200 170" className={className} aria-hidden="true">
      <rect x="0" y="0" width="200" height="160" rx="16" fill={P.neu.base} />
      <rect x="12" y="12" width="176" height="136" rx="10" fill={night ? '#3B3470' : '#A9DCFF'} />
      {night ? (
        <>
          <circle cx="140" cy="46" r="16" fill={P.mango.light} />
          <circle cx="148" cy="40" r="14" fill="#3B3470" />
          {[
            [40, 34],
            [70, 60],
            [104, 30],
            [168, 86],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill="#FFF3B0" />
          ))}
          <path d="M12 116 Q70 92 120 108 Q160 118 188 100 L188 148 L12 148 Z" fill="#2E5C55" />
        </>
      ) : (
        <>
          <circle cx="150" cy="42" r="16" fill={P.mango.light} />
          <path d="M12 116 Q70 92 120 108 Q160 118 188 100 L188 148 L12 148 Z" fill={P.llima.light} />
          <rect x="40" y="90" width="8" height="28" rx="3" fill={P.xocolata.base} />
          <circle cx="44" cy="84" r="16" fill={P.llima.base} />
        </>
      )}
      <rect x="96" y="12" width="8" height="136" fill={P.neu.base} />
      <path d="M12 12 L58 12 Q44 70 26 148 L12 148 Z" fill={P.rosa.light} />
      <path d="M188 12 L142 12 Q156 70 174 148 L188 148 Z" fill={P.rosa.light} />
      <rect x="-6" y="148" width="212" height="14" rx="6" fill={P.xocolata.light} />
    </svg>
  )
}

function Pendant({ className, color }: { className: string; color: string }) {
  return (
    <svg viewBox="0 0 60 120" className={className} aria-hidden="true">
      <rect x="28.5" y="0" width="3" height="68" fill={P.carbo.light} />
      <path d="M8 96 Q8 66 30 66 Q52 66 52 96 Z" fill={color} />
      <path d="M30 66 Q52 66 52 96 L36 96 Q38 74 30 66 Z" fill="rgba(43,36,64,0.16)" />
      <ellipse cx="30" cy="99" rx="9" ry="6" fill="#FFF3B0" />
    </svg>
  )
}

/** Little frames in a row (sala) or a string of stars (habitació): built into the wall, not movable. */
function WallDecor({ room }: { room: RoomId }) {
  if (room === 'sala') {
    const frames = [P.cel.base, P.mango.base, P.menta.base]
    return (
      <>
        <Pendant className="absolute left-[49%] top-0 h-24" color={P.coral.base} />
        <svg viewBox="0 0 180 50" className="absolute left-[60%] top-[34%] w-[min(20%,11rem)]" aria-hidden="true">
          {frames.map((f, i) => (
            <g key={f} transform={`translate(${i * 62} ${i === 1 ? 6 : 0})`}>
              <rect width="52" height="44" rx="6" fill={P.xocolata.base} />
              <rect x="5" y="5" width="42" height="34" rx="3" fill={P.neu.base} />
              <circle cx="26" cy="19" r="9" fill={f} />
              <path d="M10 39 Q26 24 42 39 Z" fill={f} opacity="0.7" />
            </g>
          ))}
        </svg>
      </>
    )
  }
  if (room === 'habitacio') {
    return (
      <svg viewBox="0 0 300 70" className="absolute left-[40%] top-[17%] w-[min(40%,22rem)]" aria-hidden="true">
        <path d="M0 6 Q150 40 300 6" stroke={P.carbo.light} strokeWidth="2" fill="none" />
        {[0, 1, 2, 3, 4].map((i) => {
          const x = 30 + i * 60
          const y = 6 + 28 * (1 - ((x - 150) / 150) ** 2) * 0.5 + 6
          return <path key={i} d={sparklePath(x, y + 14, 13)} fill={[P.mango.base, P.rosa.base, P.cel.light, P.mango.light, P.lila.light][i]} />
        })}
      </svg>
    )
  }
  return <Pendant className="absolute left-[50%] top-0 h-20" color={P.menta.base} />
}

/** Full-size, non-interactive shell of a room. */
export function RoomWalls({ room, night }: { room: RoomId; night: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <Wallpaper room={room} />
      <HomeWindow night={night} className={`absolute top-[14%] ${room === 'habitacio' ? 'left-[8%] w-[min(22%,13rem)]' : room === 'cuina' ? 'left-[36%] w-[min(15%,8.5rem)]' : 'left-[38%] w-[min(22%,13rem)]'}`} />
      <WallDecor room={room} />
      <Floor room={room} />
    </div>
  )
}
