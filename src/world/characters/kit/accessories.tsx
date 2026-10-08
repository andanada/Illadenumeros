import { INK, PALETTE } from '../../art/palette'
import { sparklePath } from '../../art/paths'
import { byId, EYE_L, EYE_R, EYES_Y, type AccessoryDef } from './geometry'

/** Accessories: hats sit on top of any hair, glasses over the eyes, clips on the side of the head. */

const gorra: AccessoryDef = {
  id: 'gorra',
  name: 'Gorra',
  front: ({ c }) => (
    <g>
      <path d="M40 66 C40 26 70 14 100 14 C130 14 160 26 160 66 Z" fill={c.base} />
      <path d="M118 18 C146 24 160 42 160 66 L140 66 C142 44 134 28 118 18 Z" fill={c.shade} opacity={0.6} />
      <path d="M36 62 Q100 54 186 66 Q190 76 176 78 Q100 70 36 74 Z" fill={c.shade} />
      <circle cx={100} cy={15} r={5} fill={c.light} />
    </g>
  ),
}

const barretSol: AccessoryDef = {
  id: 'barret-sol',
  name: 'Barret de sol',
  front: ({ c }) => (
    <g>
      <ellipse cx={100} cy={58} rx={88} ry={18} fill={c.base} />
      <path d="M52 58 C52 18 76 8 100 8 C124 8 148 18 148 58 Z" fill={c.base} />
      <path d="M52 50 Q100 60 148 50 L148 60 Q100 70 52 60 Z" fill={PALETTE.coral.base} />
      <ellipse cx={100} cy={64} rx={88} ry={8} fill={c.shade} opacity={0.5} />
      <circle cx={136} cy={50} r={8} fill={PALETTE.neu.base} />
      <circle cx={136} cy={50} r={3.5} fill={PALETTE.mango.base} />
    </g>
  ),
}

const gorroLlana: AccessoryDef = {
  id: 'gorro-llana',
  name: 'Gorro de llana',
  front: ({ c }) => (
    <g>
      <circle cx={100} cy={4} r={14} fill={c.light} />
      <path d="M38 70 C34 24 68 10 100 10 C132 10 166 24 162 70 Z" fill={c.base} />
      <rect x={34} y={56} width={132} height={20} rx={10} fill={c.shade} />
      {[52, 72, 92, 112, 132, 148].map((x) => (
        <path key={x} d={`M${x} 60 l0 12`} stroke={c.base} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      ))}
    </g>
  ),
}

const corona: AccessoryDef = {
  id: 'corona',
  name: 'Corona',
  front: ({ c }) => (
    <g transform="translate(100 34) scale(1.15) translate(-100 -40)">
      <path d="M62 50 L58 16 L78 32 L100 8 L122 32 L142 16 L138 50 Z" fill={c.base} />
      <path d="M62 50 L138 50 L138 42 L62 42 Z" fill={c.shade} />
      <circle cx={100} cy={30} r={5} fill={PALETTE.coral.base} />
      <path d={sparklePath(124, 20, 5)} fill={INK.white} />
    </g>
  ),
}

const llac: AccessoryDef = {
  id: 'llac',
  name: 'Llaç',
  front: ({ c }) => (
    <g transform="translate(142 38) rotate(16) scale(1.3)">
      <path d="M0 0 C-10 -18 -34 -16 -30 2 C-28 16 -10 12 0 0 Z" fill={c.base} />
      <path d="M0 0 C10 -18 34 -16 30 2 C28 16 10 12 0 0 Z" fill={c.base} />
      <path d="M0 0 C6 -8 22 -10 26 0 C20 -2 10 -2 0 0 Z" fill={c.shade} opacity={0.6} />
      <ellipse cx={0} cy={0} rx={7} ry={8} fill={c.shade} />
    </g>
  ),
}

const diademaGat: AccessoryDef = {
  id: 'diadema-gat',
  name: 'Diadema de gat',
  back: ({ c }) => (
    <g>
      <path d="M46 52 L50 8 L84 34 Z" fill={c.base} />
      <path d="M154 52 L150 8 L116 34 Z" fill={c.base} />
      <path d="M54 40 L56 20 L72 34 Z" fill={PALETTE.rosa.light} />
      <path d="M146 40 L144 20 L128 34 Z" fill={PALETTE.rosa.light} />
    </g>
  ),
  front: ({ c }) => <path d="M42 66 Q50 30 100 26 Q150 30 158 66" stroke={c.shade} strokeWidth={7} strokeLinecap="round" fill="none" />,
}

