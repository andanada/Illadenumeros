import type { ReactNode } from 'react'
import { INK } from '../../art/palette'
import { sparklePath } from '../../art/paths'
import { byId, EYE_L, EYE_R, EYES_Y, MOUTH_Y, type FaceCtx, type FaceDef } from './geometry'

const SIDES = [EYE_L, EYE_R] as const
const LOOK_X = 5
const LOOK_Y = 3.5

const closed = (x: number) => (
  <path key={x} d={`M${x - 7} ${EYES_Y + 1} Q${x} ${EYES_Y + 5} ${x + 7} ${EYES_Y + 1}`} stroke={INK.face} strokeWidth={3.6} strokeLinecap="round" fill="none" />
)

/** Pupil-type eyes share blink + look handling; `draw` receives the shifted centre. */
function pupils(draw: (x: number, y: number, side: -1 | 1) => ReactNode) {
  return ({ look, blink }: FaceCtx) => (
    <g>
      {SIDES.map((x, i) =>
        blink ? closed(x) : <g key={x}>{draw(x + look.x * LOOK_X, EYES_Y + look.y * LOOK_Y, i === 0 ? -1 : 1)}</g>,
      )}
    </g>
  )
}

export const EYES: readonly FaceDef[] = [
  {
    id: 'ulls-punt',
    name: 'Punts',
    render: pupils((x, y) => (
      <>
        <ellipse cx={x} cy={y} rx={6.2} ry={7} fill={INK.face} />
        <circle cx={x + 2} cy={y - 2.6} r={1.9} fill={INK.white} />
      </>
    )),
  },
  {
    id: 'ulls-brillants',
    name: 'Brillants',
    render: pupils((x, y) => (
      <>
        <ellipse cx={x} cy={y} rx={8} ry={9.5} fill={INK.face} />
        <circle cx={x + 2.6} cy={y - 3.4} r={3} fill={INK.white} />
        <circle cx={x - 2.8} cy={y + 3.6} r={1.4} fill={INK.white} opacity={0.85} />
      </>
    )),
  },
  {
    id: 'ulls-pestanyes',
    name: 'Pestanyes',
    render: pupils((x, y, side) => (
      <>
        <ellipse cx={x} cy={y} rx={6.4} ry={7.4} fill={INK.face} />
        <circle cx={x + 2} cy={y - 2.6} r={1.9} fill={INK.white} />
        <path
          d={`M${x + side * 5} ${y - 5} l${side * 5} -4 M${x + side * 6.5} ${y - 1.5} l${side * 6} -1.5`}
          stroke={INK.face}
          strokeWidth={2.6}
          strokeLinecap="round"
        />
      </>
    )),
  },
  {
    id: 'ulls-alegres',
    name: 'Alegres',
    render: () => (
      <g>
        {SIDES.map((x) => (
          <path key={x} d={`M${x - 7} ${EYES_Y + 3} Q${x} ${EYES_Y - 7} ${x + 7} ${EYES_Y + 3}`} stroke={INK.face} strokeWidth={3.8} strokeLinecap="round" fill="none" />
        ))}
      </g>
    ),
  },
  {
    id: 'ulls-mandrosos',
    name: 'Mandrosos',
    render: pupils((x, y) => (
      <>
        <path d={`M${x - 7} ${y - 1} A7 7 0 0 0 ${x + 7} ${y - 1} Z`} fill={INK.face} />
        <circle cx={x + 2} cy={y + 2} r={1.6} fill={INK.white} />
      </>
    )),
  },
  {
    id: 'ulls-estel',
    name: 'Estels',
    render: pupils((x, y) => <path d={sparklePath(x, y, 8.5, 0.32)} fill={INK.face} />),
  },
  {
    id: 'ulls-ovals',
    name: 'Ovals',
    render: pupils((x, y) => (
      <>
        <ellipse cx={x} cy={y} rx={4.6} ry={8.6} fill={INK.face} />
        <ellipse cx={x + 1.4} cy={y - 3.6} rx={1.5} ry={2.2} fill={INK.white} />
      </>
    )),
  },
]

const stroke = { stroke: INK.face, strokeWidth: 3.6, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const
const M = MOUTH_Y

export const MOUTHS: readonly FaceDef[] = [
  { id: 'boca-somriure', name: 'Somriure', render: () => <path d={`M90 ${M} Q100 ${M + 10} 110 ${M}`} {...stroke} /> },
  {
    id: 'boca-rialla',
    name: 'Rialla',
    render: () => (
      <g>
        <path d={`M88 ${M - 2} Q100 ${M - 3} 112 ${M - 2} Q111 ${M + 14} 100 ${M + 14} Q89 ${M + 14} 88 ${M - 2} Z`} fill={INK.mouthInside} />
        <path d={`M93 ${M + 10} Q100 ${M + 5} 107 ${M + 10} Q104 ${M + 14} 100 ${M + 14} Q96 ${M + 14} 93 ${M + 10} Z`} fill={INK.tongue} />
      </g>
    ),
  },
  { id: 'boca-oh', name: 'Oh!', render: () => <ellipse cx={100} cy={M + 4} rx={5.5} ry={7} fill={INK.mouthInside} /> },
  {
    id: 'boca-llengua',
    name: 'Llengua',
    render: () => (
      <g>
        <path d={`M98 ${M + 4} q0 9 6 9 q6 0 6 -9 Z`} fill={INK.tongue} />
        <path d={`M89 ${M + 1} Q100 ${M + 9} 112 ${M}`} {...stroke} />
      </g>
    ),
  },
  {
    id: 'boca-dents',
    name: 'Dents',
    render: () => (
      <g>
        <path d={`M86 ${M - 1} Q100 ${M - 2} 114 ${M - 1} Q112 ${M + 12} 100 ${M + 12} Q88 ${M + 12} 86 ${M - 1} Z`} fill={INK.mouthInside} />
        <path d={`M88 ${M} Q100 ${M - 1} 112 ${M} L111 ${M + 4} Q100 ${M + 5} 89 ${M + 4} Z`} fill={INK.teeth} />
      </g>
    ),
  },
  { id: 'boca-gat', name: 'Gatet', render: () => <path d={`M89 ${M + 1} Q94.5 ${M + 8} 100 ${M + 1} Q105.5 ${M + 8} 111 ${M + 1}`} {...stroke} /> },
  { id: 'boca-timida', name: 'Tímida', render: () => <path d={`M95 ${M + 3} Q100 ${M + 6} 105 ${M + 3}`} {...stroke} /> },
]

export const EYES_BY_ID = byId(EYES)
export const MOUTHS_BY_ID = byId(MOUTHS)
export const EYE_IDS = EYES.map((e) => e.id)
export const MOUTH_IDS = MOUTHS.map((m) => m.id)

