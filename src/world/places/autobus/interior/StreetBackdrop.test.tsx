import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BusLookContext, DEFAULT_LOOK } from './busLook'
import { StreetBackdrop } from './StreetBackdrop'

const reduced = vi.hoisted(() => ({ value: false }))
vi.mock('../../../scene/useReducedMotion', () => ({ useWorldReducedMotion: () => reduced.value }))

beforeEach(() => {
  reduced.value = false
})

const renderBackdrop = (driving: boolean, night = false) =>
  render(
    <BusLookContext.Provider value={{ ...DEFAULT_LOOK, driving, night }}>
      <StreetBackdrop />
    </BusLookContext.Provider>,
  )

describe('the street behind the bus', () => {
  it('scrolls only while the bus drives', () => {
    const { unmount } = renderBackdrop(false)
    expect(screen.getByTestId('bus-backdrop')).toHaveAttribute('data-scrolling', 'false')
    unmount()
    renderBackdrop(true)
    expect(screen.getByTestId('bus-backdrop')).toHaveAttribute('data-scrolling', 'true')
  })

  it('with reduced motion the landscape never scrolls, even while driving', () => {
    reduced.value = true
    renderBackdrop(true)
    expect(screen.getByTestId('bus-backdrop')).toHaveAttribute('data-scrolling', 'false')
  })

  it('is decorative (hidden from screen readers)', () => {
    renderBackdrop(true, true)
    expect(screen.getByTestId('bus-backdrop')).toHaveAttribute('aria-hidden', 'true')
  })
})
