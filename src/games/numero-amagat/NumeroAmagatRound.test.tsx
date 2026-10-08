import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Item } from '../../core/ambit/types'
import { makeTestFlow, makeTestRounds } from '../shared/testUtils'
import { NumeroAmagatRound } from './NumeroAmagatRound'

const item = (text: string, answer: number, wrong: number[]): Item => ({
  id: `n-${text}`,
  skillId: 'A10',
  text,
  speech: text,
  answer: String(answer),
  choices: [answer, ...wrong].map((v) => ({ value: String(v) })),
  visual: { kind: 'none' },
  hintVisual: { kind: 'dots', groups: [3, answer] },
  hints: ['Mira la balança', 'Compta', 'Solució'],
  cpaStage: 'concret',
})

const noop = (): void => undefined
const scale = () => screen.getByRole('img', { name: /^La balança/ })

describe('NumeroAmagatRound', () => {
  it('starts tilted towards the full pan and balances with the right weight', async () => {
    const flow = makeTestFlow(item('? + 3 = 8', 5, [4, 6, 11]))
    render(<NumeroAmagatRound flow={flow} rounds={makeTestRounds()} onNext={noop} />)
    expect(scale()).toHaveAccessibleName(/pesa més a la dreta/)

    await userEvent.click(screen.getByRole('button', { name: 'Resposta 5' }))
    await waitFor(() => expect(flow.answer).toHaveBeenCalledTimes(1))
    expect(flow.answer.mock.calls[0]?.[0].value).toBe('5')
    expect(scale()).toHaveAccessibleName(/en equilibri/)
    expect(await screen.findByRole('button', { name: /Següent/ })).toBeInTheDocument()
  })

  it('shows a too-heavy weight tipping the scale, then gives it back', async () => {
    const flow = makeTestFlow(item('? × 4 = 28', 7, [6, 8, 24]))
    render(<NumeroAmagatRound flow={flow} rounds={makeTestRounds()} onNext={noop} />)
    await userEvent.click(screen.getByRole('button', { name: 'Resposta 8' }))
    expect(scale()).toHaveAccessibleName(/pesa més a l’esquerra/)
    expect(screen.queryByRole('button', { name: /Següent/ })).toBeNull()
    // The weight returns to the tray and the pan is empty again.
    await waitFor(() => expect(scale()).toHaveAccessibleName(/pesa més a la dreta/), { timeout: 3000 })
  })

  it('weights are plain buttons, so Enter works as the keyboard alternative to dragging', async () => {
    const flow = makeTestFlow(item('9 − ? = 4', 5, [4, 13, 6]))
    render(<NumeroAmagatRound flow={flow} rounds={makeTestRounds()} onNext={noop} />)
    screen.getByRole('button', { name: 'Resposta 5' }).focus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(flow.answer).toHaveBeenCalledTimes(1))
  })

  it('shows the solution on the scale after the last hint', () => {
    const flow = makeTestFlow(item('36 : ? = 9', 4, [3, 5, 27]), 3)
    render(<NumeroAmagatRound flow={flow} rounds={makeTestRounds()} onNext={noop} />)
    expect(scale()).toHaveAccessibleName(/en equilibri/)
  })

  it('shows the hint picture after the first mistake', () => {
    const flow = makeTestFlow(item('? + 3 = 8', 5, [4, 6, 11]), 1)
    render(<NumeroAmagatRound flow={flow} rounds={makeTestRounds()} onNext={noop} />)
    expect(screen.getByRole('group', { name: 'Grups de fitxes: 3 i 5' })).toBeInTheDocument()
  })

  it('falls back to plain answer bubbles for an item it cannot draw', async () => {
    const flow = makeTestFlow(item('Quin número s’amaga?', 5, [4, 6, 11]))
    render(<NumeroAmagatRound flow={flow} rounds={makeTestRounds()} onNext={noop} />)
    expect(screen.queryByRole('img', { name: /^La balança/ })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Resposta 5' }))
    await waitFor(() => expect(flow.answer).toHaveBeenCalledTimes(1))
  })
})
