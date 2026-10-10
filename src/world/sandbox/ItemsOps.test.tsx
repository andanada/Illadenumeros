import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Choice, Item } from '../../core/ambit/types'
import { defaultAvatar } from '../characters'
import { CastProvider, useCast, type CastApi } from './CastContext'
import { ItemsProvider, useItems, useZoneCount, type ItemsApi } from './ItemsContext'
import { PLAY_DEFS } from './playItems'
import { Stage } from './Stage'
import { ActorSwitcher } from './ActorSwitcher'
import { useRequestTask, type RequestTask, type TaskErrand } from './useRequestTask'
import type { ChangeEvent, ZoneDef } from './zoneTypes'

const SEEDS = [
  { id: 'laia', kind: 'avatar', name: 'la Laia', at: { x: 0.45, y: 0.84 }, avatar: defaultAvatar('nyx', 'rosa') },
  { id: 'pilar', kind: 'neighbour', name: 'la Pilar', at: { x: 0.8, y: 0.82 }, neighbour: 'senyora-pilar', facing: -1 },
] as const

const onDrop = vi.fn()
const onChange = vi.fn<(e: ChangeEvent) => void>()
const ZONES: readonly ZoneDef[] = [
  { id: 'cistella', room: 'sala', label: 'la cistella', rect: { x: 0.5, y: 0.7, w: 0.3, h: 0.12 }, accepts: (d) => d === 'pometa', onDrop, onChange },
  { id: 'plat', room: 'sala', label: 'el plat', rect: { x: 0.1, y: 0.7, w: 0.1, h: 0.1 }, capacity: 2, cols: 2, showCount: true },
]

let api: ItemsApi
let cast: CastApi
let task: RequestTask | undefined
let errandNow: TaskErrand
const freshSeeds = SEEDS.map((s) => ({ ...s }))

function Probe({ withTask }: { withTask: boolean }) {
  api = useItems()
  cast = useCast()
  const live = useZoneCount('cistella')
  return (
    <>
      <span data-testid="live">{live}</span>
      {withTask && <TaskProbe />}
    </>
  )
}
let patchErrand: (over: Partial<TaskErrand>) => void = () => undefined
function TaskProbe() {
  const [errand, setErrand] = useState<TaskErrand>(errandNow)
  patchErrand = (over) => setErrand((e) => ({ ...e, ...over }))
  task = useRequestTask(errand, { zone: 'cistella', def: 'pometa', source: { def: 'pometa', room: 'sala', at: { x: 0.3, y: 0.9 } }, giveTo: 'pilar' })
  return null
}

function mount(withTask = false): void {
  render(
    <CastProvider seeds={freshSeeds} initialSelected="laia" defaultRoom="sala">
      <ItemsProvider defs={PLAY_DEFS} start={[]} floorTop={0.47} zones={ZONES}>
        <div style={{ width: 800, height: 500 }}>
          <Stage label="La sala" room="sala" floorTop={0.47} switcher={false} />
          <ActorSwitcher room="sala" filter={(id) => id !== 'pilar'} />
        </div>
        <Probe withTask={withTask} />
      </ItemsProvider>
    </CastProvider>,
  )
}

const ITEM = { id: 'q', skillId: 's', text: '', speech: '', answer: '3', choices: [{ value: '3' }, { value: '2', misconception: 'x' }], visual: { kind: 'none' }, hintVisual: { kind: 'none' }, hints: ['a', 'b', 'c'], cpaStage: 'concret' } as unknown as Item

beforeEach(() => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }))
  onDrop.mockClear()
  onChange.mockClear()
})
afterEach(() => vi.unstubAllGlobals())

