import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api'
import { emitProgressChanged } from './progressEvents'
import { createScheduler, MAX_BACKOFF_MS } from './scheduler'

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

let visibility: DocumentVisibilityState = 'visible'

beforeEach(() => {
  vi.useFakeTimers()
  visibility = 'visible'
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function setup(run: () => Promise<void> = vi.fn(async () => undefined)) {
  const scheduler = createScheduler({ run })
  return { scheduler, run: run as ReturnType<typeof vi.fn> }
}

describe('sync scheduler', () => {
  it('runs on start, then every 90 s while visible', async () => {
    const { scheduler, run } = setup()
    scheduler.start()
    await flush()
    expect(run).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(90_000)
    expect(run).toHaveBeenCalledTimes(2)
    visibility = 'hidden'
    await vi.advanceTimersByTimeAsync(180_000)
    expect(run).toHaveBeenCalledTimes(2)
    scheduler.stop()
  })

  it('runs when the tab becomes visible and when the network comes back', async () => {
    const { scheduler, run } = setup()
    scheduler.start()
    await flush()
    document.dispatchEvent(new Event('visibilitychange'))
    await flush()
    expect(run).toHaveBeenCalledTimes(2)
    window.dispatchEvent(new Event('online'))
    await flush()
    expect(run).toHaveBeenCalledTimes(3)
    scheduler.stop()
  })

  it('debounces progress changes by 5 s', async () => {
    const { scheduler, run } = setup()
    scheduler.start()
    await flush()
    emitProgressChanged()
    await vi.advanceTimersByTimeAsync(3_000)
    emitProgressChanged()
    await vi.advanceTimersByTimeAsync(4_999)
    expect(run).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(run).toHaveBeenCalledTimes(2)
    scheduler.stop()
  })

  it('backs off exponentially on network errors, capped at 5 min, and the online event retries at once', async () => {
    const run = vi.fn(async () => Promise.reject(new ApiError(0, 'network')))
    const { scheduler } = setup(run)
    scheduler.start()
    await flush()
    expect(scheduler.retryInMs()).toBe(5_000)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(run).toHaveBeenCalledTimes(2)
    expect(scheduler.retryInMs()).toBe(10_000)
    for (let i = 0; i < 10; i++) await vi.advanceTimersByTimeAsync(MAX_BACKOFF_MS)
    expect(scheduler.retryInMs()).toBe(MAX_BACKOFF_MS)
    const calls = run.mock.calls.length
    emitProgressChanged()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(run.mock.calls.length).toBe(calls)
    window.dispatchEvent(new Event('online'))
    await flush()
    expect(run.mock.calls.length).toBe(calls + 1)
    scheduler.stop()
  })

  it('waits Retry-After on 429 and resets after a success', async () => {
    let fail = true
    const run = vi.fn(async () => {
      if (fail) throw new ApiError(429, 'rate_limited', undefined, 60_000)
    })
    const { scheduler } = setup(run)
    scheduler.start()
    await flush()
    expect(scheduler.retryInMs()).toBe(60_000)
    fail = false
    await vi.advanceTimersByTimeAsync(60_000)
    expect(run).toHaveBeenCalledTimes(2)
    expect(scheduler.retryInMs()).toBe(0)
    scheduler.stop()
  })

  it('coalesces triggers while a run is in flight into one more run', async () => {
    let release: () => void = () => undefined
    const run = vi.fn(() => new Promise<void>((r) => (release = r)))
    const { scheduler } = setup(run)
    scheduler.start()
    scheduler.trigger()
    scheduler.trigger()
    release()
    await flush()
    expect(run).toHaveBeenCalledTimes(2)
    release()
    await flush()
    expect(run).toHaveBeenCalledTimes(2)
    scheduler.stop()
  })

  it('stop() removes every timer and listener', async () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const addDoc = vi.spyOn(document, 'addEventListener')
    const removeDoc = vi.spyOn(document, 'removeEventListener')
    const { scheduler, run } = setup()
    scheduler.start()
    emitProgressChanged()
    scheduler.stop()
    expect(vi.getTimerCount()).toBe(0)
    expect(remove.mock.calls.map((c) => c[0])).toEqual(add.mock.calls.map((c) => c[0]))
    expect(removeDoc.mock.calls.map((c) => c[0])).toEqual(addDoc.mock.calls.map((c) => c[0]))
    await flush()
    const calls = run.mock.calls.length
    emitProgressChanged()
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(200_000)
    expect(run.mock.calls.length).toBe(calls)
  })

  it('start twice does not double the listeners', async () => {
    const { scheduler, run } = setup()
    scheduler.start()
    scheduler.start()
    await flush()
    window.dispatchEvent(new Event('online'))
    await flush()
    expect(run).toHaveBeenCalledTimes(2)
    scheduler.stop()
    expect(vi.getTimerCount()).toBe(0)
  })
})
