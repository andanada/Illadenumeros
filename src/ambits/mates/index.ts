import type { AmbitModule } from '../../core/ambit/types'
import { factFamily } from './factFamilies'
import { factsForSkill } from './facts'
import { MATES_GENERATORS } from './generators'
import { factOwner } from './operations'
import { DIAGNOSTIC_ANCHORS, MATES_SKILLS } from './skills'

export const matesAmbit: AmbitModule = {
  id: 'mates',
  name: 'Matemàtiques',
  skills: MATES_SKILLS,
  generators: MATES_GENERATORS,
  diagnosticAnchors: [...DIAGNOSTIC_ANCHORS],
  factsForSkill,
  factFamily,
  factOwner,
}
