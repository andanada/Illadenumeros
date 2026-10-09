import { animate, motion, useMotionValue } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { JUMPS, jumpLabel, positionAfter, positionsOf, type Jump } from '../../../../games/cursa-recta/jumpLogic'
import { choiceForValue } from '../../../errands/adapters'
import { FallbackTokens } from '../../../errands/FallbackTokens'
import type { ErrandTaskProps } from '../../../errands/types'
import { useWorldReducedMotion } from '../../../scene/useReducedMotion'
import { busSfx } from '../busSfx'
import { useBusLook } from '../interior/busLook'
import { RoadLine } from './RoadLine'
import { arrived, canDrive, roadWindow, solutionJumps, type RoadTask as Task } from './roadLogic'

const PEDAL: Record<Jump, { name: string; style: string }> = {
  [-10]: { name: 'Endarrere 10 parades', style: 'bg-[var(--world-mango,#ffb834)] text-[var(--world-ink,#2b2440)]' },
  [-1]: { name: 'Endarrere 1 parada', style: 'bg-[var(--world-menta,#36c5a2)] text-white' },
  1: { name: 'Endavant 1 parada', style: 'bg-[var(--world-cel,#4da6ec)] text-white' },
  10: { name: 'Endavant 10 parades', style: 'bg-[var(--world-coral,#ff6b5b)] text-white' },
}
const ORDER: readonly Jump[] = [-10, -1, 1, 10]
const pill = 'min-h-16 rounded-full px-5 text-xl font-bold shadow-[var(--world-shadow-lift)] active:translate-y-0.5 disabled:opacity-40'

/**
 * Number-line errand: drive the bus stop by stop (or ten at a time) along the line. 'go' answers with the
 * stop where she opens the doors; 'count' and 'read' answer with a ticket once the bus reaches the friend.
 */
export function RoadTask({ task, item, hintLevel, wrongValues, locked, solution, tries, submit }: ErrandTaskProps<Task>) {
  const reduced = useWorldReducedMotion()
  const look = useBusLook()
  const [jumps, setJumps] = useState<readonly Jump[]>([])
  const shake = useMotionValue(0)

  useEffect(() => {
    if (tries === 0 || reduced) return
    const c = animate(shake, [0, -8, 7, -4, 0], { duration: 0.45 })
    return () => c.stop()
  }, [tries, reduced, shake])

  const position = positionAfter(task.start, jumps)
  const shownJumps = useMemo(
    () => (solution && position !== task.target ? [...jumps, ...solutionJumps(position, task.target)] : jumps),
    [solution, position, task.target, jumps],
  )
  const positions = useMemo(() => positionsOf(task.start, shownJumps), [task.start, shownJumps])
  const view = useMemo(() => roadWindow(task, positions), [task, positions])
  const here = positions[positions.length - 1] ?? task.start
  const there = arrived(task, shownJumps)

  const drive = (jump: Jump): void => {
    if (locked || !canDrive(task, position, jump)) return
    if (Math.abs(jump) === 10) busSfx.zoom()
    else busSfx.hop()
    look.drive(Math.abs(jump))
    setJumps((j) => [...j, jump])
  }
  const undo = (): void => {
    if (!locked) setJumps((j) => j.slice(0, -1))
  }

  const labelled = (n: number): boolean => {
    if (task.mode === 'read') return n === view.lo || n === view.hi
    return n % 10 === 0 || n === task.start || (task.mode === 'count' && n === task.target) || (solution && n === task.target)
  }
  const sign = task.mode === 'read' && !solution ? '?' : String(here)
  const tickets = task.mode !== 'go' && (there || solution)

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <motion.div style={{ x: shake }} className="w-full rounded-[1.6rem] bg-white/90 px-2 pt-1 shadow-[var(--world-shadow-soft)]">
        <RoadLine
          lo={view.lo}
          hi={view.hi}
          positions={positions}
          jumps={shownJumps}
          labelled={labelled}
          {...(task.mode !== 'go' ? { waitingAt: task.target } : {})}
          {...(task.mode === 'go' && (hintLevel >= 1 || solution) ? { flagAt: task.target } : {})}
          sign={sign}
          friendSeed={`amiga-${item.id}`}
        />
      </motion.div>
      {tickets ? (
        <div className="flex flex-col items-center gap-1">
          <p className="text-lg font-bold text-[var(--world-ink,#2b2440)]">
            {task.mode === 'count' ? 'Quantes parades has fet?' : 'Quin número té aquesta parada?'}
          </p>
          <FallbackTokens
            choices={item.choices}
            wrongValues={wrongValues}
            locked={locked}
            submit={submit}
            {...(solution ? { reveal: item.answer } : {})}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-2" role="group" aria-label="Pedals de l’autobús">
            {ORDER.filter((j) => JUMPS.includes(j)).map((jump) => (
              <button
                key={jump}
                type="button"
                aria-label={PEDAL[jump].name}
                disabled={locked || !canDrive(task, position, jump)}
                onClick={() => drive(jump)}
                className={`${pill} min-w-[4.5rem] px-3 text-2xl tabular-nums sm:min-w-[5.5rem] ${PEDAL[jump].style}`}
              >
                {jumpLabel(jump)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={locked || jumps.length === 0}
              onClick={undo}
              className={`${pill} bg-white text-[var(--world-text-soft,#6b5f80)]`}
            >
              ↶ Desfés
            </button>
            {task.mode === 'go' && (
              <button
                type="button"
                disabled={locked || jumps.length === 0}
                onClick={() => {
                  busSfx.brake()
                  submit(choiceForValue(String(position), item))
                }}
                className={`${pill} bg-[var(--world-menta,#36c5a2)] text-white`}
              >
                <span aria-hidden="true">🚪 </span>Obre les portes
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