describe('ItemsApi: spawn, place, remove, consume, count, query', () => {
  it('spawns, counts and queries deterministically, and validates what it is given', () => {
    mount()
    let a = ''
    act(() => {
      a = api.spawn('pometa', { room: 'sala', at: { x: 0.3, y: 0.9 } }) ?? ''
      api.spawn('pometa', { room: 'sala', at: { x: 0.4, y: 0.9 }, uid: 'meva' })
      // Inside the same tick: the fresh state is readable at once.
      expect(api.count({ room: 'sala', def: 'pometa' })).toBe(2)
    })
    expect(a).toMatch(/^pometa~/)
    expect(api.query('sala', 'pometa').map((i) => i.uid).sort()).toContain('meva')
    expect(api.spawn('pometa', { room: 'sala', at: { x: 0.1, y: 0.1 }, uid: 'meva' })).toBeUndefined()
    expect(api.spawn('no-existeix', { room: 'sala', at: { x: 0.1, y: 0.1 } })).toBeUndefined()
    expect(() => api.spawn('pometa', { room: 'sala', at: { x: 4, y: 0.1 } })).toThrow()
    expect(api.spawn('pera', { room: 'sala', at: { x: 0.2, y: 0.5 }, zone: 'cistella' })).toBeUndefined()
  })

  it('places, removes and consumes (with a poof); gone things count nowhere', () => {
    mount()
    act(() => {
      api.spawn('pometa', { room: 'sala', at: { x: 0.3, y: 0.9 }, uid: 'a' })
      api.spawn('pometa', { room: 'sala', at: { x: 0.35, y: 0.9 }, uid: 'b' })
      api.spawn('pometa', { room: 'sala', at: { x: 0.4, y: 0.9 }, uid: 'c' })
    })
    act(() => {
      expect(api.place('a', { room: 'sala', at: { x: 0.6, y: 0.8 } })).toBe(true)
      expect(api.remove('b')).toBe(true)
      expect(api.consume('c')).toBe(true)
      expect(api.consume('c')).toBe(false)
      expect(api.remove('zz')).toBe(false)
      expect(api.place('zz', { room: 'sala', at: { x: 0.6, y: 0.8 } })).toBe(false)
    })
    expect(api.count({ def: 'pometa' })).toBe(1)
    expect(api.items.c?.loc.t).toBe('gone')
    expect(api.items.b).toBeUndefined()
    expect(document.querySelector('.sb-poof')).not.toBeNull()
  })

  it('stackable things pile up with a badge and a taking leaves the rest', () => {
    mount()
    act(() => void api.spawn('moneda', { room: 'sala', at: { x: 0.9, y: 0.9 }, uid: 'monedes', qty: 3 }))
    expect(document.querySelector('[data-qty="3"]')?.textContent).toBe('3')
    expect(screen.getByRole('button', { name: /3 unitats/ })).toBeInTheDocument()
    let one = ''
    act(() => {
      one = api.takeOne('monedes')
    })
    expect(one).not.toBe('monedes')
    expect(api.items.monedes?.qty).toBe(2)
    expect(api.count({ def: 'moneda' })).toBe(3)
  })
})

