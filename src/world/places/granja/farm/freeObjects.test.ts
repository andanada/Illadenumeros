import { describe, expect, it } from 'vitest'
import { overlappingPairs, STAGE_BOXES } from '../../shared/hitAreas'
import { FARM_DEFS } from './items'
import { FARM_FLOOR_TOP, FARM_START } from './rooms'

describe('Granja: free objects never lie on top of each other', () => {
  it.each(STAGE_BOXES)('no touch areas overlap on $name', (stage) => {
    expect(overlappingPairs(FARM_START, FARM_DEFS, stage, FARM_FLOOR_TOP)).toEqual([])
  })
})
