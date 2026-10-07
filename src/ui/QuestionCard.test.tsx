import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Item } from '../core/ambit/types'
import type { HintLevel, QuestionFlow } from '../features/play/useQuestionFlow'
import { QuestionCard } from './QuestionCard'

vi.mock('../core/audio/speech', () => ({ speak: vi.fn(), isMuted: () => true, setMuted: vi.fn(), stopSpeaking: vi.fn() }))
vi.mock('../core/audio/sfx', () => ({ sfx: { correct: vi.fn(), almost: vi.fn(), tap: vi.fn(), star: vi.fn() }, unlockAudio: vi.fn() }))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))

const item: Item = {
  id: 'A4-x',
  skillId: 'A4',
  text: '3 + 4',
  speech: 'Quant fan tres més quatre?',
  answer: '7',
  choices: [{ value: '6' }, { value: '7' }, { value: '8' }, { value: '9' }],
  visual: { kind: 'dots', groups: [3, 4] },
  hintVisual: { kind: 'tenFrame', a: 3, b: 4, op: '+' },
  hints: ['Mira les fitxes.', 'Comença pel 4 i compta 3 més.', 'Són 7 en total.'],
  cpaStage: 'pictoric',
}

function makeFlow(hintLevel: HintLevel, wrongValues: string[] = [], answer = vi.fn(), current: Item = item): QuestionFlow {
  return {
    item: current,
    skill: { id: 'A4', code: 'A4', grade: 1, title: 't', prereqs: [], hasFacts: true, games: [], fluencyTargetMs: 3000 },
    hintLevel,
    errors: hintLevel,
    wrongValues,
    streak: 0,
    answered: 0,
    correctCount: 0,
    answer,
    next: vi.fn(),
    markHint: vi.fn(),
  }
}

describe('QuestionCard hint ladder', () => {
  it('shows the first hint after one error and greys out the wrong choice', () => {
    render(<QuestionCard flow={makeFlow(1, ['6'])} character="mixa" onContinue={vi.fn()} />)
    expect(screen.getByText('Mira les fitxes.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resposta 6' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Continua' })).not.toBeInTheDocument()
  })

  it('reveals the worked solution and Continua after three errors', async () => {
    const onContinue = vi.fn()
    render(<QuestionCard flow={makeFlow(3, ['6', '8', '9'])} character="mixa" onContinue={onContinue} />)
    expect(screen.getByText('Són 7 en total.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resposta 7' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Continua' }))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('answers through the flow and reports the result', async () => {
    const result = { correct: false, itemDone: false }
    const answer = vi.fn().mockResolvedValue(result)
    const onResult = vi.fn()
    render(<QuestionCard flow={makeFlow(0, [], answer)} character="mixa" onResult={onResult} onContinue={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Resposta 8' }))
    expect(answer).toHaveBeenCalledWith({ value: '8' })
    expect(onResult).toHaveBeenCalledWith(result)
  })
})

describe('QuestionCard with the new visual kinds', () => {
  it('renders array, share, fraction and money visuals through the dispatcher', () => {
    const cases: [Item['visual'], RegExp][] = [
      [{ kind: 'array', rows: 3, cols: 4 }, /3 files de 4 magdalenes/],
      [{ kind: 'share', total: 14, groups: 4 }, /en sobren 2/],
      [{ kind: 'fraction', parts: 4, selected: 3, collection: 12 }, /en pintem 9/],
      [{ kind: 'money', coins: [200, 100] }, /Total: 3 €/],
    ]
    for (const [visual, name] of cases) {
      const { unmount } = render(<QuestionCard flow={makeFlow(0, [], vi.fn(), { ...item, id: `v-${visual.kind}`, visual })} character="mixa" onContinue={vi.fn()} />)
      expect(screen.getByRole('img', { name })).toBeInTheDocument()
      unmount()
    }
  })
})
