import { PALETTE as P } from '../../../../art/palette'
import { HomeWindow } from './HomeWindow'
import { FLOOR_TOP, COLUMN, type FloorId, type ZoneId } from '../zones'

interface Look {
  wall: string
  stripe: string
  dot: string
  floor: string
  line: string
  skirting: string
  kind: 'stripes' | 'tiles' | 'stars' | 'dots'
}

const LOOKS: Readonly<Record<Exclude<ZoneId, 'terrassa'>, Look>> = {
  sala: { wall: '#FFE2CF', stripe: '#FFD6BD', dot: P.coral.light, floor: '#C98D5E', line: '#B57849', skirting: P.xocolata.base, kind: 'stripes' },
  cuina: { wall: '#DDF5EC', stripe: '#CFEFE3', dot: P.menta.light, floor: '#F3E3C3', line: '#E0CB9F', skirting: P.menta.shade, kind: 'tiles' },
  habitacio: { wall: '#E4DDFB', stripe: '#D9D0F7', dot: P.cel.light, floor: '#D9A274', line: '#C08656', skirting: P.lila.shade, kind: 'stars' },
  bany: { wall: '#D8EEFB', stripe: '#C7E4F6', dot: '#fff', floor: '#EAF3F7', line: '#C9DDE6', skirting: P.cel.shade, kind: 'tiles' },
  estudi: { wall: '#FFF1C8', stripe: '#FFE7A6', dot: P.mango.light, floor: '#B9824F', line: '#A26F40', skirting: P.xocolata.shade, kind: 'dots' },
}

function Pattern({ id, look }: { id: string; look: Look }) {
  return (
    <pattern id={id} width="56" height="56" patternUnits="userSpaceOnUse">
      <rect width="56" height="56" fill={look.wall} />
      {look.kind === 'tiles' ? (
        <>
          <rect x="1" y="1" width="26" height="26" rx="5" fill={look.stripe} />
          <rect x="29" y="29" width="26" height="26" rx="5" fill={look.stripe} />
        </>
      ) : (
        <rect width="18" height="56" fill={look.stripe} />
      )}
      {look.kind === 'stars' ? <path d="M38 14 l2.4 5 5.4 .6 -4 3.6 1.2 5.4 -5 -2.8 -5 2.8 1.2 -5.4 -4 -3.6 5.4 -.6 Z" fill={look.dot} /> : <circle cx="38" cy="16" r="4" fill={look.dot} />}
      {look.kind !== 'tiles' && <circle cx="38" cy="44" r="2.4" fill={look.dot} opacity="0.7" />}
    </pattern>
  )
}

function FloorPattern({ id, look, tiles }: { id: string; look: Look; tiles: boolean }) {
  return (
    <pattern id={id} width={tiles ? 64 : 220} height={tiles ? 64 : 48} patternUnits="userSpaceOnUse">
      {tiles ? (
        <>
          <rect width="64" height="64" fill={look.floor} />
          <rect width="32" height="32" fill={look.line} />
          <rect x="32" y="32" width="32" height="32" fill={look.line} />
        </>
      ) : (
        <>
          <rect width="220" height="48" fill={look.floor} />
          <rect y="22" width="220" height="2" fill={look.line} />
          <rect y="46" width="220" height="2" fill={look.line} />
          <rect x="150" width="2" height="22" fill={look.line} />
          <rect x="50" y="24" width="2" height="22" fill={look.line} />
        </>
      )}
    </pattern>
  )
}

/** Sunny garden sky for the terrace (clouds, hills, a railing). */
function Terrace({ night, x, w }: { night: boolean; x: string; w: string }) {
  const top = `${FLOOR_TOP * 100}%`
  return (
    <svg x={x} width={w} height="100%" overflow="hidden">
      <rect width="100%" height={top} fill={night ? '#3B3470' : '#A9DCFF'} />
      {night ? (
        <>
          <circle cx="78%" cy="18%" r="22" fill={P.mango.light} />
          <circle cx="82%" cy="15%" r="19" fill="#3B3470" />
          {[12, 32, 55, 90].map((p, i) => (
            <circle key={p} cx={`${p}%`} cy={`${10 + (i % 3) * 9}%`} r="2.6" fill="#FFF3B0" />
          ))}
        </>
      ) : (
        <>
          <circle cx="76%" cy="20%" r="24" fill={P.mango.light} />
          {[
            [18, 16],
            [48, 30],
          ].map(([cx, cy]) => (
            <g key={cx} transform={`translate(0 0)`}>
              <ellipse cx={`${cx}%`} cy={`${cy}%`} rx="38" ry="12" fill="#fff" opacity="0.9" />
              <ellipse cx={`${(cx ?? 0) + 4}%`} cy={`${(cy ?? 0) - 4}%`} rx="22" ry="12" fill="#fff" opacity="0.9" />
            </g>
          ))}
        </>
      )}
      <ellipse cx="30%" cy={top} rx="46%" ry="22%" fill={night ? '#2E5C55' : P.llima.light} />
      <ellipse cx="86%" cy={top} rx="34%" ry="16%" fill={night ? '#26514A' : P.llima.base} />
      <rect y={`${FLOOR_TOP * 100 - 12}%`} width="100%" height="4%" rx="3" fill={P.neu.base} />
      {Array.from({ length: 16 }, (_, i) => (
        <rect key={i} x={`${3 + i * 6.3}%`} y={`${FLOOR_TOP * 100 - 10}%`} width="7" height="10%" rx="3" fill={P.neu.base} />
      ))}
    </svg>
  )
}

