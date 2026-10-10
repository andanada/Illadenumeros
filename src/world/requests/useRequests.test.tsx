import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { todayKey, useProgress } from '../../core/progress/store'
import { activateTestPlayer } from '../../test/playerDb'
import { resetWorldStoreForTest } from '../data/worldStore'
import { governorContext, setOpenPlaces } from './context'
import { CALM_AFTER_MS } from './governor'
import { RequestBubble } from './RequestBubble'
import { openDay, resetRequestStoreForTest, useRequestStore } from './requestStore'
import { useRequests } from './useRequests'

const TASKS = [{ place: 'botiga', count: 3, kind: 'repte', neighbour: 'senyora-pilar' }] as const
const DAY = todayKey()
const T0 = new Date(2026, 9, 9, 12).getTime()

beforeEach(() => {
  activateTestPlayer()
  resetWorldStoreForTest()
  resetRequestStoreForTest()
  setOpenPlaces([{ id: 'botiga', skills: ['A3', 'A4'] }])
})

describe('useRequests', () => {
  it('lists the place’s requests (waiting first, then calm) and resolves one', async () => {
    await openDay(DAY, () => TASKS, governorContext(DAY, T0))
    let clock = T0
    const { result } = renderHook(() => useRequests('botiga', () => clock))
    expect(result.current.waiting).toBe(1)
    expect(result.current.requests[0]).toMatchObject({ placeId: 'botiga', kind: 'serve', actorId: 'senyora-pilar', status: 'waiting' })

    clock = T0 + CALM_AFTER_MS + 1
    await act(async () => void (await new Promise((r) => setTimeout(r, 1100))))
    expect(result.current.waiting).toBe(0)
    expect(result.current.requests[0]?.status).toBe('calm')

    act(() => result.current.wakeRequests())
    await waitFor(() => expect(result.current.waiting).toBe(1))

    act(() => result.current.resolveRequest(3))
    await waitFor(() => expect(useRequestStore.getState().day?.board.done).toEqual({ botiga: 1 }))
    expect(useRequestStore.getState().day?.recent).toEqual([true])
  })

  it('without an open day there is nothing', () => {
    const { result } = renderHook(() => useRequests('botiga'))
    expect(result.current).toMatchObject({ requests: [], waiting: 0 })
    expect(useProgress.getState().activePlayerId).toBeDefined()
  })
})

describe('RequestBubble', () => {
  it('shows the icon and the count, calms to a sleepy bubble, and can be woken by a tap', async () => {
    const onActivate = vi.fn()
    const { rerender } = render(<RequestBubble kind="serve" count={2} label="Algú et necessita" onActivate={onActivate} />)
    expect(screen.getByText('🛒')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    rerender(<RequestBubble kind="serve" count={2} state="calm" label="Algú dorm" onActivate={onActivate} />)
    expect(screen.getByText('💤')).toBeInTheDocument()
    expect(screen.queryByText('2')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Algú dorm' }))
    expect(onActivate).toHaveBeenCalledOnce()
  })
})
