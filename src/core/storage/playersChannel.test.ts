import { describe, expect, it, vi } from 'vitest'
import { notifyPlayersChanged, onPlayersChanged } from './playersChannel'

describe('players channel between tabs', () => {
  it('a change announced by one tab reaches the listeners of the others', async () => {
    const listener = vi.fn()
    const stop = onPlayersChanged(listener)
    notifyPlayersChanged()
    await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(1))
    stop()
  })

  it('without BroadcastChannel it is a silent no-op', () => {
    vi.stubGlobal('BroadcastChannel', undefined)
    try {
      expect(() => notifyPlayersChanged()).not.toThrow()
      const stop = onPlayersChanged(vi.fn())
      expect(() => stop()).not.toThrow()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
