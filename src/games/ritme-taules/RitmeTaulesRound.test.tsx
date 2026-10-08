import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CpaStage, Item } from '../../core/ambit/types'
import { makeTestFlow, makeTestRounds } from '../shared/testUtils'
import { RitmeTaulesRound } from './RitmeTaulesRound'

const mul = (a: number, b: number, cpaStage: CpaStage = 'concret'): Item => ({
  id: `m-${a}x${b}-${cpaStage}`,
  skillId: 'C4',
  text: `${a} × ${b} = ?`,
  speech: '',
  answer: String(a * b),
  choices: [{ value: String(a * b) }, { value: String(a * b + 1) }, { value: String(a * b - 1) }],
  visual: { kind: 'none' },
  hintVisual: { kind: 'none' },
  hints: ['a', 'b', 'c'],
  cpaStage,
  operands: { a, b, op: '×' },
})

const noop = (): void => undefined

describe('RitmeTaulesRound', () => {
  it('counts bar by bar, then asks which number lands on the last bar', async () => {
    const flow = makeTestFlow(mul(2, 3))
    render(<RitmeTaulesRound flow={flow} rounds={makeTestRounds()} onNext={noop} />)
    expect(screen.queryByRole('group', { name: 'Respostes' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Batec fort 3' }))
    expect(screen.getByLabelText('Cinta de compassos')).toHaveTextContent('3')
    await userEvent.click(screen.getByRole('button', { name: 'Batec fort final' }))
    expect(screen.getByText('Quin número cau al compàs 2?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Resposta 6' }))
    await waitFor(() => expect(flow.answer).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole('button', { name: /Següent/ })).toBeInTheDocument()
  })

  it('a weak beat is only a kind nudge, never an answer', async () => {
    const flow = makeTestFlow(mul(2, 4))
    render(<RitmeTaulesRound flow={flow} rounds={makeTestRounds()} onNext={noop} />)
    await userEvent.click(screen.getByRole('button', { name: 'Batec suau 2' }))
    expect(screen.getByText(/batec suau/i)).toBeInTheDocument()
    expect(flow.answer).not.toHaveBeenCalled()
  })

  it('goes straight to the question in the abstract stage', () => {
    render(<RitmeTaulesRound flow={makeTestFlow(mul(4, 5, 'abstracte'))} rounds={makeTestRounds()} onNext={noop} />)
    expect(screen.getByRole('group', { name: 'Respostes' })).toBeInTheDocument()
  })

  it('shows facts with a 1 as a plain question', () => {
    render(<RitmeTaulesRound flow={makeTestFlow(mul(1, 5))} rounds={makeTestRounds()} onNext={noop} />)
    expect(screen.getByRole('group', { name: 'Respostes' })).toBeInTheDocument()
  })

  it('divides by counting bars', async () => {
    const item: Item = { ...mul(2, 3), id: 'd', skillId: 'C7', text: '6 : 3 = ?', answer: '2', choices: [{ value: '2' }, { value: '3' }], operands: { a: 6, b: 3, op: ':' } }
    render(<RitmeTaulesRound flow={makeTestFlow(item)} rounds={makeTestRounds()} onNext={noop} />)
    await userEvent.click(screen.getByRole('button', { name: 'Batec fort 3' }))
    await userEvent.click(screen.getByRole('button', { name: 'Batec fort 6' }))
    expect(screen.getByText('Quants compassos de 3 hi ha fins al 6?')).toBeInTheDocument()
  })
})
