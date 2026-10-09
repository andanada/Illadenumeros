import { useEffect, useState } from 'react'
import { PALETTE as P } from '../../../art/palette'
import { NEIGHBOURS_BY_ID } from '../../../characters/neighbours'
import { Avatar } from '../../../scene/art'
import { Draggable } from '../../../scene/Draggable'
import { DropZone } from '../../../scene/DropZone'
import { useScene } from '../../../scene/SceneContext'
import { useWorldReducedMotion } from '../../../scene/useReducedMotion'
import { worldSfx, type WorldSound } from '../../../scene/worldSfx'
import type { AvatarSpec } from '../../../model/types'
import { applyTool, lookOf, nextSprayColour, reactionFor, TOOL_NAMES, toolKind, toolOfKind, TOOLS, type SalonState, type Tool } from './salonLogic'
import { ToolArt } from './ToolArt'

export const CUSTOMER_ID = 'la-fatima'

const SOUND: Readonly<Record<Tool, WorldSound>> = { tisores: 'squish', assecador: 'whoosh', color: 'whoosh', pinces: 'beep' }
const DONE_SOUND: Readonly<Record<Tool, WorldSound>> = { tisores: 'plop', assecador: 'purr', color: 'coin', pinces: 'kaching' }

/** The mirror on the wall: it shows the customer from the front, so she sees the new look at once. */
export function Mirror({ look, size, className = '' }: { look: AvatarSpec; size: number; className?: string }) {
  return (
    <div
      role="img"
      aria-label="El mirall, amb el nou pentinat"
      className={`relative shrink-0 overflow-hidden rounded-[2.4rem] shadow-[var(--world-shadow-lift)] ${className}`}
      style={{ background: P.mango.base, padding: 8, width: size * 0.62, height: size * 0.78 }}
    >
      <div className="relative grid h-full w-full place-items-center overflow-hidden rounded-[1.9rem]" style={{ background: 'linear-gradient(135deg, #DDF3FF, #BFE6FF 60%, #EAF8FF)' }}>
        <div style={{ transform: 'scaleX(-1)' }}>
          <Avatar spec={look} crop="head" size={size * 0.52} title="" animated={false} />
        </div>
        <span aria-hidden="true" className="absolute left-3 top-3 h-2 w-12 -rotate-[20deg] rounded-full bg-white/70" />
        <span aria-hidden="true" className="absolute left-3 top-8 h-2 w-5 -rotate-[20deg] rounded-full bg-white/60" />
      </div>
    </div>
  )
}

/** The tool trolley: drag a tool onto the customer, or tap it and then tap the customer. */
export function ToolRack({ state, className = '' }: { state: SalonState; className?: string }) {
  return (
    <ul aria-label="Eines de la perruqueria" className={`flex items-end justify-center gap-2 rounded-[1.6rem] bg-white/85 p-2 shadow-[var(--world-shadow-lift)] ${className}`}>
      {TOOLS.map((tool) => (
        <li key={tool}>
          <Draggable prop={{ id: `eina-${tool}`, label: TOOL_NAMES[tool], kind: toolKind(tool) }} sound={SOUND[tool]} className="grid size-16 place-items-center rounded-2xl">
            <ToolArt tool={tool} size={52} spray={nextSprayColour(state)} />
          </Draggable>
        </li>
      ))}
    </ul>
  )
}

export interface FreePlayChairProps {
  state: SalonState
  onChange: (next: SalonState) => void
  size: number
}

/** The customer in the chair: tools change their hair, and they answer every time (never a wrong move). */
export function FreePlayChair({ state, onChange, size }: FreePlayChairProps) {
  const reduced = useWorldReducedMotion()
  const scene = useScene()
  const preset = NEIGHBOURS_BY_ID[CUSTOMER_ID]
  const [shown, setShown] = useState<{ tool: Tool; n: number } | undefined>(undefined)

  useEffect(() => {
    if (!shown) return
    const timer = setTimeout(() => setShown(undefined), reduced ? 2200 : 1500)
    return () => clearTimeout(timer)
  }, [shown, reduced])

  if (!preset) return null
  const look = lookOf(preset.spec, state)
  const scaled = size * (1 + ((preset.stature - 1) * 138) / 322)
  const use = (tool: Tool): void => {
    worldSfx[DONE_SOUND[tool]]()
    onChange(applyTool(state, tool))
    setShown((s) => ({ tool, n: (s?.n ?? 0) + 1 }))
  }
  const text = shown ? reactionFor(shown.tool, shown.n) : ''
  return (
    <div className="flex items-end gap-3">
      <Mirror look={look} size={size * 1.1} className="hidden sm:block" />
      <div className="relative">
        <DropZone
          id="client-perruqueria"
          label="la clienta"
          accepts={(p) => toolOfKind(p.kind) !== undefined}
          onDrop={(p) => {
            const tool = toolOfKind(p.kind)
            if (tool) use(tool)
          }}
          className="p-2"
        >
          <div className={shown && !reduced ? 'world-hop' : ''}>
            <Avatar spec={look} pose={shown ? 'cheer' : scene.held ? 'wave' : 'idle'} size={scaled} stature={preset.stature} title="La Fàtima, a la cadira" seed={CUSTOMER_ID} look={{ x: -0.4, y: 0 }} />
          </div>
          {state.fluffed && (
            <span aria-hidden="true" data-testid="aire" className="absolute -top-2 left-1/2 -translate-x-1/2 text-3xl">
              💨
            </span>
          )}
        </DropZone>
        {text && (
          <p role="status" aria-live="polite" className="absolute -top-3 left-full z-20 ml-1 w-44 rounded-[1.4rem] bg-white px-3 py-2 text-lg font-bold leading-snug text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-lift)]">
            {text}
          </p>
        )}
      </div>
    </div>
  )
}
