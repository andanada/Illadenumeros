import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Anchor } from './Anchor'
import { Playground } from './Playground'

function mockReducedMotion(reduce: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
  }))
}

const actor = (id: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-actor="${id}"]`)
  if (!el) throw new Error(`Sense actor ${id}`)
  return el
}
const item = (uid: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-uid="${uid}"]`)
  if (!el) throw new Error(`Sense objecte ${uid}`)
  return el
}

beforeEach(() => mockReducedMotion(true))
afterEach(() => vi.unstubAllGlobals())

describe('Playground (reduced motion: walking is instant)', () => {
  it('shows the cast, with the child chosen, and switching works from the buttons', async () => {
    render(<Playground />)
    expect(actor('laia')).toHaveAttribute('data-selected', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Mou la Pilar' }))
    expect(actor('pilar')).toHaveAttribute('data-selected', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Ara mous la Pilar')
  })

  it('opens the fridge, takes the apple, and she carries it through the door', async () => {
    render(<Playground />)
    await userEvent.click(item('nevera'))
    await waitFor(() => expect(item('nevera')).toHaveAttribute('data-open', 'true'))
    await userEvent.click(item('poma'))
    await waitFor(() => expect(actor('laia')).toHaveAccessibleName(/porta la poma/))
    await userEvent.click(document.querySelector<HTMLElement>('[data-door="porta-jardi"]') as HTMLElement)
    await waitFor(() => expect(screen.getByRole('region', { name: 'El jardí' })).toBeInTheDocument())
    expect(actor('laia')).toHaveAccessibleName(/porta la poma/)
    expect(document.querySelector('[data-actor="pilar"]')).toBeNull()
  })

  it('a wrong tool only hints; the right one advances the fruit', async () => {
    render(<Playground />)
    await userEvent.click(item('nevera'))
    await waitFor(() => expect(item('nevera')).toHaveAttribute('data-open', 'true'))
    await userEvent.click(item('poma'))
    await waitFor(() => expect(actor('laia')).toHaveAccessibleName(/porta la poma/))
    await userEvent.click(screen.getByRole('button', { name: 'Accions' }))
    await userEvent.click(document.querySelector<HTMLElement>('[data-ring-item="deixa"]') as HTMLElement)
    await userEvent.click(item('olla'))
    await waitFor(() => expect(actor('laia')).toHaveAccessibleName(/porta l’olla/))
    await userEvent.click(item('poma'))
    expect(screen.getByRole('status')).toHaveTextContent('Prova-ho amb l’esponja')
    expect(item('poma')).toHaveAttribute('data-stage', 'crua')
  })

  it('emotes show a bubble that goes away by itself', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<Playground />)
    await userEvent.click(screen.getByRole('button', { name: 'Accions' }))
    await userEvent.click(within(screen.getByRole('group', { name: 'Accions', hidden: false })).getByRole('button', { name: 'Cor' }))
    expect(actor('laia').querySelector('[data-emote="cor"]')).not.toBeNull()
    await act(async () => void vi.advanceTimersByTime(2000))
    expect(actor('laia').querySelector('[data-emote]')).toBeNull()
    vi.useRealTimers()
  })

  it('the egg bursts on the third tap, always with the same surprise', async () => {
    render(<Playground />)
    for (let i = 0; i < 3; i++) await userEvent.click(item('ou'))
    await waitFor(() => expect(item('ou').getAttribute('aria-label')).toMatch(/amb (un pollet|una estrella|un cor)/))
  })
})

describe('Anchor', () => {
  it('is a named button that reports taps', async () => {
    const onActivate = vi.fn()
    render(
      <div className="relative">
        <Anchor at={{ x: 0.5, y: 0.5 }} state="waiting" number={7} label="La Pilar vol 7 magdalenes" onActivate={onActivate} />
      </div>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'La Pilar vol 7 magdalenes' }))
    expect(onActivate).toHaveBeenCalledTimes(1)
  })

  it('done shows a tick and renders nothing without an actor or a point', () => {
    const { container, rerender } = render(<Anchor at={{ x: 0.2, y: 0.2 }} state="done" label="Fet" onActivate={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Fet' })).toHaveAttribute('data-anchor', 'done')
    rerender(<Anchor state="calm" label="Res" onActivate={() => undefined} />)
    expect(container).toBeEmptyDOMElement()
  })
})
