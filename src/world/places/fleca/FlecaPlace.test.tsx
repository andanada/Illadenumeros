import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress } from '../../../core/progress/store'
import type { MatesDb } from '../../../core/storage/db'
import { activateTestPlayer } from '../../../test/playerDb'
import { findSeed, pin, unpin } from '../shared/doing/seedFinder.testutil'
import FlecaPlace from './FlecaPlace'
import { FLECA_SKILLS } from './flecaSkills'
import { playOf } from './tasks/flecaTasks'

vi.setConfig({ testTimeout: 60_000 })

let db: MatesDb

beforeEach(() => {
  db = activateTestPlayer()
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }))
})
afterEach(() => vi.unstubAllGlobals())

const q = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel)
  if (!el) throw new Error(`Sense ${sel}`)
  return el
}
const uid = (id: string): HTMLElement => q(`[data-uid="${id}"]`)
const door = (id: string): HTMLElement => q(`[data-door="${id}"]`)
const avatar = (): HTMLElement => q('[data-actor="laia"]')
const words = (): string => screen.getByTestId('errand-request').textContent ?? ''
/** A loose product of the pile (not inside a box, not in a frame). */
const pileThing = (): HTMLElement => q('[data-uid*="~"]:not([data-in])')
const carry = async (el: HTMLElement): Promise<void> => {
  await userEvent.click(el)
  await waitFor(() => expect(avatar()).toHaveAccessibleName(/porta/))
}
const zone = (id: string): HTMLElement => q(`[data-zone="${id}"]`)

function renderFleca(opts: { pending?: number; skillId?: string; onSolved?: () => void } = {}) {
  const onSolved = opts.onSolved ?? vi.fn()
  render(<FlecaPlace pending={opts.pending ?? 1} callSignal={0} onSolved={onSolved} onExit={vi.fn()} {...(opts.skillId ? { forced: { skillId: opts.skillId } } : {})} />)
  return onSolved
}

const goTo = async (doorId: string, region: string): Promise<void> => {
  await userEvent.click(door(doorId))
  await waitFor(() => expect(screen.getByRole('region', { name: region })).toBeInTheDocument())
}

describe('Fleca: free play', () => {
  it('shows the shop with a customer waiting with a bubble', async () => {
    renderFleca()
    expect(screen.getByRole('region', { name: 'La botiga de la fleca' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /toca per atendre/ })).toHaveAttribute('data-anchor', 'waiting')
  })

  it('kneads, shapes and bakes: dough in the oven comes out hot, on the rack it is finished', async () => {
    renderFleca({ pending: 0 })
    await goTo('porta-obrador', 'L’obrador')
    await goTo('porta-farina', 'El magatzem de farina')
    await userEvent.click(uid('caixa-massa'))
    await waitFor(() => expect(uid('caixa-massa')).toHaveAttribute('data-open', 'true'))
    await carry(q('[data-def="pasta-croissant"]'))
    await goTo('porta-obrador', 'L’obrador')
    await userEvent.click(q('[data-zone-drop="forn"]'))
    await waitFor(() => expect(document.querySelector('[data-in="forn"][data-def="croissant-calent"]')).not.toBeNull(), { timeout: 4000 })
    await carry(q('[data-in="forn"]'))
    await userEvent.click(q('[data-zone-drop="reixa"]'))
    await waitFor(() => expect(document.querySelector('[data-in="reixa"][data-def="croissant"]')).not.toBeNull())
  })

  it('the street door takes the child out', async () => {
    const onExit = vi.fn()
    render(<FlecaPlace pending={0} callSignal={0} onSolved={vi.fn()} onExit={onExit} />)
    await userEvent.click(door('porta-fora'))
    await waitFor(() => expect(onExit).toHaveBeenCalled())
  })
})

