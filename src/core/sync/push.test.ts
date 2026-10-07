import { describe, expect, it, vi } from 'vitest'
import { ApiError } from './api'
import { pushBisect } from './push'

describe('pushBisect', () => {
  it('sends once when accepted', async () => {
    const send = vi.fn(async () => undefined)
    expect(await pushBisect([1, 2, 3], send)).toEqual([])
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('isolates every bad item and still sends the good ones', async () => {
    const sent: number[] = []
    const send = async (batch: readonly number[]) => {
      if (batch.some((n) => n % 5 === 0)) throw new ApiError(422, 'validation_failed')
      sent.push(...batch)
    }
    const items = Array.from({ length: 12 }, (_, i) => i + 1)
    expect(await pushBisect(items, send)).toEqual([5, 10])
    expect(sent.sort((a, b) => a - b)).toEqual(items.filter((n) => n % 5 !== 0))
  })

  it('rethrows other errors and 422 on an empty push', async () => {
    await expect(pushBisect([1], async () => Promise.reject(new ApiError(0, 'network')))).rejects.toMatchObject({ code: 'network' })
    await expect(pushBisect([], async () => Promise.reject(new ApiError(422, 'validation_failed')))).rejects.toMatchObject({ status: 422 })
  })
})
