import { animate, motion, useMotionValue } from 'motion/react'
import { useEffect, useState } from 'react'
import { FitProp } from '../../../scene/art'
import { Draggable } from '../../../scene/Draggable'
import { DropZone } from '../../../scene/DropZone'
import { useWorldReducedMotion } from '../../../scene/useReducedMotion'
import { worldSfx } from '../../../scene/worldSfx'
import { choiceForValue } from '../../../errands/adapters'
import { countWord } from '../../../errands/requestText'
import type { ErrandTaskProps } from '../../../errands/types'
import { withArticle } from '../products'
import { addOne, basketValue, BASKET_MAX, solutionCount, takeOne, type BasketTask as Task } from './basketLogic'

const CRATE_KIND = 'producte-caixa'
const BASKET_KIND = 'producte-cistella'

/** Basket errand: drag products from the crate into the basket (or out of it), then ring the bell. */
export function BasketTask({ task, item, hintLevel, locked, solution, tries, submit }: ErrandTaskProps<Task>) {
  const reduced = useWorldReducedMotion()
  const [count, setCount] = useState(task.start)
  const shake = useMotionValue(0)
  const shown = solution ? solutionCount(task) : count
  const p = task.product

  // A wrong try: the basket wobbles gently (her items stay, so she can fix them).
  useEffect(() => {
    if (tries === 0 || reduced) return
    void animate(shake, [0, -10, 9, -6, 4, 0], { duration: 0.5 })
  }, [tries, reduced, shake])

  const put = (): void => {
    if (locked) return
    setCount(addOne)
  }
  const takeOut = (): void => {
    if (locked) return
    setCount(takeOne)
  }

  const ring = (): void => {
    worldSfx.doorbell()
    submit(choiceForValue(String(basketValue(task, count)), item))
  }

  const productLabel = withArticle(p)
  return (
    <div className="flex flex-wrap items-end justify-center gap-4">
      <DropZone id="caixa" label="la caixa" accepts={(prop) => prop.kind === BASKET_KIND && !locked} onDrop={takeOut} className="p-2">
        <div className="flex flex-col items-center rounded-[1.4rem] bg-[var(--world-xocolata,#8a5638)] px-3 pb-2 pt-3">
          {count < BASKET_MAX && !locked ? (
            <Draggable prop={{ id: `caixa-${p.id}`, label: productLabel, kind: CRATE_KIND }} sound="squish" className="grid size-20 place-items-center">
              <FitProp id={p.id} box={64} />
            </Draggable>
          ) : (
            <div className="size-20" />
          )}
          <span className="mt-1 text-base font-bold text-white">Caixa de {p.many}</span>
        </div>
      </DropZone>

      <motion.div style={{ x: shake }}>
        <DropZone id="cistella" label="la cistella" accepts={(prop) => prop.kind === CRATE_KIND && !locked} onDrop={put} z={2} className="p-2">
          <div className="relative mt-8 rounded-[1.6rem] rounded-t-[1rem] bg-[var(--world-mango,#ffb834)] p-3 shadow-[var(--world-shadow-lift)]" aria-label={`Cistella: ${countWord(shown, p.one, p.many)}`} role="img">
            <span aria-hidden="true" className="absolute -top-8 left-1/2 block h-12 w-2/3 -translate-x-1/2 rounded-t-full border-[10px] border-b-0 border-[#E8901A]" />
            <div className="flex flex-col gap-2 min-[560px]:flex-row">
              {[0, 1].map((frame) => (
                <div key={frame} className="grid grid-cols-5 gap-1 rounded-xl bg-white/35 p-1.5">
                  {Array.from({ length: 10 }, (_, i) => {
                    const index = frame * 10 + i
                    return (
                      <span key={index} className="grid size-10 place-items-center rounded-full bg-white/45 sm:size-11">
                        {index < shown && <FitProp id={p.id} box={32} />}
                      </span>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </DropZone>
      </motion.div>

      {count > 0 && !locked && (
        <Draggable prop={{ id: `cistella-${p.id}`, label: `${productLabel} de la cistella`, kind: BASKET_KIND }} name={`Treu ${productLabel} de la cistella`} sound="squish" className="grid size-16 place-items-center self-center rounded-full bg-white/70">
          <FitProp id={p.id} box={44} />
        </Draggable>
      )}

      <div className="flex flex-col items-center gap-2">
        {(hintLevel >= 1 || solution) && (
          <p className="rounded-full bg-white px-4 py-1 text-xl font-bold tabular-nums text-[var(--world-ink,#2b2440)]">{countWord(shown, p.one, p.many)}</p>
        )}
        <button
          type="button"
          disabled={locked || basketValue(task, count) < 0}
          onClick={ring}
          className="min-h-16 rounded-full bg-[var(--world-menta,#36c5a2)] px-7 text-2xl font-bold text-white shadow-[var(--world-shadow-lift)] disabled:opacity-50"
        >
          <span aria-hidden="true">🛎️ </span>Ja està!
        </button>
      </div>
    </div>
  )
}

