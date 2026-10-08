import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CpaStage, Item } from '../../core/ambit/types'
import { makeTestFlow, makeTestRounds } from '../shared/testUtils'
import { JardiArraysRound } from './JardiArraysRound'

const item = (a: number, b: number, op: '×' | ':', cpaStage: CpaStage = 'concret'): Item => {
  const answer = op === '×' ? a * b : a / b
  return {
    id: `${a}${op}${b}${cpaStage}`,
    skillId: 'C4',
    text: `${a} ${op} ${b} = ?`,
    speech: '',
    answer: String(answer),
    choices: [{ value: String(answer) }, { value: String(answer + 1) }],
    visual: { kind: 'none' },
    hintVisual: { kind: 'none' },
    hints: ['a', 'b', 'c'],
    cpaStage,
    operands: { a, b, op },
  }
}
const noop = (): void => undefined

describe('JardiArraysRound', () => {
  it('plants row by row, then reads the product', async () => {
    const flow = makeTestFlow(item(2, 3, '×'))
    render(<JardiArraysRound flow={flow} rounds={makeTestRounds()} onNext={noop} />)
    expect(screen.queryByRole('group', { name: 'Respostes' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Planta una fila' }))
    expect(screen.getByRole('img', { name: /1 fila de 3 = 3 flors/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Planta una fila' }))
    await userEvent.click(screen.getByRole('button', { name: 'Resposta 6' }))
    await waitFor(() => expect(flow.answer).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole('button', { name: /Següent/ })).toBeInTheDocument()
  })

  it('shares a garden into equal rows', async () => {
    render(<JardiArraysRound flow={makeTestFlow(item(6, 2, ':'))} rounds={makeTestRounds()} onNext={noop} />)
    for (let i = 0; i < 3; i++) await userEvent.click(screen.getByRole('button', { name: 'Una flor a cada fila' }))
    expect(screen.getByText('Quantes flors té cada fila?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resposta 3' })).toBeInTheDocument()
  })

  it('hides the garden in the abstract stage until asked', async () => {
    const flow = makeTestFlow(item(3, 4, '×', 'abstracte'))
    render(<JardiArraysRound flow={flow} rounds={makeTestRounds()} onNext={noop} />)
    expect(screen.getByRole('group', { name: 'Respostes' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Mostra el jardí' }))
    expect(flow.markHint).toHaveBeenCalled()
  })

  it('shows the whole garden when the solution is revealed', () => {
    render(<JardiArraysRound flow={makeTestFlow(item(2, 3, '×'), 3)} rounds={makeTestRounds()} onNext={noop} />)
    expect(screen.getByRole('img', { name: /6 flors/ })).toBeInTheDocument()
  })
})
