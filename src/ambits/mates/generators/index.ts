import type { ItemGenerator } from '../../../core/ambit/types'
import { generateAdd2d1d, generateAdd2d2d, generateAddTens, generateFactAddition } from './addition'
import { generateAddSub3d, generateEstimateRound, generateMissingNumberOps } from './arithmetic'
import { generateDivConcept, generateDivisionFact, generateDivRemainder } from './division'
import { generateFractionOfCollection, generateUnitFraction } from './fractions'
import { generateMoney } from './money'
import { generateMult2d1d, generateMultConcept, generateTableFact } from './multiplication'
import { generateCompare, generateCount, generateNumberLine, generatePlaceValue } from './numbers'
import { generatePlaceValue1000, generatePlaceValue9999 } from './placeValue'
import { generateFactSubtraction, generateSub2d1d, generateSub2d2d } from './subtraction'
import { generateDecompose, generateMissingAddend, generateTenFriends } from './tens'
import { generateTwoStepProblem } from './wordProblems'

export const MATES_GENERATORS: Record<string, ItemGenerator> = {
  A1: generateCount,
  A2: (ctx) => generateCompare('A2', ctx),
  A3: generateDecompose,
  A4: (ctx) => generateFactAddition('A4', ctx),
  A5: generateTenFriends,
  A6: (ctx) => generateFactSubtraction('A6', ctx),
  A7: (ctx) => generateFactAddition('A7', ctx),
  A8: (ctx) => generateFactAddition('A8', ctx),
  A9: (ctx) => generateFactSubtraction('A9', ctx),
  A10: generateMissingAddend,
  B1: generatePlaceValue,
  B2: generateNumberLine,
  B3: (ctx) => generateCompare('B3', ctx),
  B4: generateAddTens,
  B5: generateAdd2d1d,
  B6: generateSub2d1d,
  B7: (ctx) => (ctx.rng.next() < 0.5 ? generateAdd2d2d(ctx) : generateSub2d2d(ctx)),
  C1: generatePlaceValue1000,
  C2: generateAddSub3d,
  C3: generateMultConcept,
  C4: (ctx) => generateTableFact('C4', ctx),
  C5: (ctx) => generateTableFact('C5', ctx),
  C6: generateDivConcept,
  C7: (ctx) => generateDivisionFact('C7', ctx),
  C8: generateUnitFraction,
  C9: generateMoney,
  C10: generateTwoStepProblem,
  D1: generatePlaceValue9999,
  D2: (ctx) => generateTableFact('D2', ctx),
  D3: (ctx) => generateTableFact('D3', ctx),
  D4: (ctx) => generateDivisionFact('D4', ctx),
  D5: generateMult2d1d,
  D6: generateDivRemainder,
  D7: generateFractionOfCollection,
  D8: generateEstimateRound,
  D9: generateMissingNumberOps,
}