const auriculars: AccessoryDef = {
  id: 'auriculars',
  name: 'Auriculars',
  front: ({ c }) => (
    <g>
      <path d="M36 92 C30 34 70 18 100 18 C130 18 170 34 164 92" stroke={c.shade} strokeWidth={9} strokeLinecap="round" fill="none" />
      <rect x={24} y={84} width={24} height={38} rx={12} fill={c.base} />
      <rect x={152} y={84} width={24} height={38} rx={12} fill={c.base} />
      <rect x={30} y={92} width={6} height={22} rx={3} fill={c.light} />
      <rect x={164} y={92} width={6} height={22} rx={3} fill={c.light} />
    </g>
  ),
}

const lens = (fill: string, opacity: number) =>
  [EYE_L, EYE_R].map((x) => <circle key={x} cx={x} cy={EYES_Y} r={15} fill={fill} opacity={opacity} />)

const ulleres: AccessoryDef = {
  id: 'ulleres',
  name: 'Ulleres',
  front: ({ c }) => (
    <g>
      {lens(INK.white, 0.25)}
      <g stroke={c.base} strokeWidth={4.5} fill="none">
        <circle cx={EYE_L} cy={EYES_Y} r={15} />
        <circle cx={EYE_R} cy={EYES_Y} r={15} />
        <path d={`M${EYE_L + 15} ${EYES_Y - 2} Q100 ${EYES_Y - 8} ${EYE_R - 15} ${EYES_Y - 2}`} />
        <path d={`M${EYE_L - 15} ${EYES_Y - 3} L42 ${EYES_Y - 6} M${EYE_R + 15} ${EYES_Y - 3} L158 ${EYES_Y - 6}`} />
      </g>
    </g>
  ),
}

const ulleresSol: AccessoryDef = {
  id: 'ulleres-sol',
  name: 'Ulleres de sol',
  front: ({ c }) => (
    <g>
      <path d={`M${EYE_L - 18} ${EYES_Y - 10} L${EYE_L + 16} ${EYES_Y - 10} Q${EYE_L + 16} ${EYES_Y + 14} ${EYE_L} ${EYES_Y + 14} Q${EYE_L - 18} ${EYES_Y + 14} ${EYE_L - 18} ${EYES_Y - 10} Z`} fill={c.base} />
      <path d={`M${EYE_R - 16} ${EYES_Y - 10} L${EYE_R + 18} ${EYES_Y - 10} Q${EYE_R + 18} ${EYES_Y + 14} ${EYE_R} ${EYES_Y + 14} Q${EYE_R - 16} ${EYES_Y + 14} ${EYE_R - 16} ${EYES_Y - 10} Z`} fill={c.base} />
      <path d={`M${EYE_L + 16} ${EYES_Y - 8} L${EYE_R - 16} ${EYES_Y - 8} M${EYE_L - 18} ${EYES_Y - 9} L40 ${EYES_Y - 12} M${EYE_R + 18} ${EYES_Y - 9} L160 ${EYES_Y - 12}`} stroke={c.shade} strokeWidth={4} strokeLinecap="round" />
      <path d={`M${EYE_L - 10} ${EYES_Y - 4} l8 -2 M${EYE_R - 8} ${EYES_Y - 4} l8 -2`} stroke={c.light} strokeWidth={3} strokeLinecap="round" />
    </g>
  ),
}

const flor: AccessoryDef = {
  id: 'flor',
  name: 'Flor',
  front: ({ c }) => (
    <g transform="translate(52 50)">
      {[0, 72, 144, 216, 288].map((deg) => (
        <ellipse key={deg} cx={0} cy={-10} rx={8} ry={11} fill={c.base} transform={`rotate(${deg})`} />
      ))}
      <circle r={7} fill={PALETTE.mango.base} />
      <circle cx={-2} cy={-2} r={2.4} fill={PALETTE.mango.light} />
    </g>
  ),
}

export const ACCESSORIES: readonly AccessoryDef[] = [gorra, barretSol, gorroLlana, corona, llac, diademaGat, auriculars, ulleres, ulleresSol, flor]
export const ACCESSORIES_BY_ID = byId(ACCESSORIES)
