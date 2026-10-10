import { useCast } from './CastContext'
import { useItems } from './ItemsContext'
import { stackOf, useStage } from './StageContext'
import './sandbox.css'

/** Little puffs where someone teleports (reduced motion) and soft ripples where the floor was tapped. */
export function Feedback() {
  const { poofs } = useCast()
  const { ripples } = useItems()
  const { h } = useStage()
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {ripples.map((r) => (
        <span
          key={`r${r.n}`}
          className="sb-poof absolute rounded-[50%] border-4 border-white/90"
          style={{ left: `${r.at.x * 100}%`, top: `${r.at.y * 100}%`, width: 48, height: 24, margin: '-12px 0 0 -24px', zIndex: 5 }}
        />
      ))}
      {poofs.map((p) => (
        <span key={`p${p.n}`} className="sb-poof absolute grid place-items-center" style={{ left: `${p.at.x * 100}%`, top: `${p.at.y * 100}%`, width: h * 0.17, height: h * 0.17, margin: `${-h * 0.17}px 0 0 ${-h * 0.085}px`, opacity: 0.8, zIndex: stackOf(p.at.y) + 2 }}>
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            {[
              [30, 55, 24],
              [55, 40, 28],
              [72, 60, 22],
              [48, 68, 20],
            ].map(([cx, cy, r]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#fff" opacity="0.92" />
            ))}
          </svg>
        </span>
      ))}
    </div>
  )
}
