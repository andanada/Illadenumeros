import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { makeTestFlow, makeTestItem, makeTestRounds } from '../shared/testUtils'
import { MarcMagicRound } from './MarcMagicRound'

describe('MarcMagicRound', () => {
  it('requires building the operation in the concrete stage before answering', async () => {
    const item = makeTestItem('A4', 'add:2+3')
    const { a, b } = item.operands!
    const flow = makeTestFlow(item)
    render(<MarcMagicRound flow={flow} rounds={makeTestRounds()} onNext={() => undefined} />)

    expect(screen.queryByRole('group', { name: 'Respostes' })).toBeNull()
    for (let i = 0; i < a + b; i++) {
      await userEvent.click(screen.getAllByRole('button', { name: /^Fitxa/ })[0]!)
    }
    const choice = await screen.findByRole('button', { name: `Resposta ${item.answer}` })
    await userEvent.click(choice)
    await waitFor(() => expect(flow.answer).toHaveBeenCalledTimes(1))
    expect(flow.answer.mock.calls[0]?.[0].value).toBe(item.answer)
    expect(await screen.findByRole('button', { name: /Següent/ })).toBeInTheDocument()
  })

  it('shows pre-filled frames and answers directly in the pictorial stage', async () => {
    const item = makeTestItem('A4', 'add:3+4', 'pictoric')
    const flow = makeTestFlow(item)
    render(<MarcMagicRound flow={flow} rounds={makeTestRounds()} onNext={() => undefined} />)
    expect(screen.queryAllByRole('button', { name: /^Fitxa/ })).toHaveLength(0)
    expect(screen.getAllByRole('button', { name: /amb fitxa/ })).toHaveLength(7)
    expect(screen.getByRole('group', { name: 'Respostes' })).toBeInTheDocument()
  })

  it('hides the frame in the abstract stage until requested', async () => {
    const item = makeTestItem('A4', 'add:3+4', 'abstracte')
    render(<MarcMagicRound flow={makeTestFlow(item)} rounds={makeTestRounds()} onNext={() => undefined} />)
    expect(screen.queryAllByRole('button', { name: /amb fitxa/ })).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Mostra el marc' }))
    expect(screen.getAllByRole('button', { name: /amb fitxa/ })).toHaveLength(7)
  })
})
