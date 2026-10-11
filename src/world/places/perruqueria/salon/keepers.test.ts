import { describe, expect, it } from 'vitest'
import { seatedKeepers } from './keepers'

const chairs = ['cadira-1', 'cadira-2', 'rentapaus']
const customers = ['a', 'b', 'c']

describe('seatedKeepers', () => {
  it('nobody is kept while no tool is carried', () => {
    expect(seatedKeepers({ a: { seat: 'cadira-1' }, laia: {} }, customers, chairs)).toEqual([])
  })

  it('while a tool is carried, the customers in a chair stay and the ones on the sofa may go', () => {
    expect(seatedKeepers({ a: { seat: 'cadira-1' }, b: { seat: 'sofa-1' }, c: {}, laia: { carrying: 'eina-dutxa' } }, customers, chairs)).toEqual(['a'])
  })
})
