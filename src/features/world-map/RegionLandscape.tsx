const INK = '#2a1b3d'
const EDGE = { stroke: '#fff', strokeWidth: 3.5, strokeLinejoin: 'round', strokeLinecap: 'round' } as const

/** Fleca-Castell de les Taules: a gingerbread castle with oven door, flag and a "×" banner. */
function CastleBakery() {
  return (
    <>
      <path d="M0 104 Q40 94 80 100 T160 98 V110 H0 Z" fill="#86efac" {...EDGE} />
      <g {...EDGE}>
        <path d="M24 100 V52 h12 v-8 h8 v8 h8 v-8 h8 v8 h8 V100 Z" fill="#e8b27d" />
        <path d="M96 100 V58 h10 v-8 h7 v8 h7 v-8 h7 v8 h10 V100 Z" fill="#e8b27d" />
        <path d="M52 100 V62 h44 V100 Z" fill="#f5c99b" />
        <path d="M30 52 L40 30 L50 52 Z" fill="#ff4fa3" />
        <path d="M102 58 L114 36 L126 58 Z" fill="#6ec1ff" />
      </g>
      <path d="M40 30 V14" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 14 L54 19 L40 24 Z" fill="#ffd23f" {...EDGE} strokeWidth="2" />
      <path d="M62 100 V84 a12 12 0 0 1 24 0 V100 Z" fill="#7c4a2d" {...EDGE} />
      <circle cx="74" cy="86" r="3" fill="#ffd23f" />
      <rect x="62" y="68" width="24" height="9" rx="3" fill="#fff" stroke={INK} strokeOpacity="0.4" strokeWidth="1.5" />
      <text x="74" y="76" textAnchor="middle" fontSize="9" fontWeight="700" fill={INK}>
        × × ×
      </text>
      <circle cx="40" cy="70" r="5" fill="#fff7cc" stroke={INK} strokeOpacity="0.4" strokeWidth="1.5" />
      <circle cx="113" cy="76" r="5" fill="#fff7cc" stroke={INK} strokeOpacity="0.4" strokeWidth="1.5" />
      <g fill="#fff" opacity="0.85">
        <circle cx="136" cy="40" r="6" />
        <circle cx="144" cy="30" r="8" />
        <circle cx="136" cy="18" r="6" />
      </g>
      <rect x="132" y="52" width="10" height="14" rx="2" fill="#c98d55" {...EDGE} strokeWidth="2.5" />
    </>
  )
}

/** Muntanya dels Milers: snowy peaks with milestone stones climbing up to a flag. */
function MountainMilestones() {
  return (
    <>
      <g {...EDGE}>
        <path d="M0 104 L44 40 L74 78 L98 28 L150 104 Z" fill="#93c5fd" />
        <path d="M98 28 L84 52 L94 48 L100 58 L108 48 L118 54 Z" fill="#fff" />
        <path d="M44 40 L34 56 L42 52 L48 60 L56 52 L58 58 Z" fill="#fff" />
        <path d="M0 104 Q40 96 80 102 T160 100 V110 H0 Z" fill="#86efac" />
      </g>
      <path d="M98 28 V10" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M98 10 L114 15 L98 20 Z" fill="#ff4fa3" {...EDGE} strokeWidth="2" />
      {[
        { x: 30, y: 98, t: '1000' },
        { x: 70, y: 92, t: '2000' },
        { x: 112, y: 88, t: '3000' },
      ].map((m) => (
        <g key={m.t}>
          <rect x={m.x - 13} y={m.y - 14} width="26" height="16" rx="5" fill="#ffd23f" {...EDGE} strokeWidth="2.5" />
          <text x={m.x} y={m.y - 3} textAnchor="middle" fontSize="8" fontWeight="700" fill={INK}>
            {m.t}
          </text>
        </g>
      ))}
    </>
  )
}