describe('zones', () => {
  it('tap-target path: carry a thing, tap the zone, it lands in a slot and says how many there are', async () => {
    mount()
    act(() => void api.spawn('pometa', { room: 'sala', at: { x: 0.46, y: 0.84 }, uid: 'p1' }))
    await userEvent.click(document.querySelector<HTMLElement>('[data-uid="p1"]') as HTMLElement)
    await waitFor(() => expect(cast.state.actors.laia?.carrying).toBe('p1'))
    await userEvent.click(document.querySelector<HTMLElement>('[data-zone-drop="cistella"]') as HTMLElement)
    await waitFor(() => expect(screen.getByTestId('live')).toHaveTextContent('1'))
    expect(screen.getByRole('status')).toHaveTextContent('Has posat una poma a la cistella: ara hi ha 1.')
    expect(document.querySelector('[data-zone="cistella"]')).toHaveAttribute('data-count', '1')
    expect(onDrop).toHaveBeenCalledWith(expect.objectContaining({ zone: 'cistella', uid: 'p1', count: 1 }))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ zone: 'cistella', total: 1, counts: { pometa: 1 } })))
    // Taking it out again is announced too.
    await userEvent.click(document.querySelector<HTMLElement>('[data-uid="p1"]') as HTMLElement)
    await waitFor(() => expect(screen.getByTestId('live')).toHaveTextContent('0'))
    expect(screen.getByRole('status')).toHaveTextContent('Has tret una poma de la cistella: ara hi ha 0.')
  })

  it('rejects what it does not accept, and says when it is full', async () => {
    mount()
    act(() => {
      api.spawn('pometa', { room: 'sala', at: { x: 0.12, y: 0.8 }, uid: 'x1' })
      api.spawn('pometa', { room: 'sala', at: { x: 0.13, y: 0.8 }, uid: 'x2' })
      api.spawn('pometa', { room: 'sala', at: { x: 0.14, y: 0.8 }, uid: 'x3' })
    })
    for (const [n, uid] of ['x1', 'x2', 'x3'].entries()) {
      await userEvent.click(document.querySelector<HTMLElement>(`[data-uid="${uid}"]`) as HTMLElement)
      await waitFor(() => expect(cast.state.actors.laia?.carrying).toBe(uid))
      await userEvent.click(document.querySelector<HTMLElement>('[data-zone-drop="plat"]') as HTMLElement)
      await waitFor(() => expect(cast.state.actors.laia?.carrying).toBe(n < 2 ? undefined : uid))
    }
    expect(screen.getByRole('status')).toHaveTextContent('El plat és plena')
    expect(document.querySelector('[data-zone-badge="plat"]')?.textContent).toBe('2')
  })

  it('the switcher can be filtered by room and by id', () => {
    mount()
    expect(screen.queryByRole('button', { name: 'Mou la Pilar' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Mou la Laia' })).toBeInTheDocument()
  })
})

describe('multi-stage houses', () => {
  it('passive stages stay silent, and walkTo right after enterRoom uses the new room and its own grid', () => {
    render(
      <CastProvider seeds={freshSeeds} initialSelected="laia" defaultRoom="sala">
        <ItemsProvider defs={PLAY_DEFS} start={[]} floorTop={0.47}>
          <Stage label="La sala" room="sala" floorTop={0.47} switcher={false} />
          <Stage label="El jardí" room="jardi" floorTop={0.47} passive blocks={[{ x: 0.4, y: 0.7, w: 0.2, h: 0.25 }]} />
          <Probe withTask={false} />
        </ItemsProvider>
      </CastProvider>,
    )
    expect(screen.getAllByRole('status')).toHaveLength(1)
    act(() => {
      cast.enterRoom('laia', 'jardi', { x: 0.2, y: 0.8 })
      cast.walkTo('laia', { x: 0.5, y: 0.8 })
    })
    const at = cast.positionOf('laia')
    expect(cast.state.actors.laia?.room).toBe('jardi')
    expect(at.x < 0.4 || at.x > 0.6 || at.y < 0.7 || at.y > 0.95).toBe(true)
  })
})

describe('useRequestTask', () => {
  const run = (over: Partial<TaskErrand> = {}): { submit: ReturnType<typeof vi.fn<(c: Choice) => Promise<void>>> } => {
    const submit = vi.fn<(c: Choice) => Promise<void>>(async () => undefined)
    errandNow = { item: ITEM, phase: 'asking', tries: 0, hintText: undefined, submit, ...over }
    return { submit }
  }

  it('lays out the pile, counts, and answers with the counted value through the errand', async () => {
    const { submit } = run()
    mount(true)
    await waitFor(() => expect(api.count({ room: 'sala', def: 'pometa' })).toBe(5))
    expect(task?.expected).toBe(3)
    expect(task?.state).toBe('empty')
    await act(async () => void (await task?.submit()))
    expect(submit).not.toHaveBeenCalled()
    const uids = api.query('sala', 'pometa').map((i) => i.uid)
    act(() => uids.slice(0, 3).forEach((u) => api.putInZone(u, 'cistella')))
    await waitFor(() => expect(task?.count).toBe(3))
    expect(task?.state).toBe('counting')
    await act(async () => void (await task?.submit()))
    expect(submit).toHaveBeenCalledWith({ value: '3' })
  })

  it('a wrong count is sent as the matching choice', async () => {
    const { submit } = run()
    mount(true)
    await waitFor(() => expect(api.count({ room: 'sala', def: 'pometa' })).toBe(5))
    act(() => api.query('sala', 'pometa').slice(0, 2).forEach((i) => api.putInZone(i.uid, 'cistella')))
    await waitFor(() => expect(task?.count).toBe(2))
    await act(async () => void (await task?.submit()))
    expect(submit).toHaveBeenCalledWith({ value: '2', misconception: 'x' })
  })

  it('pops back on a new try (no red, the hint shows), lays out the solution, and gives the things on thanks', async () => {
    run()
    mount(true)
    await waitFor(() => expect(api.count({ room: 'sala', def: 'pometa' })).toBe(5))
    act(() => api.query('sala', 'pometa').slice(0, 2).forEach((i) => api.putInZone(i.uid, 'cistella')))
    await waitFor(() => expect(task?.count).toBe(2))
    act(() => patchErrand({ tries: 1, hintText: 'a' }))
    await waitFor(() => expect(task?.count).toBe(0))
    expect(task?.hint).toBe('a')
    expect(api.count({ room: 'sala', def: 'pometa' })).toBe(5)
    expect(screen.getByRole('status')).toHaveTextContent('tornat a la pila')

    act(() => patchErrand({ phase: 'shown' }))
    await waitFor(() => expect(task?.count).toBe(3))
    expect(task?.state).toBe('shown')

    act(() => patchErrand({ phase: 'thanks' }))
    await waitFor(() => expect(task?.count).toBe(0))
    expect(task?.state).toBe('done')
    expect(screen.getByRole('status')).toHaveTextContent('Has donat 3 a la Pilar')
  })

  it('stays out of the way while the place has no open request', async () => {
    run()
    errandNow = { ...errandNow }
    mount(false)
    expect(api.count({ room: 'sala' })).toBe(0)
  })
})
