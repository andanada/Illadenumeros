import { beforeEach, describe, expect, it } from 'vitest'
import { wipeAllDatabases } from '../../test/idb'
import { getRegistry } from '../storage/registry'
import { addPendingDelete, readPendingDeletes, removePendingDelete } from './pendingDeletes'

const A = '1b4e28ba-2fa1-41d2-883f-0016d3cca427'
const B = '2b4e28ba-2fa1-41d2-883f-0016d3cca427'

beforeEach(async () => {
  await wipeAllDatabases()
})

describe('pendingDeletes (registry meta)', () => {
  it('starts empty, adds without duplicates and removes', async () => {
    expect(await readPendingDeletes()).toEqual([])
    await addPendingDelete(A)
    await addPendingDelete(A)
    await addPendingDelete(B)
    expect(await readPendingDeletes()).toEqual([A, B])
    await removePendingDelete(A)
    expect(await readPendingDeletes()).toEqual([B])
  })

  it('ignores a damaged value and invalid ids', async () => {
    await getRegistry().meta.put({ key: 'pendingDeletes', value: ['not-a-uuid', A, 3] })
    expect(await readPendingDeletes()).toEqual([A])
    await getRegistry().meta.put({ key: 'pendingDeletes', value: 'x' })
    expect(await readPendingDeletes()).toEqual([])
  })
})
