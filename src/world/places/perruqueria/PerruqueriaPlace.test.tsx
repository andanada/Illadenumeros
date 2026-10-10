import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress } from '../../../core/progress/store'
import type { MatesDb } from '../../../core/storage/db'
import { activateTestPlayer } from '../../../test/playerDb'
import PerruqueriaPlace from './PerruqueriaPlace'

// Many taps per test: a loaded machine (the whole suite in parallel) needs more than the default 5 s.
vi.setConfig({ testTimeout: 40_000 })

let db: MatesDb

beforeEach(() => {
  db = activateTestPlayer()
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }))
})
afterEach(() => vi.unstubAllGlobals())

const q = (selector: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(selector)
  if (!el) throw new Error(`No trobo ${selector}`)
  return el
}
const tool = (id: string): HTMLElement => q(`[data-uid="eina-${id}"]`)
const spot = (id: string): HTMLElement => q(`[data-surface="${id}"]`)
const request = (): string => screen.getByTestId('errand-request').textContent ?? ''

function renderSalon(opts: { pending?: number; skillId?: string; onSolved?: () => void } = {}) {
  const onSolved = opts.onSolved ?? vi.fn()
  render(<PerruqueriaPlace pending={opts.pending ?? 1} callSignal={0} onSolved={onSolved} onExit={vi.fn()} {...(opts.skillId ? { forced: { skillId: opts.skillId } } : {})} />)
  return onSolved
}

/** Takes a tool and puts it down on the customer's chair. */
async function useOnChair(name: string, chair = 'eina-cadira-1'): Promise<void> {
  await userEvent.click(tool(name))
  await waitFor(() => expect(q('[data-actor="laia"]')).toHaveAccessibleName(/porta/))
  await userEvent.click(spot(chair))
  await waitFor(() => expect(q('[data-actor="laia"]')).not.toHaveAccessibleName(/porta/))
}

const status = (): HTMLElement => screen.getAllByRole('status').find((s) => s.className.includes('sr-only')) as HTMLElement

describe('Perruqueria: free play', () => {
  it('has two chairs, a basin, a sofa, the stylist, and the asking customer sits in chair 1', () => {
    renderSalon()
    expect(screen.getByRole('region', { name: 'La Perruqueria' })).toBeInTheDocument()
    expect(q('[data-actor="la-nuria"]')).toBeInTheDocument()
    for (const seat of ['cadira-1', 'cadira-2', 'rentapaus', 'sofa-1', 'sofa-2']) expect(q(`[data-seat="${seat}"]`)).toBeInTheDocument()
    expect(q('[data-actor="la-fatima"]')).toHaveAttribute('data-mode', 'sitting')
    expect(screen.getByTestId('mirall')).toHaveAccessibleName(/La Fàtima/)
  })

  it('uses the tools in a chain: out of order only says what comes first, in order the customer reacts', async () => {
    renderSalon()
    await useOnChair('tisores')
    await waitFor(() => expect(status()).toHaveTextContent('Abans toca pentinar-lo'))
    await useOnChair('dutxa')
    await waitFor(() => expect(status()).toHaveTextContent('Quina aigua més bona'))
    await useOnChair('pinta')
    await useOnChair('tisores')
    await waitFor(() => expect(status()).toHaveTextContent('Cris, cris'))
    expect(document.querySelector('[data-actor="la-fatima"] [data-emote]')).not.toBeNull()
  })

  it('the mirror shows the new look after the last step', async () => {
    renderSalon()
    const before = q('[data-testid="mirall"]').innerHTML
    for (const t of ['dutxa', 'pinta', 'tisores', 'esprai']) await useOnChair(t)
    await waitFor(() => expect(q('[data-testid="mirall"]').innerHTML).not.toBe(before))
  })

  it('a tool on an empty chair says there is nobody, nothing breaks', async () => {
    renderSalon()
    await useOnChair('dutxa', 'eina-cadira-2')
    await waitFor(() => expect(status()).toHaveTextContent('No hi ha ningú'))
  })

  it('the child can sit another character on the sofa with the keyboard path (select + seat)', async () => {
    renderSalon()
    await userEvent.click(screen.getByRole('button', { name: 'Mou la Núria' }))
    await userEvent.click(q('[data-seat="sofa-1"]'))
    await waitFor(() => expect(q('[data-actor="la-nuria"]')).toHaveAttribute('data-mode', 'sitting'))
  })
})

describe('Perruqueria: the clips wish', () => {
  it('two groups of clips, solved by tap-to-place: attempt recorded, coins', async () => {
    const onSolved = renderSalon({ skillId: 'A7' })
    await userEvent.click(await screen.findByRole('button', { name: /toca per atendre/ }))
    const sheet = screen.getByRole('region', { name: /^Encàrrec a la Perruqueria: / })
    expect(sheet).toHaveAttribute('data-errand-kind', 'pinces')
    const m = /: (\d+) \+ (\d+)\./.exec(request())
    if (!m) throw new Error(`Encàrrec inesperat: ${request()}`)
    const total = Number(m[1]) + Number(m[2])
    for (let i = 0; i < total; i++) {
      await userEvent.click(sheet.querySelector<HTMLElement>('[data-prop-kind="pinca-caixa"]') as HTMLElement)
      await userEvent.click(screen.getByRole('button', { name: 'Posa-ho a la safata' }))
    }
    expect(screen.getByRole('img', { name: new RegExp(`^Safata: ${total} pinc`) })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ja està!' }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
    expect(await db.attempts.toArray()).toHaveLength(1)
    expect(useProgress.getState().rewards.petals).toBe(3)
    await userEvent.click(screen.getByRole('button', { name: 'Adéu!' }))
    expect(screen.queryByTestId('errand-request')).toBeNull()
  })

  it('ignoring is fine: «Ara no» records nothing', async () => {
    renderSalon({ skillId: 'A7' })
    await userEvent.click(await screen.findByRole('button', { name: /toca per atendre/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Ara no' }))
    expect(await db.attempts.count()).toBe(0)
  })
})
