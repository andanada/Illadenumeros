import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { CpaStage, Item, VisualModel } from '../../core/ambit/types'
import { makeTestFlow, makeTestRounds } from '../shared/testUtils'
import { PastisRound } from './PastisRound'

const make = (skillId: string, text: string, answer: string, hintVisual: VisualModel, cpaStage: CpaStage = 'concret'): Item => ({
  id: `p-${skillId}-${text}-${cpaStage}`,
  skillId,
  text,
  speech: text,
  answer,
  choices: [{ value: answer }, { value: 'x1' }, { value: 'x2' }],
  visual: cpaStage === 'abstracte' ? { kind: 'none' } : hintVisual,
  hintVisual,
  hints: ['Pista 1', 'Pista 2', 'Solució'],
  cpaStage,
})

const collection = (stage: CpaStage = 'concret'): Item =>
  make('D7', 'Quant és ¾ de 12?', '9', { kind: 'fraction', parts: 4, selected: 3, collection: 12 }, stage)
const whole = (): Item => make('C8', 'Quina part està pintada?', '3/4', { kind: 'fraction', parts: 4, selected: 3 })
const equivalent = (): Item => make('E9', '2/3 = ?/6', '4', { kind: 'fraction', parts: 3, selected: 2 })

const noop = (): void => undefined
const render1 = (item: Item, hint: 0 | 1 | 2 | 3 = 0) => {
  const flow = makeTestFlow(item, hint)
  render(<PastisRound flow={flow} rounds={makeTestRounds()} onNext={noop} />)
  return flow
}
const answers = () => screen.queryByRole('group', { name: 'Respostes' })

describe('PastisRound: fraction of a collection', () => {
  it('asks to share the cupcakes, then paint the groups, before the answers appear', async () => {
    const flow = render1(collection())
    expect(answers()).toBeNull()
    expect(screen.getByText('Reparteix en 4 grups iguals')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Reparteix' }))
    expect(screen.getByText('Toca 3 grups per pintar-los')).toBeInTheDocument()
    expect(answers()).toBeNull()

    for (const n of [1, 2, 3]) await userEvent.click(screen.getByRole('button', { name: new RegExp(`^Grup ${n}:`) }))
    expect(screen.getByText('3 grups de 3 = 9')).toBeInTheDocument()

    await userEvent.click(await screen.findByRole('button', { name: 'Resposta 9' }))
    await waitFor(() => expect(flow.answer).toHaveBeenCalledTimes(1))
    expect(flow.answer.mock.calls[0]?.[0].value).toBe('9')
    expect(await screen.findByRole('button', { name: /Següent/ })).toBeInTheDocument()
  })

  it('lets a group be un-painted again', async () => {
    render1(collection())
    await userEvent.click(screen.getByRole('button', { name: 'Reparteix' }))
    const first = screen.getByRole('button', { name: /^Grup 1:/ })
    await userEvent.click(first)
    expect(first).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(first)
    expect(first).toHaveAttribute('aria-pressed', 'false')
  })

  it('is already shared and painted in the pictorial stage', () => {
    render1(collection('pictoric'))
    expect(screen.getByText('3 grups de 3 = 9')).toBeInTheDocument()
    expect(answers()).not.toBeNull()
  })

  it('hides the cake in the abstract stage until it is asked for, which counts as a hint', async () => {
    const flow = render1(collection('abstracte'))
    expect(screen.queryByRole('group', { name: /magdalenes repartides/ })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Mostra el pastís' }))
    expect(flow.markHint).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('group', { name: /magdalenes repartides en 4 grups/ })).toBeInTheDocument()
  })

  it('shows the finished sharing when the solution is revealed', () => {
    render1(collection(), 3)
    expect(screen.getByText('3 grups de 3 = 9')).toBeInTheDocument()
  })
})

describe('PastisRound: whole cake', () => {
  it('counts the painted slices touched and keeps the answers available', async () => {
    render1(whole())
    expect(answers()).not.toBeNull()
    expect(screen.getByText('Toca els trossos pintats per comptar-los')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tros 1 de 4, pintat' }))
    await userEvent.click(screen.getByRole('button', { name: 'Tros 2 de 4, pintat' }))
    expect(screen.getByText('2 de 4 trossos')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Tros 4 de 4/ })).toBeNull()
  })

  it('slices answer to the keyboard', async () => {
    render1(whole())
    screen.getByRole('button', { name: 'Tros 1 de 4, pintat' }).focus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByText('1 de 4 trossos')).toBeInTheDocument()
    await userEvent.keyboard(' ')
    expect(screen.getByText('Toca els trossos pintats per comptar-los')).toBeInTheDocument()
  })
})

describe('PastisRound: equivalent fractions', () => {
  it('cuts the slices in more pieces with the same painted part', async () => {
    render1(equivalent())
    expect(screen.getByText('2/3')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Més trossos' }))
    expect(screen.getByText('4/6')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Un pastís tallat en 6 trossos iguals, amb 4 pintats' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Menys trossos' }))
    expect(screen.getByText('2/3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Menys trossos' })).toBeDisabled()
  })

  it('jumps to the target denominator once a hint is shown', () => {
    render1(equivalent(), 1)
    expect(screen.getByText('4/6')).toBeInTheDocument()
  })
})

describe('PastisRound: plain', () => {
  it('shows only the choices when there is nothing to draw', () => {
    render1(make('E9', 'Simplifica 25/30.', '5/6', { kind: 'none' }))
    expect(answers()).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Reparteix' })).toBeNull()
  })
})
