import { memo, useEffect, useRef, useState, type ReactNode } from 'react'
import { Avatar, Neighbour, Pet } from '../characters'
import type { PetPose } from '../characters'
import { useCast } from './CastContext'
import { EmoteIcon } from './EmoteIcon'
import { HeldArt } from './ItemArt'
import { useItems } from './ItemsContext'
import { itemsHeldBy } from './logic/itemsState'
import { petLayer } from './logic/layers'
import { poseOf, type ActorState } from './logic/actorMachine'
import { depthScale, stackOf, useStage } from './StageContext'
import type { ActorSeed } from './types'
import './sandbox.css'

/** Height of a stature-1 person on a stage this tall. */
export const personHeight = (stageH: number): number => Math.max(104, Math.min(300, stageH * 0.37))

function petPose(st: ActorState): PetPose {
  if (st.mode === 'sitting' || st.emote === 'son') return 'sleep'
  if (st.mode === 'emoting') return 'happy'
  return 'idle'
}

function Body({ seed, st, size, holding }: { seed: ActorSeed; st: ActorState; size: number; holding: ReactNode }) {
  const look = { x: st.facing * 0.7, y: 0.1 }
  if (seed.kind === 'pet' && seed.pet) return <Pet id={seed.pet} pose={petPose(st)} size={size * 0.46} look={look} title="" />
  if (seed.kind === 'neighbour' && seed.neighbour) return <Neighbour id={seed.neighbour} pose={poseOf(st)} size={size} look={look} holding={holding} title="" />
  if (seed.avatar) return <Avatar spec={seed.avatar} pose={poseOf(st)} size={size} look={look} holding={holding} seed={seed.id} />
  return null
}

export const Actor = memo(function Actor({ id }: { id: string }) {
  const cast = useCast()
  const items = useItems()
  const stage = useStage()
  const seed = cast.seeds[id]
  const st = cast.state.actors[id]
  const mode = st?.mode
  const before = useRef(mode)
  const [settled, setSettled] = useState(0)
  useEffect(() => {
    if (before.current === 'walking' && mode !== 'walking') setSettled((n) => n + 1)
    before.current = mode
  }, [mode])
  if (!seed || !st) return null
  if ((st.room ?? items.defaultRoom) !== stage.room) return null

  const selected = cast.state.selected === id
  const partner = cast.state.social !== undefined && !selected
  const size = personHeight(stage.unit) * depthScale(st.at.y, stage.floorTop)
  const held = itemsHeldBy(items.items, id)[0]
  const heldDef = held ? items.defs[held.def] : undefined
  const holding = held && heldDef ? <HeldArt def={heldDef} item={held} /> : null
  const walking = st.mode === 'walking'
  const isPet = seed.kind === 'pet'
  const w = isPet ? size * 0.46 * (160 / 150) : size * 0.6875 * (seed.kind === 'neighbour' ? 1.1 : 1)
  const bodyH = isPet ? size * 0.46 : size
  const h = isPet ? bodyH : size * 1.1
  const headTop = h - bodyH

  return (
    <button
      type="button"
      data-actor={id}
      data-mode={st.mode}
      data-selected={selected}
      data-x={st.at.x.toFixed(3)}
      data-y={st.at.y.toFixed(3)}
      aria-label={`${seed.name}${selected ? ', la que mous' : ''}${st.carrying ? ', porta ' + (heldDef?.label ?? 'una cosa') : ''}${st.mode === 'sitting' ? ', asseguda' : ''}`}
      aria-pressed={selected}
      onClick={(event) => {
        event.stopPropagation()
        if (!selected) return items.tapActor(id)
        // Whoever you move never hides what is behind her: a tap on something under her body goes to it.
        const under = document.elementsFromPoint(event.clientX, event.clientY).find((el) => !event.currentTarget.contains(el) && el.closest('[data-uid]'))
        const target = under?.closest<HTMLElement>('[data-uid]')
        if (target && event.detail > 0) target.click()
        else items.setRingOpen(!items.ringOpen)
      }}
      className="sb-hit absolute m-0 cursor-pointer select-none border-0 bg-transparent p-0 outline-none focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--world-focus,#4da6ec)]"
      style={{ left: `${st.at.x * 100}%`, top: `${st.at.y * 100}%`, width: w, height: h, transform: 'translate(-50%, -100%)', zIndex: isPet ? petLayer(st.at, w / stage.w, h / stage.h, stage.hot ?? []) + (selected ? 1 : 0) : stackOf(st.at.y) + (selected ? 1 : 0), touchAction: 'manipulation' }}
    >
      {(selected || partner) && (
        <span
          aria-hidden="true"
          className={`sb-ring pointer-events-none absolute left-1/2 rounded-[50%] border-[5px] ${selected ? 'border-[var(--world-sol,#ffb834)]' : 'border-[var(--world-menta,#36c5a2)]'}`}
          style={{ width: w * 1.05, height: Math.max(18, w * 0.22), bottom: -h * 0.03, translate: '-50% 0', background: selected ? 'rgba(255,184,52,0.22)' : 'rgba(54,197,162,0.2)' }}
        />
      )}
      <span key={settled} className={`relative block h-full w-full ${settled > 0 && !walking ? 'sb-settle' : selected ? 'sb-select' : ''}`} style={{ transform: `scaleX(${st.facing})`, transformOrigin: '50% 100%' }}>
        <span className={`absolute inset-x-0 bottom-0 block ${walking ? (isPet ? 'sb-pet-walk' : 'sb-walk') : ''}`}>
          <Body seed={seed} st={st} size={size} holding={holding} />
        </span>
      </span>
      {selected && !st.emote && (
        <span aria-hidden="true" className="sb-bubble-bob pointer-events-none absolute left-1/2 -translate-x-1/2 text-[var(--world-sol,#ffb834)]" style={{ top: headTop - 30 }}>
          <svg width="26" height="20" viewBox="0 0 26 20">
            <path d="M3 3 L13 17 L23 3 Z" fill="currentColor" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      {st.emote && (
        <span
          aria-hidden="true"
          data-emote={st.emote}
          className="sb-emote pointer-events-none absolute left-1/2 grid place-items-center rounded-full bg-white shadow-[var(--world-shadow-soft)]"
          style={{ top: headTop - 66, width: 62, height: 62, marginLeft: -31 }}
        >
          <EmoteIcon kind={st.emote} size={48} />
        </span>
      )}
    </button>
  )
})
