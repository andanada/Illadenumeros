import { useEffect, useRef, useState } from 'react'
import { personHeight } from './Actor'
import { useCast } from './CastContext'
import { EmoteIcon } from './EmoteIcon'
import { EMOTE_NAME } from './fx'
import { useItems } from './ItemsContext'
import { itemsHeldBy } from './logic/itemsState'
import type { EmoteKind } from './logic/actorMachine'
import { SOCIAL_KINDS, type SocialKind } from './logic/social'
import { RingIcon, type RingGlyph } from './RingIcon'
import { depthScale, stackOf, useStage } from './StageContext'
import './sandbox.css'

interface Entry {
  key: string
  label: string
  icon: React.ReactNode
  run: () => void
}

const RADIUS = 104
const BUTTON = 54

/** Angles (degrees, screen coordinates) spread over an arc above the character. */
export function arcAngles(n: number): number[] {
  if (n <= 1) return [-90]
  const start = -196
  const span = 212
  return Array.from({ length: n }, (_, i) => start + (span * i) / (n - 1))
}

/** The small radial menu on the chosen character: emotes, friends, and what they can do with what they hold. */
export function ActorRing() {
  const cast = useCast()
  const api = useItems()
  const stage = useStage()
  const [friends, setFriends] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const id = cast.state.selected
  const me = cast.state.actors[id]
  const open = api.ringOpen
  const held = me ? itemsHeldBy(api.items, id)[0] : undefined
  const canToss = held ? api.defs[held.def]?.toss === true : false

  useEffect(() => {
    if (open) ref.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [open, friends])

  if (!open || !me || (me.room ?? api.defaultRoom) !== stage.room) return null

  const close = (): void => {
    api.setRingOpen(false)
    setFriends(false)
  }
  const emote = (kind: EmoteKind): Entry => ({
    key: kind,
    label: EMOTE_NAME[kind],
    icon: <EmoteIcon kind={kind} size={40} />,
    run: () => {
      api.emoteSelected(kind)
      close()
    },
  })
  const glyph = (key: string, label: string, g: RingGlyph, run: () => void): Entry => ({ key, label, icon: <RingIcon glyph={g} />, run })
  const social = (kind: SocialKind): Entry => ({
    key: kind,
    label: EMOTE_NAME[kind],
    icon: <EmoteIcon kind={kind} size={40} />,
    run: () => {
      api.startSocial(kind)
      close()
    },
  })

  const entries: Entry[] = friends
    ? [...SOCIAL_KINDS.map(social), glyph('enrere', 'Enrere', 'enrere', () => setFriends(false))]
    : [
        emote('cor'),
        emote('riure'),
        emote('uau'),
        emote('son'),
        { key: 'amics', label: 'Amics', icon: <EmoteIcon kind="abraca" size={40} />, run: () => setFriends(true) },
        ...(held
          ? [
              glyph('deixa', 'Deixa-ho', 'deixa', () => {
                api.dropHeld()
                close()
              }),
            ]
          : []),
        ...(canToss
          ? [
              glyph('llanca', 'Llança-ho', 'llanca', () => {
                api.tossHeld()
                close()
              }),
            ]
          : []),
        ...(me.mode === 'sitting'
          ? [
              glyph('aixeca', 'Aixeca’t', 'aixeca', () => {
                api.stand()
                close()
              }),
            ]
          : []),
      ]

  const body = personHeight(stage.unit) * depthScale(me.at.y, stage.floorTop)
  const px = me.at.x * stage.w
  const py = me.at.y * stage.h - body * 1.04
  const cx = Math.min(stage.w - RADIUS - BUTTON / 2 - 6, Math.max(RADIUS + BUTTON / 2 + 6, px))
  const cy = Math.min(stage.h - BUTTON, Math.max(RADIUS + BUTTON / 2 + 10, py))
  const angles = arcAngles(entries.length)

  return (
    <div
      ref={ref}
      data-ring=""
      role="group"
      aria-label="Accions"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          close()
        }
      }}
      className="absolute"
      style={{ left: cx, top: cy, width: 0, height: 0, zIndex: stackOf(1) + 50 }}
    >
      {entries.map((entry, i) => {
        const a = ((angles[i] ?? -90) * Math.PI) / 180
        return (
          <button
            key={entry.key}
            type="button"
            data-ring-item={entry.key}
            aria-label={entry.label}
            title={entry.label}
            onClick={(e) => {
              e.stopPropagation()
              entry.run()
            }}
            className="sb-pop absolute grid cursor-pointer place-items-center rounded-full border-0 bg-white p-0 shadow-[var(--world-shadow-lift)] outline-none active:scale-90 focus-visible:outline-4 focus-visible:outline-[var(--world-focus,#4da6ec)]"
            style={{ width: BUTTON, height: BUTTON, left: Math.cos(a) * RADIUS - BUTTON / 2, top: Math.sin(a) * RADIUS - BUTTON / 2, animationDelay: `${i * 35}ms` }}
          >
            {entry.icon}
          </button>
        )
      })}
    </div>
  )
}
