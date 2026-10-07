import { collectionGroups, dealtPerPlate, shareSplit, slicePath } from './shareLogic'

describe('shareLogic', () => {
  it('splits with remainder', () => {
    expect(shareSplit(14, 4)).toEqual({ groups: 4, perPlate: 3, leftover: 2 })
    expect(shareSplit(12, 3)).toEqual({ groups: 3, perPlate: 4, leftover: 0 })
    expect(shareSplit(2, 5)).toEqual({ groups: 5, perPlate: 0, leftover: 2 })
  })
  it('deals round-robin', () => {
    expect(dealtPerPlate(0, 3)).toEqual([0, 0, 0])
    expect(dealtPerPlate(5, 3)).toEqual([2, 2, 1])
    expect(dealtPerPlate(9, 3)).toEqual([3, 3, 3])
  })
  it('groups a collection for fractions', () => {
    expect(collectionGroups(12, 4, 3)).toEqual({ groupSize: 3, highlighted: 9 })
    expect(collectionGroups(8, 2, 1)).toEqual({ groupSize: 4, highlighted: 4 })
    expect(collectionGroups(8, 2, 5).highlighted).toBe(8)
  })
  it('builds a slice path', () => {
    expect(slicePath(50, 50, 40, 0, Math.PI / 2)).toContain('A 40 40 0 0 1')
    expect(slicePath(50, 50, 40, 0, Math.PI * 1.5)).toContain('A 40 40 0 1 1')
  })
})
