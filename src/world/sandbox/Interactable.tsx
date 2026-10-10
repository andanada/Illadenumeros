import { useRef } from 'react'
import { ItemArt } from './ItemArt'
import { useItems } from './ItemsContext'
import { currentStage } from './logic/useChain'
import type { ItemState } from './logic/itemsState'
import type { Pt } from './logic/actorMachine'
import { depthScale, stackOf, useStage } from './StageContext'
import './sandbox.css'

interface Sample {
  x: number
  y: number
  t: number
}

const FLICK_MIN_PX = 36
const FLICK_MIN_SPEED = 0.9

export interface InteractableProps {
  item: ItemState
  /** Where it is drawn (a floor spot, or a point in flight). */
  at: Pt
  /** Extra lift in scene fractions while flying. */
  flying?: boolean
}

/**
 * An object of the sandbox, drawn from its declarative definition. A tap does what the definition says
 * (pick up, open, use…); a quick flick tosses it when the definition allows. It squishes at every touch.
 */
export function Interactable({ item, at, flying = false }: InteractableProps) {
  const api = useItems()
  const stage = useStage()
  const def = api.defs[item.def]
  const trail = useRef<Sample[]>([])
  const flicked = useRef(false)
  if (!def) return null
  const size = def.height * stage.unit * depthScale(at.y, stage.floorTop)
  const stageName = def.use ? (currentStage(def.use, item.chain).label ?? currentStage(def.use, item.chain).id) : ''
  const state = [stageName, item.open ? 'obert' : '', item.surprise.revealed ? `amb ${item.surprise.revealed}` : ''].filter((x) => x !== '').join(', ')
  const aspect = def.aspect ?? 1
  const charged = def.surpriseTaps && item.surprise.taps > 0 && item.surprise.revealed === undefined

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>): void => {
    flicked.current = false
    trail.current = [{ x: e.clientX, y: e.clientY, t: e.timeStamp }]
  }
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>): void => {
    if (e.buttons === 0 && e.pointerType === 'mouse') return
    trail.current = [...trail.current, { x: e.clientX, y: e.clientY, t: e.timeStamp }].filter((s) => e.timeStamp - s.t < 120)
  }
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>): void => {
    const first = trail.current[0]
    const last = { x: e.clientX, y: e.clientY, t: e.timeStamp }
    trail.current = []
    if (!first || !def.toss || item.loc.t !== 'floor') return
    const dt = (last.t - first.t) / 1000
    const dx = last.x - first.x
    const dy = last.y - first.y
    if (dt <= 0 || Math.hypot(dx, dy) < FLICK_MIN_PX) return
    const vx = dx / stage.w / dt
    const vy = dy / stage.h / dt
    if (Math.hypot(vx, vy) < FLICK_MIN_SPEED) return
    flicked.current = true
    api.flick(item.uid, vx * 0.6, vy * 0.6)
  }

  return (
    <button
      type="button"
      data-uid={item.uid}
      data-def={item.def}
      data-stage={stageName}
      data-open={item.open}
      aria-label={`${def.label}${state ? `, ${state}` : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={(e) => {
        e.stopPropagation()
        if (flicked.current) {
          flicked.current = false
          return
        }
        api.tapItem(item.uid)
      }}
      className="absolute m-0 cursor-pointer select-none border-0 bg-transparent p-0 outline-none focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--world-focus,#4da6ec)]"
      style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%`, width: Math.max(44, size * aspect), height: Math.max(44, size), transform: 'translate(-50%, -100%)', zIndex: stackOf(at.y) + (flying ? 400 : 80), touchAction: def.toss ? 'none' : 'manipulation' }}
    >
      <span key={item.pokes} className={`block h-full w-full ${item.pokes > 0 ? 'sb-squish' : ''}`} style={{ transformOrigin: '50% 100%' }}>
        <span className={`flex h-full w-full items-end justify-center ${charged ? 'sb-wobble' : ''}`} style={{ transformOrigin: '50% 100%' }}>
          <ItemArt def={def} item={item} size={size} />
        </span>
      </span>
    </button>
  )
}
