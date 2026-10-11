import { describe, expect, it } from 'vitest'
import { overlappingPairs, STAGE_BOXES } from '../../shared/hitAreas'
import { MARKET_DEFS } from './items'
import { FLOOR_TOP, MARKET_START } from './rooms'

describe('Mercat: free objects never lie on top of each other', () => {
  it.each(STAGE_BOXES)('no touch areas overlap on $name', (stage) => {
    expect(overlappingPairs(MARKET_START, MARKET_DEFS, stage, FLOOR_TOP)).toEqual([])
  })
})
