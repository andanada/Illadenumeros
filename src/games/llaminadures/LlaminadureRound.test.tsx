import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { CpaStage, Item } from '../../core/ambit/types'
import { makeTestFlow, makeTestRounds } from '../shared/testUtils'
import { LlaminadureRound } from './LlaminadureRound'

const makeItem = (total: number, groups: number, cpaStage: CpaStage = 'concret'): Item => {
  const q = Math.floor(total / groups)
  return {
    id: `d-${total}-${groups}-${cpaStage}`,
    skillId: 'C6',
    text: `${total} : ${groups} = ?`,
    speech: '',
    answer: String(q),
    choices: [{ value: String(q) }, { value: String(q + 1) }, { value: String(q + 2) }],
    visual: { kind: 'share', total, groups },
    hintVisual: { kind: 'share', total, groups },
    hints: ['Reparteix un a un', 'Cada plat el mateix', `${q} a cada plat`],
    cpaStage,
    operands: { a: total, b: groups, op: ':' },
  }
}

const noop = (): void => undefined

describe('LlaminadureRound', () => {
  it('deals candies one by one, keeps it fair and shows the leftover', async () => {
    const flow = makeTestFlow(makeItem(7, 3))
    render(<LlaminadureRound flow={flow} rounds={makeTestRounds()} onNext={noop} />)

    expect(screen.queryByRole('group', { name: 'Respostes' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /^Plat 1:/ }))
    // A second candy on the same plate is not fair yet.
    await userEvent.click(screen.getByRole('button', { name: /^Plat 1: 1 llaminadures/ }))
    expect(screen.getByText('Un a cada plat! Prova en un altre plat')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Plat 2:/ }))
    await userEvent.click(screen.getByRole('button', { name: /^Plat 3:/ }))
    for (let i = 0; i < 3; i++) await userEvent.click(screen.getAllByRole('button', { name: /^Llaminadura/ })[0]!)

    expect(screen.getByRole('group', { name: 'Sobren 1 llaminadures' })).toBeInTheDocument()
    expect(await screen.findByRole('group', { name: 'Respostes' })).toBeInTheDocument()
  })

  it('answers after sharing everything', async () => {
    const flow = makeTestFlow(makeItem(6, 3))
    render(<LlaminadureRound flow={flow} rounds={makeTestRounds()} onNext={noop} />)
    for (let i = 0; i < 6; i++) await userEvent.click(screen.getAllByRole('button', { name: /^Llaminadura/ })[0]!)
    await userEvent.click(await screen.findByRole('button', { name: 'Resposta 2' }))
    await waitFor(() => expect(flow.answer).toHaveBeenCalledTimes(1))
    expect(flow.answer.mock.calls[0]?.[0].value).toBe('2')
    expect(await screen.findByRole('button', { name: /Següent/ })).toBeInTheDocument()
  })

  it('hides the plates in the abstract stage until requested', async () => {
    const flow = makeTestFlow(makeItem(8, 4, 'abstracte'))
    render(<LlaminadureRound flow={flow} rounds={makeTestRounds()} onNext={noop} />)
    expect(screen.queryAllByRole('button', { name: /^Plat/ })).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Mostra els plats' }))
    expect(flow.markHint).toHaveBeenCalledTimes(1)
    expect(screen.getAllByRole('button', { name: /^Plat/ })).toHaveLength(4)
  })
})
