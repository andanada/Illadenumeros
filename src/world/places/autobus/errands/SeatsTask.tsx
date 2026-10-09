import { animate, motion, useMotionValue } from 'motion/react'
import { useEffect, useState } from 'react'
import { choiceForValue } from '../../../errands/adapters'
import { countWord } from '../../../errands/requestText'
import type { ErrandTaskProps } from '../../../errands/types'
import { Draggable } from '../../../scene/Draggable'
import { DropZone } from '../../../scene/DropZone'
import { TapProp } from '../../../scene/Scene'
import { useScene } from '../../../scene/SceneContext'
import { useWorldReducedMotion } from '../../../scene/useReducedMotion'
import { busSfx } from '../busSfx'
import { Bus, SeatFace } from '../interior/BusArt'
import { BusRow, BusStop } from '../interior/BusStop'
import { StandingPassenger } from '../interior/Passenger'
import { useBusViewport } from '../interior/useBusViewport'
import { getOff, getOn, seatsValue, solutionOnBoard, startCrowd, type Crowd, type SeatsTask as Task } from './seatsLogic'

const ON_KIND = 'passatger-parada'
const OFF_KIND = 'passatger-bus'
/** Fills the window (a style, so it wins over the prop's own `relative`). */
const FILL = { position: 'absolute', inset: 0 } as const
const people = (n: number): string => countWord(n, 'passatger', 'passatgers')

const pill =
  'min-h-16 rounded-full px-5 text-xl font-bold shadow-[var(--world-shadow-lift)] active:translate-y-0.5 disabled:opacity-50 xl:text-2xl'

/**
 * Passenger errand: people at the stop get on (drag them to the bus, or tap one and then the bus), people
 * on board get off (tap their window, or drag the "baixa" passenger to the stop). The two ten-frames of
 * windows show the count; "Tanca les portes" gives the answer.
 */
export function SeatsTask({ task, item, hintLevel, locked, solution, tries, submit }: ErrandTaskProps<Task>) {
  const reduced = useWorldReducedMotion()
  const scene = useScene()
  const { portrait, passenger } = useBusViewport()
  const [crowd, setCrowd] = useState<Crowd>(() => startCrowd(task, item.id))
  const shake = useMotionValue(0)
  const shownCount = solution ? solutionOnBoard(task) : crowd.onBoard.length

  // A wrong try: the bus rocks gently; everybody stays where they are so she can fix it.
  useEffect(() => {
    if (tries === 0 || reduced) return
    const c = animate(shake, [0, -10, 9, -6, 4, 0], { duration: 0.5 })
    return () => c.stop()
  }, [tries, reduced, shake])

  const on = (): void => {
    if (!locked) setCrowd(getOn)
  }
  const off = (who?: string): void => {
    if (!locked) setCrowd((c) => getOff(c, who))
  }
  const close = (): void => {
    busSfx.brake()
    submit(choiceForValue(String(seatsValue(task, crowd.onBoard.length)), item))
  }

  const maxShown = portrait ? 3 : 5
  const queue = crowd.atStop.slice(0, maxShown)
  const [front] = queue
  const seatSeed = (i: number): string | undefined => (solution ? `${item.id}-sol${i}` : crowd.onBoard[i])

  return (
    <div className="flex w-full flex-col gap-2">
      <BusRow
        portrait={portrait}
        stop={
          <DropZone id="parada" label="la parada" accepts={(p) => p.kind === OFF_KIND && !locked} onDrop={() => off()}>
            <BusStop label={`A la parada: ${people(crowd.atStop.length)}`} more={crowd.atStop.length - queue.length}>
              {[...queue].reverse().map((seed) =>
                seed === front && !locked ? (
                  <Draggable
                    key={seed}
                    prop={{ id: `puja-${seed}`, label: 'el passatger de la parada', kind: ON_KIND }}
                    name="Fes pujar el primer de la cua"
                    sound="squish"
                    className="-ml-[6%]"
                  >
                    <StandingPassenger seed={seed} size={passenger} animated />
                  </Draggable>
                ) : (
                  <div key={seed} className="-ml-[6%] opacity-95">
                    <StandingPassenger seed={seed} size={passenger * 0.92} />
                  </div>
                ),
              )}
            </BusStop>
          </DropZone>
        }
        bus={
          <motion.div style={{ x: shake }}>
            <DropZone id="autobus" label="l’autobús" accepts={(p) => p.kind === ON_KIND && !locked} onDrop={on} z={2}>
              <Bus
                label={`L’autobús: ${people(shownCount)}`}
                destination={hintLevel >= 1 || solution ? String(shownCount) : '?'}
                seat={(i) => {
                  const seed = seatSeed(i)
                  if (seed === undefined || i >= shownCount) return null
                  return locked ? (
                    <SeatFace seed={seed} />
                  ) : (
                    <TapProp
                      prop={{ id: `seient-${seed}`, label: `Seient ${i + 1}, fes baixar el passatger`, kind: 'seient' }}
                      sound="plop"
                      onTap={() => {
                        // Holding someone from the stop: this tap seats them (the bus zone handles it).
                        if (!scene.held) off(seed)
                      }}
                      style={FILL}
                    >
                      <SeatFace seed={seed} />
                    </TapProp>
                  )
                }}
              />
            </DropZone>
          </motion.div>
        }
      />
      <div className="flex flex-wrap items-center justify-center gap-3">
        {crowd.onBoard.length > 0 && !locked && (
          <Draggable
            prop={{ id: 'baixa', label: 'el passatger que baixa', kind: OFF_KIND }}
            name="Fes baixar un passatger"
            sound="squish"
            className="grid size-16 place-items-center rounded-full bg-white shadow-[var(--world-shadow-soft)]"
          >
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-[var(--world-coral,#ff6b5b)] text-base font-bold text-white"
            >
              −
            </span>
            <span aria-hidden="true" className="text-3xl">
              🚶
            </span>
          </Draggable>
        )}
        {(hintLevel >= 1 || solution) && (
          <p className="rounded-full bg-white px-4 py-1 text-xl font-bold tabular-nums text-[var(--world-ink,#2b2440)]">
            {people(shownCount)}
          </p>
        )}
        <button
          type="button"
          disabled={locked || seatsValue(task, crowd.onBoard.length) < 0}
          onClick={close}
          className={`${pill} bg-[var(--world-menta,#36c5a2)] text-white`}
        >
          <span aria-hidden="true">🚪 </span>Tanca les portes
        </button>
      </div>
    </div>
  )
}
