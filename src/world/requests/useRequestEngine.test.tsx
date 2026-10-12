import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { todayKey } from '../../core/progress/store'
import { setDailyMinutes } from '../../core/storage/meta'
import { getDb } from '../../core/storage/playerDbs'
import { activateTestPlayer } from '../../test/playerDb'
import { errandsFor } from '../board/boardPlan'
import { PLACES } from '../places/registry'
import { requestsTarget } from './dayState'
import { resetRequestStoreForTest } from './requestStore'
import { useRequestEngine } from './useRequestEngine'

const T0 = new Date(2026, 9, 9, 12).getTime()
const OPEN = PLACES.filter((p) => p.unlock === 'always')

beforeEach(() => {
  activateTestPlayer()
  resetRequestStoreForTest()
})

describe('useRequestEngine and the parents’ daily minutes', () => {
  it('freezes the day’s allotment from the stored setting', async () => {
    await setDailyMinutes(getDb(), 20)
    const { result } = renderHook(() => useRequestEngine(() => T0, OPEN))
    await waitFor(() => expect(result.current.day).toBeDefined())
    expect(result.current.day?.day).toBe(todayKey(T0))
    expect(requestsTarget(result.current.day as NonNullable<typeof result.current.day>)).toBe(errandsFor(20))
  })

  it('uses 12 minutes when nothing is stored', async () => {
    const { result } = renderHook(() => useRequestEngine(() => T0, OPEN))
    await waitFor(() => expect(result.current.day).toBeDefined())
    expect(requestsTarget(result.current.day as NonNullable<typeof result.current.day>)).toBe(errandsFor(12))
  })
})