describe('Fleca: requests', () => {
  it('rows on a tray: the boxes are laid out by hand, record an attempt and pay coins', async () => {
    const onSolved = renderFleca({ skillId: 'C3' })
    await userEvent.click(await screen.findByRole('button', { name: /toca per atendre/ }))
    const sheet = screen.getByRole('region', { name: /^Encàrrec a la Fleca: / })
    expect(sheet).toHaveAttribute('data-errand-kind', 'safata')
    const m = /Vull (\d+) caix\w+ de (\d+)/.exec(words())
    if (!m) throw new Error(`Encàrrec inesperat: ${words()}`)
    const total = Number(m[1]) * Number(m[2])
    expect(zone('safata')).toHaveAttribute('data-count', '0')
    for (let i = 0; i < total; i++) {
      await carry(pileThing())
      await userEvent.click(q('[data-zone-drop="safata"]'))
      await waitFor(() => expect(zone('safata')).toHaveAttribute('data-count', String(i + 1)))
    }
    await userEvent.click(screen.getByRole('button', { name: /Comprova/ }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
    expect(await db.attempts.toArray()).toHaveLength(1)
    expect(useProgress.getState().rewards.petals).toBe(3)
    expect(screen.queryByText(/✕|❌/)).toBeNull()
  })

  it('a wrong count sends everything back to the pile with a hint (no red cross)', async () => {
    const onSolved = renderFleca({ skillId: 'C3' })
    await userEvent.click(await screen.findByRole('button', { name: /toca per atendre/ }))
    await carry(pileThing())
    await userEvent.click(q('[data-zone-drop="safata"]'))
    await waitFor(() => expect(zone('safata')).toHaveAttribute('data-count', '1'))
    await userEvent.click(screen.getByRole('button', { name: /Comprova/ }))
    await waitFor(() => expect(zone('safata')).toHaveAttribute('data-count', '0'))
    expect(onSolved).not.toHaveBeenCalled()
    expect(await screen.findByTestId('errand-hint')).toBeInTheDocument()
    expect(screen.queryByText(/✕|❌/)).toBeNull()
  })

  it('ignoring is fine: «Ara no» records nothing', async () => {
    renderFleca({ skillId: 'C3' })
    await userEvent.click(await screen.findByRole('button', { name: /toca per atendre/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Ara no' }))
    expect(await db.attempts.count()).toBe(0)
    expect(screen.queryByTestId('errand-request')).toBeNull()
  })

  it('what does not fit the room (2-digit × 1-digit) is played with the price tags', async () => {
    const onSolved = renderFleca({ skillId: 'D5' })
    await userEvent.click(await screen.findByRole('button', { name: /toca per atendre/ }))
    expect(screen.getByRole('region', { name: /^Encàrrec a la Fleca: / })).toHaveAttribute('data-errand-kind', 'fichas')
    const m = /^(\d+) × (\d+) = \?$/.exec(words())
    if (!m) throw new Error(`Encàrrec inesperat: ${words()}`)
    await userEvent.click(within(screen.getByRole('list', { name: 'Etiquetes de preu' })).getByRole('button', { name: `Resposta ${Number(m[1]) * Number(m[2])}` }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
  })
})

describe('Fleca: sharing and every skill', () => {
  it('sharing onto trays: the bake is dealt by hand and the answer is read from the trays', async () => {
    const ts = findSeed('C6', (item) => playOf(item)?.mode.kind === 'share' && item.operands !== undefined && item.operands.a <= 15)
    pin(ts)
    const onSolved = vi.fn()
    render(<FlecaPlace pending={1} callSignal={0} onSolved={onSolved} onExit={vi.fn()} forced={{ skillId: 'C6' }} />)
    unpin()
    await userEvent.click(await screen.findByRole('button', { name: /toca per atendre/ }))
    expect(screen.getByRole('region', { name: /^Encàrrec a la Fleca: / })).toHaveAttribute('data-errand-kind', 'reparteix')
    const m = /Reparteix (\d+) \S+ en (\d+) safates/.exec(words())
    if (!m) throw new Error(`Encàrrec inesperat: ${words()}`)
    const groups = Number(m[2])
    const per = Number(m[1]) / groups
    for (let g = 1; g <= groups; g++) {
      for (let k = 0; k < per; k++) {
        await carry(pileThing())
        await userEvent.click(q(`[data-zone-drop="safata-${g}"]`))
        await waitFor(() => expect(zone(`safata-${g}`)).toHaveAttribute('data-count', String(k + 1)))
      }
    }
    await userEvent.click(screen.getByRole('button', { name: /Comprova/ }))
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith(3))
  })

  it.each(FLECA_SKILLS.map((id) => [id]))('skill %s opens a request that can be played (trays or price tags)', async (skillId) => {
    const { unmount } = render(<FlecaPlace pending={1} callSignal={0} onSolved={vi.fn()} onExit={vi.fn()} forced={{ skillId }} />)
    await userEvent.click(await screen.findByRole('button', { name: /toca per atendre/ }))
    const kind = screen.getByRole('region', { name: /^Encàrrec a la Fleca: / }).getAttribute('data-errand-kind')
    expect(['safata', 'reparteix', 'fichas']).toContain(kind)
    if (kind === 'fichas') expect(screen.getByRole('list', { name: 'Etiquetes de preu' })).toBeInTheDocument()
    else expect(screen.getByRole('button', { name: /Comprova/ })).toBeDisabled()
    unmount()
  })
})
