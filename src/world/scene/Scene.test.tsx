import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Draggable } from './Draggable'
import { DropZone } from './DropZone'
import { Scene, TapProp } from './Scene'

/** jsdom has no layout: give the zones real boxes. */
function placeAt(testId: string, left: number, top: number, size = 100): void {
  const el = document.querySelector(`[data-zone-id="${testId}"]`) as HTMLElement
  el.getBoundingClientRect = () => ({ left, top, width: size, height: size, right: left + size, bottom: top + size, x: left, y: top, toJSON: () => ({}) })
}

function Harness({ onDrop = vi.fn() }: { onDrop?: (zone: string, prop: string) => void }) {
  const [where, setWhere] = useState('terra')
  const drop = (zone: string) => (p: { id: string }) => {
    setWhere(zone)
    onDrop(zone, p.id)
  }
  return (
    <Scene label="Prova">
      <p data-testid="where">{where}</p>
      <Draggable prop={{ id: 'poma', label: 'la poma', kind: 'fruita' }} className="size-16">
        poma
      </Draggable>
      <DropZone id="cistella" label="la cistella" accepts={(p) => p.kind === 'fruita'} onDrop={drop('cistella')}>
        cistella
      </DropZone>
      <DropZone id="plat" label="el plat" accepts={(p) => p.kind === 'fruita'} onDrop={drop('plat')}>
        plat
      </DropZone>
      <DropZone id="nevera" label="la nevera" accepts={(p) => p.kind === 'beguda'} onDrop={drop('nevera')}>
        nevera
      </DropZone>
    </Scene>
  )
}

const pointer = (type: string, x: number, y: number) => ({ pointerId: 1, clientX: x, clientY: y, bubbles: true, type })

describe('scene drag and drop', () => {
  it('drops a dragged prop into the zone under the finger', () => {
    const onDrop = vi.fn()
    render(<Harness onDrop={onDrop} />)
    placeAt('cistella', 300, 300)
    placeAt('plat', 600, 300)
    placeAt('nevera', 900, 300)
    const prop = screen.getByRole('button', { name: 'la poma' })
    fireEvent.pointerDown(prop, pointer('pointerdown', 10, 10))
    fireEvent.pointerMove(prop, pointer('pointermove', 100, 100))
    fireEvent.pointerMove(prop, pointer('pointermove', 340, 340))
    fireEvent.pointerUp(prop, pointer('pointerup', 340, 340))
    expect(onDrop).toHaveBeenCalledWith('cistella', 'poma')
    expect(screen.getByRole('status')).toHaveTextContent('Has posat la poma a la cistella.')
  })

  it('tosses the prop back when it lands where nothing takes it', () => {
    const onDrop = vi.fn()
    render(<Harness onDrop={onDrop} />)
    placeAt('cistella', 300, 300)
    placeAt('nevera', 900, 300)
    placeAt('plat', 600, 300)
    const prop = screen.getByRole('button', { name: 'la poma' })
    fireEvent.pointerDown(prop, pointer('pointerdown', 10, 10))
    fireEvent.pointerMove(prop, pointer('pointermove', 940, 340))
    fireEvent.pointerUp(prop, pointer('pointerup', 940, 340))
    expect(onDrop).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('La poma torna al seu lloc.')
  })

  it('tap alternative: tap the prop, then tap the place', async () => {
    render(<Harness />)
    const prop = screen.getByRole('button', { name: 'la poma' })
    expect(screen.queryByRole('button', { name: 'Posa-ho a la cistella' })).toBeNull()
    fireEvent.pointerDown(prop, pointer('pointerdown', 10, 10))
    fireEvent.pointerUp(prop, pointer('pointerup', 11, 10))
    expect(screen.getByRole('button', { name: 'la poma, agafat' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: 'Posa-ho a la nevera' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Posa-ho a la cistella' }))
    expect(screen.getByTestId('where')).toHaveTextContent('cistella')
  })

  it('keyboard: Enter picks, arrows move between places, Enter drops, Escape lets go', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame'] })
    render(<Harness />)
    const prop = screen.getByRole('button', { name: 'la poma' })
    prop.focus()
    fireEvent.keyDown(prop, { key: 'Enter' })
    act(() => vi.advanceTimersToNextFrame())
    vi.useRealTimers()
    expect(screen.getByRole('button', { name: 'Posa-ho a la cistella' })).toHaveFocus()
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowRight' })
    expect(screen.getByRole('button', { name: 'Posa-ho al plat' })).toHaveFocus()
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowLeft' })
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowLeft' })
    expect(screen.getByRole('button', { name: 'Posa-ho al plat' })).toHaveFocus()
    fireEvent.keyDown(document.activeElement as Element, { key: 'Enter' })
    expect(screen.getByTestId('where')).toHaveTextContent('plat')

    fireEvent.keyDown(prop, { key: ' ' })
    expect(screen.getByRole('button', { name: 'la poma, agafat' })).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Posa-ho a la cistella' }), { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'la poma' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('every prop reacts to taps and to Enter', () => {
    const onTap = vi.fn()
    render(
      <Scene label="Prova">
        <TapProp prop={{ id: 'gat', label: 'El gat', kind: 'animal' }} sound="meow" onTap={onTap}>
          gat
        </TapProp>
      </Scene>,
    )
    const cat = screen.getByRole('button', { name: 'El gat' })
    fireEvent.pointerDown(cat, pointer('pointerdown', 5, 5))
    fireEvent.pointerUp(cat, pointer('pointerup', 5, 5))
    fireEvent.keyDown(cat, { key: 'Enter' })
    expect(onTap).toHaveBeenCalledTimes(2)
    expect(cat).not.toHaveAttribute('aria-pressed')
  })
})