function Forest() {
  const tree = (x: number, h: number, c: string) => (
    <g key={x} {...EDGE}>
      <rect x={x - 3} y={104 - 14} width="6" height="14" rx="2" fill="#7c4a2d" />
      <path d={`M${x - 16} ${104 - 12} L${x} ${104 - 12 - h} L${x + 16} ${104 - 12} Z`} fill={c} />
      <path d={`M${x - 12} ${104 - 12 - h * 0.45} L${x} ${104 - 12 - h * 1.1} L${x + 12} ${104 - 12 - h * 0.45} Z`} fill={c} />
    </g>
  )
  return (
    <>
      <path d="M0 104 Q40 94 80 100 T160 98 V110 H0 Z" fill="#86efac" {...EDGE} />
      {tree(34, 44, '#22c55e')}
      {tree(80, 58, '#16a34a')}
      {tree(124, 40, '#4ade80')}
      <circle cx="140" cy="22" r="11" fill="#ffd23f" {...EDGE} />
    </>
  )
}

function Beach() {
  return (
    <>
      <path d="M0 96 Q40 88 80 94 T160 92 V110 H0 Z" fill="#fde68a" {...EDGE} />
      <path d="M0 78 Q20 70 40 78 T80 78 T120 78 T160 78 V92 H0 Z" fill="#6ec1ff" {...EDGE} />
      <path d="M100 96 Q108 70 104 46" fill="none" stroke="#7c4a2d" strokeWidth="6" strokeLinecap="round" />
      <g {...EDGE} strokeWidth="2.5" fill="#22c55e">
        <path d="M104 46 Q84 38 74 52 Q92 44 104 50 Z" />
        <path d="M104 46 Q124 36 136 50 Q118 44 104 50 Z" />
        <path d="M104 46 Q96 28 82 26 Q96 34 104 46 Z" />
      </g>
      <circle cx="30" cy="28" r="12" fill="#ffd23f" {...EDGE} />
    </>
  )
}

/** Ciutat dels Decimals: towers with a decimal point on the clock and a "%" shop sign. */
function DecimalCity() {
  return (
    <>
      <path d="M0 104 Q40 96 80 102 T160 100 V110 H0 Z" fill="#86efac" {...EDGE} />
      <g {...EDGE}>
        <rect x="14" y="54" width="30" height="48" rx="3" fill="#c4b5fd" />
        <rect x="50" y="30" width="34" height="72" rx="3" fill="#a78bfa" />
        <rect x="90" y="48" width="28" height="54" rx="3" fill="#ddd6fe" />
        <rect x="122" y="64" width="26" height="38" rx="3" fill="#f5c99b" />
      </g>
      <circle cx="67" cy="46" r="11" fill="#fff" stroke={INK} strokeOpacity="0.5" strokeWidth="2" />
      <text x="67" y="51" textAnchor="middle" fontSize="14" fontWeight="700" fill={INK}>
        ,
      </text>
      <rect x="95" y="58" width="18" height="12" rx="3" fill="#ffd23f" stroke={INK} strokeOpacity="0.4" strokeWidth="1.5" />
      <text x="104" y="67" textAnchor="middle" fontSize="9" fontWeight="700" fill={INK}>
        %
      </text>
      {[22, 32, 58, 72, 98, 108, 128, 138].map((x, i) => (
        <rect key={x} x={x} y={70 + (i % 2) * 14} width="6" height="8" rx="1.5" fill="#fff7cc" />
      ))}
      <circle cx="140" cy="22" r="11" fill="#ffd23f" {...EDGE} />
    </>
  )
}

const SCENES: Record<string, () => React.JSX.Element> = {
  bosc: Forest,
  platja: Beach,
  castell: CastleBakery,
  muntanya: MountainMilestones,
  ciutat: DecimalCity,
}

/** Decorative hand-drawn landscape for a region (sticker style: flat colours, white die-cut edge). */
export function RegionLandscape({ regionId, className = '' }: { regionId: string; className?: string }) {
  const Scene = SCENES[regionId]
  if (!Scene) return null
  return (
    <svg aria-hidden="true" viewBox="0 0 160 110" className={className} focusable="false">
      <Scene />
    </svg>
  )
}
