import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { wipeAllDatabases } from '../../test/idb'
import { resetStoreForTest } from '../../test/playerDb'
import { useProgress } from '../progress/store'
import { emitProgressChanged, onProgressChanged } from './progressEvents'

beforeEach(async () => {
  await wipeAllDatabases()
  resetStoreForTest()
})
afterEach(wipeAllDatabases)

describe('progress events', () => {
  it('unsubscribe stops notifications; a throwing listener does not break others', () => {
    const a = vi.fn(() => {
      throw new Error('x')
    })
    const b = vi.fn()
    const offA = onProgressChanged(a)
    const offB = onProgressChanged(b)
    emitProgressChanged()
    offA()
    offB()
    emitProgressChanged()
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('the store emits after answers, stickers, missions, the diagnostic and player edits', async () => {
    const listener = vi.fn()
    const off = onProgressChanged(listener)
    const s = () => useProgress.getState()
    const id = await s().createPlayer({ name: 'Laia', character: 'nyx', color: 'rosa' })
    expect(listener).toHaveBeenCalledTimes(1)
    await s().finishDiagnostic({ A1: { mastery: 0.5, status: 'aprenent' } })
    await s().record({ skillId: 'A1', correct: true, rtMs: 900, hintsUsed: 0, cpaStage: 'concret', gameId: 'repte-illa' })
    await s().grantSticker()
    await s().completeMission()
    await s().renamePlayer(id, { name: 'Lali' })
    await s().saveProfile({ name: 'Lali', character: 'mixa', color: 'blau' })
    expect(listener).toHaveBeenCalledTimes(7)
    off()
  })
})
