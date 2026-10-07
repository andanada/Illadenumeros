import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Item } from '../../core/ambit/types'
import { makeTestFlow, makeTestRounds } from '../shared/testUtils'
import { BotigaRound } from './BotigaRound'

const payItem: Item = {
  id: 'b-pay',
  skillId: 'C9',
  text: 'Costa 3,50 €. Paga amb 5 €. Dóna el canvi.',
  speech: '',
  answer: '1,50 €',
  choices: [{ value: '1,50 €' }, { value: '2 €' }, { value: '1 €' }],
  visual: { kind: 'money', coins: [500] },
  hintVisual: { kind: 'none' },
  hints: ['Compta des de 3,50 €', 'Fins a 4 € són 50 cts', 'El canvi és 1,50 €'],
  cpaStage: 'concret',
}
const choiceItem: Item = { ...payItem, id: 'b-choice', text: 'Quant és el canvi?', cpaStage: 'pictoric' }
const noop = (): void => undefined

describe('BotigaRound', () => {
  it('builds the change on the counter and confirms with the right total', async () => {
    const flow = makeTestFlow(payItem)
    render(<BotigaRound flow={flow} rounds={makeTestRounds()} onNext={noop} />)
    expect(screen.queryByRole('group', { name: 'Respostes' })).toBeNull()

    await userEvent.click(screen.getAllByRole('button', { name: /^Moneda de 1 €/ })[0]!)
    await userEvent.click(screen.getAllByRole('button', { name: /^Moneda de 50 cts/ })[0]!)
    expect(screen.getByLabelText('Total: 1,50 €')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ja està!' }))
    await waitFor(() => expect(flow.answer).toHaveBeenCalledTimes(1))
    expect(flow.answer.mock.calls[0]?.[0].value).toBe('1,50 €')
    expect(await screen.findByRole('button', { name: /Següent/ })).toBeInTheDocument()
  })

  it('lets the child remove a piece and sends a wrong total kindly', async () => {
    const flow = makeTestFlow(payItem)
    render(<BotigaRound flow={flow} rounds={makeTestRounds()} onNext={noop} />)
    await userEvent.click(screen.getByRole('button', { name: /^Moneda de 2 €/ }))
    expect(screen.getByText(/És massa/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ja està!' }))
    await waitFor(() => expect(flow.answer).toHaveBeenCalledTimes(1))
    expect(flow.answer.mock.calls[0]?.[0].value).toBe('2 €')
    await userEvent.click(screen.getByRole('button', { name: 'Treu 2 €' }))
    expect(screen.getByText('Taulell buit')).toBeInTheDocument()
  })

  it('falls back to choices with the money visual for plain questions', () => {
    render(<BotigaRound flow={makeTestFlow(choiceItem)} rounds={makeTestRounds()} onNext={noop} />)
    expect(screen.getByRole('img', { name: /Total: 5 €|Monedes i bitllets: 5 €/ })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Respostes' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Cartera' })).toBeNull()
  })
})
