import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { makeTestFlow, makeTestItem, makeTestRounds } from '../shared/testUtils'
import { JumpRound } from './JumpRound'
import { parseRaceTask } from './jumpLogic'

describe('JumpRound', () => {
  it('lands on the target with tens jumps and answers it automatically', async () => {
    const item = makeTestItem('B4', undefined, 'concret', 'jump')
    const task = parseRaceTask(item)
    if (task?.kind !== 'jump') throw new Error('expected a jump task')
    const flow = makeTestFlow(item)
    render(<JumpRound flow={flow} rounds={makeTestRounds()} onNext={() => undefined} start={task.start} target={task.target} tipSeen={{ current: false }} />)

    const tens = (task.target - task.start) / 10
    for (let i = 0; i < tens; i++) await userEvent.click(screen.getByRole('button', { name: 'Salta 10 endavant' }))
    await waitFor(() => expect(flow.answer).toHaveBeenCalledWith({ value: String(task.target) }), { timeout: 3000 })
    expect(await screen.findByText(/Camí perfecte/)).toBeInTheDocument()
  })

  it('lets her undo a jump and confirm a wrong landing as a wrong value', async () => {
    const item = makeTestItem('B4', undefined, 'concret', 'jump')
    const task = parseRaceTask(item)
    if (task?.kind !== 'jump') throw new Error('expected a jump task')
    const flow = makeTestFlow(item)
    render(<JumpRound flow={flow} rounds={makeTestRounds()} onNext={() => undefined} start={task.start} target={task.target} tipSeen={{ current: false }} />)

    await userEvent.click(screen.getByRole('button', { name: 'Salta 1 endavant' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salta 1 endavant' }))
    await userEvent.click(screen.getByRole('button', { name: /Torna enrere/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Ja hi sóc' }))
    await waitFor(() => expect(flow.answer).toHaveBeenCalledWith({ value: String(task.start + 1) }))
    expect(screen.queryByRole('button', { name: /Següent/ })).toBeNull()
  })
})
