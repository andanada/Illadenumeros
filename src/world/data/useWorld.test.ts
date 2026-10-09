import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useProgress } from '../../core/progress/store'
import { wipeAllDatabases } from '../../test/idb'
import { resetStoreForTest } from '../../test/playerDb'
import { defaultAvatar } from '../characters/wearables'
import { registerCatalog, resetCatalogForTest } from './catalog'
import { useWorld, worldDataPort } from './useWorld'
import { grantCoins, resetWorldStoreForTest } from './worldStore'

const SOFA = { id: 'sofa', kind: 'furniture' as const, name: 'Sofà', price: 4 }

beforeEach(async () => {
  await wipeAllDatabases()
  resetStoreForTest()
  resetWorldStoreForTest()
  registerCatalog([SOFA])
})
afterEach(async () => {
  resetCatalogForTest()
  await wipeAllDatabases()
})

describe('useWorld', () => {
  it('shows the default avatar at once, loads the row and keeps coins live', async () => {
    await useProgress.getState().createPlayer({ name: 'Laia', character: 'melo', color: 'rosa' })
    const { result } = renderHook(() => useWorld())
    expect(result.current.avatar).toEqual(defaultAvatar('melo', 'rosa'))
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.coins).toBe(0)
    expect(result.current.avatarUpdatedAt).toBe(0)
    await act(async () => {
      await result.current.setAvatar({ ...defaultAvatar('melo', 'rosa'), skin: 's4' })
    })
    expect(result.current.avatarUpdatedAt).toBeGreaterThan(0)
    await act(async () => {
      await result.current.grantCoins(10, 'encarrec')
    })
    expect(result.current.coins).toBe(10)
    await act(async () => {
      await result.current.buy(SOFA)
    })
    expect(result.current.coins).toBe(6)
    expect(result.current.owned).toEqual(['sofa'])
  })

  it('nobody playing: not ready, default look, zero coins', () => {
    const { result } = renderHook(() => useWorld())
    expect(result.current.ready).toBe(false)
    expect(result.current.coins).toBe(0)
  })
})

describe('worldDataPort', () => {
  it('reports the avatar and notifies coin changes once per change', async () => {
    await useProgress.getState().createPlayer({ name: 'Laia', character: 'nyx', color: 'lila' })
    expect(worldDataPort.getAvatar()).toEqual(defaultAvatar('nyx', 'lila'))
    const seen: number[] = []
    const off = worldDataPort.onCoins((c) => seen.push(c))
    await grantCoins(3, 'x')
    off()
    await grantCoins(3, 'x')
    expect(seen).toEqual([3])
    expect(worldDataPort.coins()).toBe(6)
  })
})
