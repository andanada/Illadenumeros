import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAccount } from '../../core/sync/accountStore'
import { SyncStatusDot } from './SyncStatusDot'

beforeEach(() => useAccount.setState({ status: 'loggedOut', message: undefined, players: {} }))

const dot = (container: HTMLElement) => container.querySelector('[data-sync]')

describe('SyncStatusDot (adults only, decorative)', () => {
  it('renders nothing without an account', () => {
    const { container } = render(<SyncStatusDot />)
    expect(dot(container)).toBeNull()
  })

  it('synced, offline and error states, hidden from assistive tech with a title', () => {
    const { container } = render(<SyncStatusDot />)
    act(() => useAccount.setState({ status: 'loggedIn' }))
    expect(dot(container)).toHaveAttribute('data-sync', 'ok')
    expect(dot(container)).toHaveAttribute('aria-hidden', 'true')
    expect(dot(container)).toHaveAttribute('title', expect.stringMatching(/sincronitzat/i))
    act(() => useAccount.setState({ status: 'offline' }))
    expect(dot(container)).toHaveAttribute('data-sync', 'offline')
    act(() => useAccount.setState({ status: 'loggedIn', players: { a: { state: 'error', skipped: 0, quarantined: 0 } } }))
    expect(dot(container)).toHaveAttribute('data-sync', 'error')
    act(() => useAccount.setState({ status: 'loggedIn', players: {}, message: 'x' }))
    expect(dot(container)).toHaveAttribute('data-sync', 'error')
  })
})
