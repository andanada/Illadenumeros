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
const CRATE = '#D49A66'
const CRATE_DARK = '#B07A4A'
/** Woven wicker: two crossing soft stripes over honey. */
const WICKER = 'repeating-linear-gradient(45deg, rgba(196,122,44,0.35) 0 6px, transparent 6px 12px), repeating-linear-gradient(-45deg, rgba(196,122,44,0.25) 0 6px, transparent 6px 12px), #E9A54B'

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
    <div className="flex flex-wrap items-end justify-center gap-x-2 gap-y-2 landscape:flex-nowrap">
      <DropZone id="caixa" label="la caixa" accepts={(prop) => prop.kind === BASKET_KIND && !locked} onDrop={takeOut} className="p-1">
        <div className="flex flex-col items-center">
          {count < BASKET_MAX && !locked ? (
            <Draggable prop={{ id: `caixa-${p.id}`, label: productLabel, kind: CRATE_KIND }} sound="squish" className="relative z-10 -mb-4 grid size-16 place-items-end justify-center">
              <FitProp id={p.id} box={56} />
            </Draggable>
          ) : (
            <div className="-mb-4 size-16" />
          )}
          <div className="relative grid h-16 w-24 place-items-center rounded-xl" style={{ background: `repeating-linear-gradient(${CRATE} 0 15px, ${CRATE_DARK} 15px 18px)` }}>
            <span className="rounded-md bg-[#FBF6EC]/90 px-1.5 text-sm font-bold leading-tight text-[#94582F]">{p.many}</span>
          </div>
        </div>
      </DropZone>

      <motion.div style={{ x: shake }}>
        <DropZone id="cistella" label="la cistella" accepts={(prop) => prop.kind === CRATE_KIND && !locked} onDrop={put} z={2} className="p-1">
          <div className="relative mt-7 rounded-[1.4rem] rounded-t-[0.8rem] p-2 shadow-[var(--world-shadow-lift)]" style={{ background: WICKER }} aria-label={`Cistella: ${countWord(shown, p.one, p.many)}`} role="img">
            <span aria-hidden="true" className="absolute -top-7 left-1/2 block h-10 w-3/4 -translate-x-1/2 rounded-t-full border-[9px] border-b-0" style={{ borderColor: '#C47A2C' }} />
            <div className="flex flex-col gap-1.5">
              {[0, 1].map((frame) => (
                <div key={frame} className="grid grid-cols-5 gap-1 rounded-xl bg-[#FFF3DC]/80 p-1">
                  {Array.from({ length: 10 }, (_, i) => {
                    const index = frame * 10 + i
                    return (
                      <span key={index} className="grid size-8 place-items-center rounded-full bg-[#F0D9AE] xl:size-9">
                        {index < shown && <FitProp id={p.id} box={28} />}
                      </span>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </DropZone>
      </motion.div>

      <div className="flex flex-col items-center gap-2 pb-1">
        {count > 0 && !locked && (
          <Draggable prop={{ id: `cistella-${p.id}`, label: `${productLabel} de la cistella`, kind: BASKET_KIND }} name={`Treu ${productLabel} de la cistella`} sound="squish" className="grid size-14 place-items-center rounded-full bg-white/80">
            <span aria-hidden="true" className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-[var(--world-coral,#ff6b5b)] text-base font-bold text-white">−</span>
            <FitProp id={p.id} box={38} />
          </Draggable>
        )}
        {(hintLevel >= 1 || solution) && (
          <p className="rounded-full bg-white px-4 py-1 text-xl font-bold tabular-nums text-[var(--world-ink,#2b2440)]">{countWord(shown, p.one, p.many)}</p>
        )}
        <button
          type="button"
          disabled={locked || basketValue(task, count) < 0}
          onClick={ring}
          className="min-h-16 rounded-full bg-[var(--world-menta,#36c5a2)] px-5 text-xl font-bold xl:text-2xl text-white shadow-[var(--world-shadow-lift)] active:translate-y-0.5 disabled:opacity-50"
        >
          <span aria-hidden="true">🛎️ </span>Ja està!
        </button>
      </div>
    </div>
  )
}
