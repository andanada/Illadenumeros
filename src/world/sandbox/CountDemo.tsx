import { useCallback, useMemo, useState } from 'react'
import type { Choice, Item } from '../../core/ambit/types'
import type { ErrandPhase } from '../errands/types'
import type { RequestTaskSpec } from './logic/requestTask'
import { useItems } from './ItemsContext'
import { useRequestTask, type TaskErrand } from './useRequestTask'

/** An engine item built by hand: 7 + 5 apples. */
const DEMO_ITEM: Item = {
  id: 'demo-7-5',
  skillId: 'add-demo',
  text: '7 + 5',
  speech: 'set més cinc',
  answer: '12',
  choices: [{ value: '12' }, { value: '11' }, { value: '13' }],
  visual: { kind: 'none' },
  hintVisual: { kind: 'none' },
  hints: ['Posa les pomes a la cistella d’una en una.', 'Comença pel 7 i afegeix-ne 5 més.', '7 i 5 fan 12.'],
  cpaStage: 'concret',
  operands: { a: 7, b: 5, op: '+' },
}

export const DEMO_SPEC: RequestTaskSpec = { zone: 'cistella', def: 'pometa', source: { def: 'pometa', room: 'sala', at: { x: 0.3, y: 0.9 } }, supply: 14 }

/**
 * The demo of `useRequestTask` for the playground: a fake errand (it resolves locally, no engine) asks for
 * 7 + 5 apples in the basket; a right count pays coins, a wrong one sends the apples back with a hint.
 */
export function CountDemo() {
  const { spawn } = useItems()
  const [started, setStarted] = useState(false)
  const [phase, setPhase] = useState<ErrandPhase>('asking')
  const [tries, setTries] = useState(0)
  const [coins, setCoins] = useState(0)

  const submit = useCallback(
    async (choice: Choice): Promise<void> => {
      setPhase('checking')
      await Promise.resolve()
      if (choice.value === DEMO_ITEM.answer) {
        setPhase('thanks')
        setCoins(3)
        spawn('moneda', { room: 'sala', at: { x: 0.9, y: 0.92 }, qty: 3 })
      } else {
        setTries((n) => n + 1)
        setPhase('asking')
      }
    },
    [spawn],
  )
  const errand = useMemo<TaskErrand>(() => ({ item: DEMO_ITEM, phase, tries, hintText: tries > 0 ? DEMO_ITEM.hints[Math.min(tries, 3) - 1] : undefined, submit }), [phase, tries, submit])
  const spec = useMemo(() => ({ ...DEMO_SPEC, active: started }), [started])
  const task = useRequestTask(errand, spec)

  return (
    <section aria-label="Demo de comptar" data-task-state={task.state} className="absolute right-3 top-[4.5rem] z-[5000] flex max-w-[16rem] flex-col gap-2 rounded-3xl bg-white/95 p-3 text-[#3a2d63] shadow-[var(--world-shadow-lift)]">
      {!started ? (
        <button type="button" className="min-h-12 rounded-full bg-[var(--world-lila,#9a7be6)] px-4 font-bold text-white" onClick={() => setStarted(true)}>
          Demana 7 + 5 pomes
        </button>
      ) : (
        <>
          <p className="m-0 font-bold">Posa 7 + 5 pomes a la cistella.</p>
          <button type="button" disabled={task.state !== 'counting'} className="min-h-12 rounded-full bg-[var(--world-menta,#36c5a2)] px-4 font-bold text-white disabled:opacity-50" onClick={() => void task.submit()}>
            Comprova
          </button>
          {task.hint && <p className="m-0 text-sm">{task.hint}</p>}
          <p data-coins={coins} className="m-0 text-sm">
            {coins > 0 ? `Has guanyat ${coins} monedes!` : ''}
          </p>
        </>
      )}
    </section>
  )
}
