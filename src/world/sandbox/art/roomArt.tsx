import type { ReactNode } from 'react'
import { INK, PALETTE as P } from '../../art/palette'
import { PropArt, PROPS_BY_ID } from '../../art/props'
import { useStage } from '../StageContext'

/** A drawing placed on the stage: feet at (x, y) in fractions, `h` tall as a fraction of the stage unit. */
export function Piece({ x, y, h, ratio, z, children }: { x: number; y: number; h: number; ratio: number; z?: number; children: ReactNode }) {
  const { unit } = useStage()
  const height = h * unit
  return (
    <svg
      viewBox={`0 0 ${ratio * 100} 100`}
      width={height * ratio}
      height={height}
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{ left: `${x * 100}%`, top: `${y * 100}%`, transform: 'translate(-50%, -100%)', zIndex: z ?? 0, overflow: 'visible' }}
    >
      {children}
    </svg>
  )
}

/** A library prop (tree, bush…) placed like any other piece. */
export function PropPiece({ id, x, y, h, z }: { id: string; x: number; y: number; h: number; z?: number }) {
  const def = PROPS_BY_ID[id]
  if (!def) return null
  return (
    <Piece x={x} y={y} h={h} ratio={def.w / def.h} {...(z !== undefined ? { z } : {})}>
      <g transform={`scale(${100 / def.h})`}>{def.render({})}</g>
    </Piece>
  )
}

/** Wall and floor of the living room, plus the pieces that never move. */
export function SalaBackdrop() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-x-0 top-0" style={{ height: '46%', background: `linear-gradient(${P.mango.light}, #fff1c9)` }} />
      <div className="absolute inset-x-0" style={{ top: '44%', height: '3%', background: P.mango.base }} />
      <div className="absolute inset-x-0 bottom-0" style={{ top: '47%', background: `repeating-linear-gradient(90deg, ${P.xocolata.light} 0 9%, #c98f63 9% 18%)` }} />
      <div className="absolute inset-x-0 bottom-0" style={{ top: '47%', background: 'linear-gradient(rgba(43,36,64,0.14), rgba(43,36,64,0) 22%)' }} />
      <Piece x={0.2} y={0.37} h={0.3} ratio={0.9}>
        <rect x="2" y="2" width="86" height="96" rx="14" fill={P.neu.base} />
        <rect x="9" y="9" width="72" height="82" rx="9" fill={P.cel.light} />
        <path d="M9 56 Q30 40 50 54 T81 50 V91 H9Z" fill={P.llima.light} />
        <circle cx="62" cy="28" r="9" fill={P.mango.base} />
        <rect x="43" y="9" width="4" height="82" fill={P.neu.base} />
        <rect x="9" y="48" width="72" height="4" fill={P.neu.base} />
      </Piece>
      <Piece x={0.52} y={0.3} h={0.17} ratio={1.2}>
        <rect x="0" y="0" width="120" height="100" rx="10" fill={P.xocolata.base} />
        <rect x="8" y="8" width="104" height="84" rx="6" fill={P.rosa.light} />
        <circle cx="40" cy="40" r="16" fill={P.coral.base} />
        <path d="M8 92 L50 58 L74 76 L90 62 L112 92Z" fill={P.menta.base} />
      </Piece>
      <Piece x={0.58} y={0.79} h={0.16} ratio={3}>
        <ellipse cx="150" cy="60" rx="140" ry="36" fill={P.lila.base} opacity="0.5" />
        <ellipse cx="150" cy="60" rx="108" ry="26" fill={P.lila.light} opacity="0.65" />
      </Piece>
      <Sofa />
      <Table />
    </div>
  )
}

function Sofa() {
  return (
    <Piece x={0.3} y={0.66} h={0.27} ratio={2.1}>
      <ellipse cx="105" cy="97" rx="102" ry="6" fill={INK.shadow} opacity="0.16" />
      <rect x="14" y="2" width="182" height="62" rx="26" fill={P.rosa.shade} />
      <rect x="22" y="8" width="166" height="52" rx="22" fill={P.rosa.base} />
      <rect x="22" y="48" width="166" height="38" rx="14" fill={P.rosa.shade} />
      <rect x="26" y="40" width="158" height="38" rx="16" fill={P.rosa.light} />
      <path d="M105 42 V78" stroke={P.rosa.base} strokeWidth="3" opacity="0.6" />
      <ellipse cx="55" cy="22" rx="14" ry="10" fill="#fff" opacity="0.25" />
    </Piece>
  )
}

function Table() {
  return (
    <Piece x={0.84} y={0.7} h={0.26} ratio={1.5}>
      <ellipse cx="75" cy="97" rx="66" ry="5" fill={INK.shadow} opacity="0.16" />
      <rect x="18" y="38" width="9" height="58" rx="4" fill={P.xocolata.shade} />
      <rect x="123" y="38" width="9" height="58" rx="4" fill={P.xocolata.shade} />
      <rect x="2" y="20" width="146" height="24" rx="12" fill={P.xocolata.shade} />
      <rect x="2" y="14" width="146" height="24" rx="12" fill={P.xocolata.light} />
      <rect x="14" y="19" width="50" height="5" rx="2.5" fill="#fff" opacity="0.4" />
    </Piece>
  )
}

/** The garden outside the back door. */
export function JardiBackdrop() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(var(--world-sky-top,#8fd3ff), var(--world-sky-bottom,#d7f0ff) 46%)' }} />
      <div className="absolute inset-x-0" style={{ top: '40%', bottom: 0, background: `linear-gradient(${P.llima.light}, ${P.llima.base})` }} />
      <div className="absolute inset-x-0" style={{ top: '40%', height: '2.4%', background: P.llima.shade, opacity: 0.35 }} />
      <div className="absolute left-[7%] top-[9%]">
        <PropArt id="nuvol-cel" size={72} title="" />
      </div>
      <div className="absolute right-[10%] top-[7%]">
        <PropArt id="sol" size={96} title="" />
      </div>
      <Piece x={0.5} y={0.46} h={0.12} ratio={9}>
        {Array.from({ length: 22 }, (_, i) => (
          <g key={i}>
            <rect x={i * 41 + 4} y="6" width="30" height="94" rx="12" fill={P.neu.base} />
            <rect x={i * 41 + 4} y="6" width="10" height="94" rx="6" fill="#fff" opacity="0.5" />
          </g>
        ))}
      </Piece>
      <PropPiece id="arbre" x={0.8} y={0.62} h={0.52} />
      <PropPiece id="mata" x={0.34} y={0.87} h={0.1} />
    </div>
  )
}
