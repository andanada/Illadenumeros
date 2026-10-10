import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultAvatar } from '../../characters'
import { Street, type StreetSpot } from './Street'

const SPOTS: readonly StreetSpot[] = [
  { id: 'casa', name: 'la Casa', open: true, facade: 'facana-casa' },
  { id: 'botiga', name: 'la Botiga', open: true, facade: 'facana-botiga' },
  { id: 'fleca', name: 'la Fleca', open: false, facade: undefined },
]

function mockReducedMotion(reduce: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }))
}

function size(width = 390, height = 700): void {
  const street = screen.getByTestId('street')
  Object.defineProperty(street, 'clientWidth', { configurable: true, value: width })
  Object.defineProperty(street, 'clientHeight', { configurable: true, value: height })
  act(() => void window.dispatchEvent(new Event('resize')))
}

beforeEach(() => mockReducedMotion(true))
afterEach(() => vi.unstubAllGlobals())

describe('walkable Street', () => {
  it('she starts by the shop and goes in at once when she is already at its door', async () => {
    const onEnter = vi.fn()
    render(<Street avatar={defaultAvatar('nyx', 'rosa')} spots={SPOTS} onEnter={onEnter} />)
    await userEvent.click(screen.getByRole('button', { name: 'Entra a la Botiga' }))
    expect(onEnter).toHaveBeenCalledWith('botiga', expect.anything())
  })

  it('a far door is reached by walking there first (instantly with reduced motion), then she goes in', async () => {
    const onEnter = vi.fn()
    render(<Street avatar={defaultAvatar('nyx', 'rosa')} spots={SPOTS} onEnter={onEnter} />)
    size()
    await userEvent.click(screen.getByRole('button', { name: 'Entra a la Casa' }))
    await waitFor(() => expect(onEnter).toHaveBeenCalledWith('casa', expect.anything()))
  })

  it('closed places never take her in and never show a padlock', async () => {
    const onEnter = vi.fn()
    render(<Street avatar={defaultAvatar('nyx', 'rosa')} spots={SPOTS} onEnter={onEnter} />)
    await userEvent.click(screen.getByRole('button', { name: 'La Fleca: obrim aviat' }))
    expect(onEnter).not.toHaveBeenCalled()
    expect(screen.getByTestId('street').textContent).not.toContain('🔒')
  })

  it('the arrow keys walk her and the camera moves with her', () => {
    const offsets: number[] = []
    render(<Street avatar={defaultAvatar('nyx', 'rosa')} spots={SPOTS} onEnter={vi.fn()} onOffsetChange={(v) => offsets.push(v)} initialOffset={0} />)
    size()
    const street = screen.getByTestId('street')
    fireEvent.keyDown(street, { key: 'ArrowRight' })
    fireEvent.keyUp(street, { key: 'ArrowRight' })
    expect(offsets.length).toBeGreaterThan(0)
    expect(Math.min(...offsets)).toBeLessThan(0)
  })

  it('tapping the ground walks her there; the greeting goes away', async () => {
    render(<Street avatar={defaultAvatar('nyx', 'rosa')} spots={SPOTS} onEnter={vi.fn()} greeting="Hola, Laia!" initialOffset={0} />)
    size()
    expect(screen.getByText('Hola, Laia!')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('street'), { clientX: 350, clientY: 600 })
    await waitFor(() => expect(screen.queryByText('Hola, Laia!')).toBeNull())
  })

  it('what she carries is drawn in her hand', () => {
    render(<Street avatar={defaultAvatar('nyx', 'rosa')} spots={SPOTS} onEnter={vi.fn()} carrying={<circle data-testid="held" r="10" />} />)
    expect(screen.getByTestId('held')).toBeInTheDocument()
    expect(screen.getByTestId('street-avatar').querySelector('[data-pose="hold"]')).not.toBeNull()
  })
})
