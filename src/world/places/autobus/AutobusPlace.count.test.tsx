import { configure, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Item } from '../../../core/ambit/types'
import { activateTestPlayer } from '../../../test/playerDb'
import AutobusPlace from './AutobusPlace'

vi.setConfig({ testTimeout: 30_000 })
configure({ asyncUtilTimeout: 6000 })

const { submit } = vi.hoisted(() => ({ submit: vi.fn() }))

// «a + ? = t» with big numbers never comes out of the generators of the bus skills, so the item is injected here.
const COUNT_ITEM = {
  id: 'count-1',
  skillId: 'B5',
  text: '30 + ? = 37',
  speech: '',
  answer: '7',
  choices: [{ value: '7' }, { value: '6' }, { value: '8' }],
  visual: { kind: 'none' },
  hintVisual: { kind: 'none' },
  hints: ['a', 'b', 'c'],
  cpaStage: 'abstracte',
  operands: { a: 30, b: 7, op: '+' },
} as unknown as Item

vi.mock('../../errands/useErrand', async (original) => {
  const real = await original<typeof import('../../errands/useErrand')>()
  return { ...real, useErrand: (o: Parameters<typeof real.useErrand>[0]) => ({ ...real.useErrand(o), item: COUNT_ITEM, submit }) }
})

beforeEach(() => {
  activateTestPlayer()
  submit.mockClear()
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }))
})
afterEach(() => vi.unstubAllGlobals())

async function driveStops(n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    await userEvent.click(screen.getByRole('button', { name: 'Endavant 1 parada' }))
    await waitFor(() => expect(screen.getByTestId('road-bus')).toHaveAttribute('data-driving', 'false'))
  }
}

describe('AutobusPlace: «quantes parades» is played by driving', () => {
  it('drives to the friend’s stop and opening the doors there answers with the stops driven', async () => {
    render(<AutobusPlace pending={1} callSignal={0} onSolved={vi.fn()} onExit={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /necessita ajuda a l’autobús/ }))
    expect(screen.getByRole('region', { name: /^Encàrrec a l’Autobús: / })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('road-bus')).toHaveAttribute('data-stop', '30'))
    // The friend waits at 37 once it is on the strip.
    await driveStops(7)
    expect(screen.getByTestId('road-bus')).toHaveAttribute('data-stop', '37')
    await userEvent.click(screen.getByRole('button', { name: /Obre les portes/ }))
    expect(submit).toHaveBeenCalledWith({ value: '7' })
  })

  it('stopping short is only a different number, never a red cross', async () => {
    render(<AutobusPlace pending={1} callSignal={0} onSolved={vi.fn()} onExit={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /necessita ajuda a l’autobús/ }))
    await driveStops(3)
    await userEvent.click(screen.getByRole('button', { name: /Obre les portes/ }))
    expect(submit).toHaveBeenCalledWith({ value: '3' })
    expect(screen.queryByText(/✕|❌/)).toBeNull()
  })

  it('the friend is marked on the strip while she is within reach', async () => {
    render(<AutobusPlace pending={1} callSignal={0} onSolved={vi.fn()} onExit={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /necessita ajuda a l’autobús/ }))
    await driveStops(2)
    expect(screen.getByTestId('road-mark')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /La teva amiga espera a la parada 37/ })).toBeInTheDocument()
  })
})