/** The inside of one floor of the cutaway: two rooms side by side, stair columns at both ends, planks below. */
export function FloorShell({ floor, left, right, night }: { floor: FloorId; left: ZoneId; right: ZoneId; night: boolean }) {
  const top = `${FLOOR_TOP * 100}%`
  const lookL = LOOKS[left as keyof typeof LOOKS]
  const lookR = right === 'terrassa' ? undefined : LOOKS[right as keyof typeof LOOKS]
  const idL = `casa-w-${floor}-l`
  const idR = `casa-w-${floor}-r`
  const fl = `casa-f-${floor}-l`
  const fr = `casa-f-${floor}-r`
  const pct = (v: number): string => `${v * 100}%`
  return (
    <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        {lookL && <Pattern id={idL} look={lookL} />}
        {lookR && <Pattern id={idR} look={lookR} />}
        {lookL && <FloorPattern id={fl} look={lookL} tiles={LOOKS.cuina === lookL || LOOKS.bany === lookL} />}
        {lookR && <FloorPattern id={fr} look={lookR} tiles={LOOKS.cuina === lookR || LOOKS.bany === lookR} />}
      </defs>
      <rect width="100%" height="100%" fill={night ? '#2a2548' : '#F3E4CF'} />
      {lookL && <rect x={pct(COLUMN)} width={pct(0.4)} height={top} fill={`url(#${idL})`} />}
      {lookL && <rect x={pct(COLUMN)} y={top} width={pct(0.4)} height={pct(1 - FLOOR_TOP)} fill={`url(#${fl})`} />}
      {lookR ? (
        <>
          <rect x="50%" width={pct(0.4)} height={top} fill={`url(#${idR})`} />
          <rect x="50%" y={top} width={pct(0.4)} height={pct(1 - FLOOR_TOP)} fill={`url(#${fr})`} />
        </>
      ) : (
        <>
          <Terrace night={night} x="50%" w={pct(0.4)} />
          <rect x="50%" y={top} width={pct(0.4)} height={pct(1 - FLOOR_TOP)} fill={P.xocolata.light} />
          {Array.from({ length: 6 }, (_, i) => (
            <rect key={i} x="50%" y={`${FLOOR_TOP * 100 + 8 * i + 4}%`} width={pct(0.4)} height="1.5%" fill={P.xocolata.base} opacity="0.45" />
          ))}
        </>
      )}
      {/* stair columns: a calm hall wall and a darker floor */}
      {[0, 0.9].map((x) => (
        <g key={x}>
          <rect x={pct(x)} width={pct(0.1)} height={top} fill={night ? '#3a3360' : '#F6E6CF'} />
          <rect x={pct(x)} y={top} width={pct(0.1)} height={pct(1 - FLOOR_TOP)} fill={night ? '#5b4a3c' : '#B88458'} />
          <rect x={pct(x)} y={`${FLOOR_TOP * 100 - 1.4}%`} width={pct(0.1)} height="1.6%" fill={P.xocolata.base} />
        </g>
      ))}
      {/* partition between the rooms: a slim wall with an open doorway */}
      <rect x="49.4%" width="1.2%" height={`${FLOOR_TOP * 100 - 1.4}%`} fill={P.neu.shade} />
      <rect x="49.4%" y={`${FLOOR_TOP * 100 - 1.4}%`} width="1.2%" height="2%" fill={P.xocolata.base} />
      {lookL && <rect x={pct(COLUMN)} y={`${FLOOR_TOP * 100 - 1.4}%`} width={pct(0.4)} height="1.6%" fill={lookL.skirting} />}
      {lookR && <rect x="50%" y={`${FLOOR_TOP * 100 - 1.4}%`} width={pct(0.4)} height="1.6%" fill={lookR.skirting} />}
      {/* the side walls of the house and the slab under the floor */}
      <rect width="1.2%" height="100%" fill={P.xocolata.base} />
      <rect x="98.8%" width="1.2%" height="100%" fill={P.xocolata.base} />
    </svg>
  )
}

/** Windows on the back walls (not on the terrace, which is open). */
export function FloorWindows({ right, night }: { right: ZoneId; night: boolean }) {
  const size = 'absolute w-[min(11%,9rem)]'
  return (
    <>
      <HomeWindow night={night} className={`${size} left-[17%] top-[8%]`} />
      {right !== 'terrassa' && <HomeWindow night={night} className={`${size} left-[66%] top-[8%]`} />}
    </>
  )
}
