import { ApiError } from './api'

/**
 * Sends `items`; if the server rejects the whole push as invalid (422), retries each half until the
 * offending item(s) are isolated. Returns the items rejected on their own (to be quarantined).
 * Any other error is thrown unchanged (the caller retries later).
 */
export async function pushBisect<T>(items: readonly T[], send: (batch: readonly T[]) => Promise<void>): Promise<T[]> {
  try {
    await send(items)
    return []
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 422 || items.length === 0) throw error
    if (items.length === 1) return [...items]
    const middle = Math.ceil(items.length / 2)
    const left = await pushBisect(items.slice(0, middle), send)
    const right = await pushBisect(items.slice(middle), send)
    return [...left, ...right]
  }
}
