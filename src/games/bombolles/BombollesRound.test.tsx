import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { makeTestFlow, makeTestItem, makeTestRounds } from '../shared/testUtils'
import { BombollesRound } from './BombollesRound'
import { parseBubbleTask } from './bubbleField'

function setup(factKey: string) {
  const item = makeTestItem('A5', factKey)
  const flow = makeTestFlow(item)
  const rounds = makeTestRounds()
  const task = parseBubbleTask(item)!
  render(<BombollesRound flow={flow} rounds={rounds} onNext={() => undefined} task={task} />)
  return { flow, rounds, task, item }
}

describe('BombollesRound', () => {
  it('merges the right pair into a star and records the correct answer', async () => {
    const { flow, rounds, task, item } = setup('c10:7')
    // The highlighted bubble is pre-selected; tap its friend.
    const friendBubbles = screen.getAllByRole('button', { name: `Bombolla ${task.friend}` })
    await userEvent.click(friendBubbles[0]!)
    await waitFor(() => expect(flow.answer).toHaveBeenCalledWith({ value: item.answer }))
    expect(rounds.register).toHaveBeenCalled()
    expect(await screen.findByText(/fan 10/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Següent/ })).toBeInTheDocument()
  })

  it('treats a wrong pair as a gentle miss and keeps the bubbles', async () => {
    const { flow, task } = setup('c10:7')
    const decoy = screen
      .getAllByRole('button', { name: /^Bombolla/ })
      .find((b) => ![String(task.a), String(task.friend)].some((v) => b.getAttribute('aria-label') === `Bombolla ${v}`))!
    await userEvent.click(decoy)
    await waitFor(() => expect(flow.answer).toHaveBeenCalledTimes(1))
    expect(flow.answer.mock.calls[0]?.[0].value).toMatch(/^\d+\+\d+$/)
    expect(screen.getAllByRole('button', { name: /^Bombolla/ }).length).toBeGreaterThanOrEqual(5)
    expect(screen.queryByRole('button', { name: /Següent/ })).toBeNull()
  })
})
