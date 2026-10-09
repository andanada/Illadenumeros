import { animate, motion, useMotionValue } from 'motion/react'
import { useEffect, useState } from 'react'
import { choiceForValue } from '../../../errands/adapters'
import type { ErrandTaskProps } from '../../../errands/types'
import { Draggable } from '../../../scene/Draggable'
import { DropZone } from '../../../scene/DropZone'
import { useWorldReducedMotion } from '../../../scene/useReducedMotion'
import { worldSfx } from '../../../scene/worldSfx'
import { ClipArt, clipColour } from './ClipArt'
import { addClip, clipSolution, takeClip, TRAY_MAX, type ClipTask as Task } from './clipLogic'
import { HeadModel } from './HeadModel'

export const BOX_KIND = 'pinca-caixa'
export const TRAY_KIND = 'pinca-safata'

const plural = (n: number): string => `${n} ${n === 1 ? 'pinça' : 'pinces'}`

/** The tray: two frames of ten (two rows of five), so ten, and what is past it, can be seen at a glance. */
function Tray({ shown, locked, onPut }: { shown: number; locked: boolean; onPut: () => void }) {
  return (
    <DropZone id="safata-pinces" label="la safata" accepts={(p) => p.kind === BOX_KIND && !locked} onDrop={onPut} z={2} className="p-1">
      <div role="img" aria-label={`Safata: ${plural(shown)}`} className="flex flex-col gap-1.5 rounded-[1.4rem] bg-[#FFF3DC] p-2 shadow-[var(--world-shadow-lift)]">
        {[0, 1].map((frame) => (
          <div key={frame} className="grid grid-cols-5 gap-1 rounded-xl p-1" style={{ background: frame === 0 ? 'rgba(255,141,186,0.2)' : 'rgba(77,166,236,0.18)' }}>
            {Array.from({ length: 10 }, (_, k) => {
              const idx = frame * 10 + k
              return (
                <span key={k} className="grid size-9 place-items-center rounded-full bg-white/70 xl:size-10">
                  {idx < shown && <ClipArt size={20} color={clipColour(idx)} />}
                </span>
              )
            })}
          </div>
        ))}
      </div>
    </DropZone>
  )
}

/** Clip errand: clips from the box onto the tray (or back), then "Ja està!". Drag, or tap a clip and then the tray. */
export function ClipTask({ task, item, hintLevel, locked, solution, tries, submit }: ErrandTaskProps<Task>) {
  const reduced = useWorldReducedMotion()
  const [count, setCount] = useState(0)
  const wobble = useMotionValue(0)
  const shown = solution ? clipSolution(task) : count

  useEffect(() => {
    if (tries === 0 || reduced) return
    void animate(wobble, [0, -8, 7, -4, 3, 0], { duration: 0.5 })
  }, [tries, reduced, wobble])

  const put = (): void => {
    if (!locked) setCount(addClip)
  }
  const back = (): void => {
    if (!locked) setCount(takeClip)
  }
  const done = (): void => {
    worldSfx.coin()
    submit(choiceForValue(String(count), item))
  }

  return (
    <div className="flex flex-wrap items-end justify-center gap-x-3 gap-y-2 landscape:flex-nowrap">
      <HeadModel task={task} placed={shown} />
      <DropZone id="capsa-pinces" label="la capsa de pinces" accepts={(p) => p.kind === TRAY_KIND && !locked} onDrop={back} className="p-1">
        <div className="flex flex-col items-center">
          {!locked ? (
            <Draggable prop={{ id: 'capsa-pinca', label: 'la pinça', kind: BOX_KIND }} sound="squish" className="relative z-10 -mb-3 grid size-14 place-items-end justify-center">
              <ClipArt size={34} color={clipColour(count)} />
            </Draggable>
          ) : (
            <div className="-mb-3 size-14" />
          )}
          <div className="grid h-14 w-24 place-items-center rounded-xl bg-[#E9B07C]" style={{ boxShadow: 'inset 0 -6px 0 #C98D5E' }}>
            <span className="rounded-md bg-[#FBF6EC]/90 px-1.5 text-sm font-bold text-[#94582F]">pinces</span>
          </div>
        </div>
      </DropZone>
      <motion.div style={{ rotate: wobble }}>
        <Tray shown={shown} locked={locked} onPut={put} />
      </motion.div>
      <div className="flex flex-col items-center gap-2 pb-1">
        {count > 0 && !locked && (
          <Draggable prop={{ id: 'safata-pinca', label: 'la pinça de la safata', kind: TRAY_KIND }} name="Treu una pinça de la safata" sound="squish" className="grid size-14 place-items-center rounded-full bg-white/85">
            <span aria-hidden="true" className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-[var(--world-coral,#ff6b5b)] text-base font-bold text-white">−</span>
            <ClipArt size={26} color={clipColour(count - 1)} />
          </Draggable>
        )}
        {(hintLevel >= 1 || solution) && <p className="rounded-full bg-white px-4 py-1 text-xl font-bold tabular-nums text-[var(--world-ink,#2b2440)]">{plural(shown)}</p>}
        <button
          type="button"
          disabled={locked || shown > TRAY_MAX}
          onClick={done}
          className="min-h-16 rounded-full bg-[var(--world-menta,#36c5a2)] px-5 text-xl font-bold text-white shadow-[var(--world-shadow-lift)] active:translate-y-0.5 disabled:opacity-50 xl:text-2xl"
        >
          <span aria-hidden="true">✂️ </span>Ja està!
        </button>
      </div>
    </div>
  )
}
