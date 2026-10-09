import { animate, motion, useMotionValue } from 'motion/react'
import { useEffect, useState } from 'react'
import { PALETTE as P } from '../../../art/palette'
import { choiceForValue } from '../../../errands/adapters'
import { countWord } from '../../../errands/requestText'
import type { ErrandTaskProps } from '../../../errands/types'
import { Draggable } from '../../../scene/Draggable'
import { DropZone } from '../../../scene/DropZone'
import { useWorldReducedMotion } from '../../../scene/useReducedMotion'
import { worldSfx } from '../../../scene/worldSfx'
import { IngredientArt } from './IngredientArt'
import { withArticle } from './ingredients'
import { addOne, bowlSolution, bowlValue, takeOne, type BowlTask as Task } from './kitchenLogic'

export const JAR_KIND = 'ingredient-pot'
export const BOWL_KIND = 'ingredient-bol'

/** The glass jar with the ingredient: drag (or tap, then tap the bowl) one at a time. */
function Jar({ task, locked, onBack }: { task: Task; locked: boolean; onBack: () => void }) {
  const i = task.ingredient
  return (
    <DropZone id="pot" label="el pot" accepts={(prop) => prop.kind === BOWL_KIND && !locked} onDrop={onBack} className="p-1">
      <div className="flex flex-col items-center">
        <div className="h-3 w-16 rounded-t-lg" style={{ background: P.coral.base }} />
        <div className="relative grid h-[4.5rem] w-20 place-items-center rounded-[1.2rem] rounded-t-md" style={{ background: 'rgba(191,230,255,0.75)', boxShadow: `inset -8px 0 0 rgba(77,166,236,0.18)` }}>
          {!locked ? (
            <Draggable prop={{ id: `pot-${i.id}`, label: withArticle(i), kind: JAR_KIND }} sound="squish" className="grid size-14 place-items-center">
              <IngredientArt id={i.id} size={44} />
            </Draggable>
          ) : (
            <IngredientArt id={i.id} size={44} />
          )}
        </div>
        <span className="mt-0.5 rounded-md bg-[#FBF6EC] px-1.5 text-sm font-bold text-[var(--world-ink,#2b2440)]">{i.many}</span>
      </div>
    </DropZone>
  )
}

/** The mixing bowl: two ten-frames, so filling to ten (and going past it) is something she can see. */
function Bowl({ task, shown, locked, onPut }: { task: Task; shown: number; locked: boolean; onPut: () => void }) {
  const i = task.ingredient
  return (
    <DropZone id="bol" label="el bol" accepts={(prop) => prop.kind === JAR_KIND && !locked} onDrop={onPut} z={2} className="p-1">
      <div role="img" aria-label={`Bol: ${countWord(shown, i.one, i.many)}`} className="relative rounded-b-[3.5rem] rounded-t-[1rem] px-3 pb-5 pt-2 shadow-[var(--world-shadow-lift)]" style={{ background: P.cel.base }}>
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 rounded-b-[3.5rem]" style={{ background: P.cel.shade, opacity: 0.35 }} />
        <span aria-hidden="true" className="absolute left-6 top-3 h-2 w-10 rounded-full bg-white/60" />
        <div className="relative flex flex-col gap-1.5 rounded-[1rem] rounded-b-[2.5rem] bg-[#FFF6E6] p-1.5 pb-3">
          {[0, 1].map((frame) => (
            <div key={frame} className="grid grid-cols-5 gap-1 rounded-xl p-1" style={{ background: frame === 0 ? 'rgba(77,166,236,0.16)' : 'rgba(255,184,52,0.2)' }}>
              {Array.from({ length: 10 }, (_, k) => {
                const index = frame * 10 + k
                const already = index < task.start
                return (
                  <span key={index} className="grid size-8 place-items-center rounded-full xl:size-9" style={{ background: already ? '#F3D9B3' : '#F6E7CC' }}>
                    {index < shown && <IngredientArt id={i.id} size={26} />}
                  </span>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </DropZone>
  )
}

/** Cooking errand: ingredients from the jar into the bowl (or back), then "Ja està!". */
export function BowlTask({ task, item, hintLevel, locked, solution, tries, submit }: ErrandTaskProps<Task>) {
  const reduced = useWorldReducedMotion()
  const [count, setCount] = useState(task.start)
  const wobble = useMotionValue(0)
  const shown = solution ? bowlSolution(task) : count
  const i = task.ingredient

  useEffect(() => {
    if (tries === 0 || reduced) return
    void animate(wobble, [0, -8, 7, -4, 3, 0], { duration: 0.5 })
  }, [tries, reduced, wobble])

  const put = (): void => {
    if (!locked) setCount(addOne)
  }
  const back = (): void => {
    if (!locked) setCount((c) => takeOne(task, c))
  }
  const done = (): void => {
    worldSfx.plop()
    submit(choiceForValue(String(bowlValue(task, count)), item))
  }

  return (
    <div className="flex flex-wrap items-end justify-center gap-x-3 gap-y-2 landscape:flex-nowrap">
      <Jar task={task} locked={locked} onBack={back} />
      <motion.div style={{ rotate: wobble }}>
        <Bowl task={task} shown={shown} locked={locked} onPut={put} />
      </motion.div>
      <div className="flex flex-col items-center gap-2 pb-1">
        {count > task.start && !locked && (
          <Draggable prop={{ id: `bol-${i.id}`, label: `${withArticle(i)} del bol`, kind: BOWL_KIND }} name={`Treu ${withArticle(i)} del bol`} sound="squish" className="grid size-14 place-items-center rounded-full bg-white/85">
            <span aria-hidden="true" className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-[var(--world-coral,#ff6b5b)] text-base font-bold text-white">−</span>
            <IngredientArt id={i.id} size={34} />
          </Draggable>
        )}
        {(hintLevel >= 1 || solution) && (
          <p className="rounded-full bg-white px-4 py-1 text-xl font-bold tabular-nums text-[var(--world-ink,#2b2440)]">
            {task.mode === 'fill' ? `+${Math.max(0, shown - task.start)}` : countWord(shown, i.one, i.many)}
          </p>
        )}
        <button
          type="button"
          disabled={locked}
          onClick={done}
          className="min-h-16 rounded-full bg-[var(--world-menta,#36c5a2)] px-5 text-xl font-bold text-white shadow-[var(--world-shadow-lift)] active:translate-y-0.5 disabled:opacity-50 xl:text-2xl"
        >
          <span aria-hidden="true">🥣 </span>Ja està!
        </button>
      </div>
    </div>
  )
}
