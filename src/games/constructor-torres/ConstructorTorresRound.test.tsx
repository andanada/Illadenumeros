import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CpaStage, Item } from '../../core/ambit/types'
import { makeTestFlow, makeTestRounds } from '../shared/testUtils'
import { ConstructorTorresRound } from './ConstructorTorresRound'

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

describe('ConstructorTorresRound', () => {
  it('stacks floors with a repeated addition tape, then answers', async () => {
    const flow = makeTestFlow(item(2, 3, '×'))
    render(<ConstructorTorresRound flow={flow} rounds={makeTestRounds()} onNext={noop} />)
    expect(screen.queryByRole('group', { name: 'Respostes' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Afegeix una planta' }))
    expect(screen.getByText('3 = 3')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Afegeix una planta' }))
    expect(screen.getByText('3 + 3 = 6')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Resposta 6' }))
    await waitFor(() => expect(flow.answer).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole('button', { name: /Següent/ })).toBeInTheDocument()
  })

  it('lets the child take the last floor off', async () => {
    render(<ConstructorTorresRound flow={makeTestFlow(item(3, 2, '×'))} rounds={makeTestRounds()} onNext={noop} />)
    await userEvent.click(screen.getByRole('button', { name: 'Afegeix una planta' }))
    await userEvent.click(screen.getByRole('button', { name: 'Treu l’última' }))
    expect(screen.getByRole('img', { name: /Torre de 0 plantes/ })).toBeInTheDocument()
  })

  it('asks how many floors in the reverse (division) tower', async () => {
    render(<ConstructorTorresRound flow={makeTestFlow(item(6, 3, ':'))} rounds={makeTestRounds()} onNext={noop} />)
    await userEvent.click(screen.getByRole('button', { name: 'Afegeix una planta' }))
    await userEvent.click(screen.getByRole('button', { name: 'Afegeix una planta' }))
    expect(screen.getByText('Quantes plantes de 3 blocs té la torre de 6?')).toBeInTheDocument()
  })

  it('hides the tower in the abstract stage until asked', async () => {
    const flow = makeTestFlow(item(3, 4, '×', 'abstracte'))
    render(<ConstructorTorresRound flow={flow} rounds={makeTestRounds()} onNext={noop} />)
    await userEvent.click(screen.getByRole('button', { name: 'Mostra la torre' }))
    expect(flow.markHint).toHaveBeenCalled()
  })

  it('completes the tower on the solution hint', () => {
    render(<ConstructorTorresRound flow={makeTestFlow(item(2, 3, '×'), 3)} rounds={makeTestRounds()} onNext={noop} />)
    expect(screen.getByRole('img', { name: /6 blocs en total/ })).toBeInTheDocument()
  })
})
