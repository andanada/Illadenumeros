import type { AmbitModule } from '../../core/ambit/types'
import { factsForSkill } from './facts'
import { MATES_GENERATORS } from './generators'
import { DIAGNOSTIC_ANCHORS, MATES_SKILLS } from './skills'

export const matesAmbit: AmbitModule = {
  id: 'mates',
  name: 'Matemàtiques',
  skills: MATES_SKILLS,
  generators: MATES_GENERATORS,
  diagnosticAnchors: [...DIAGNOSTIC_ANCHORS],
  factsForSkill,
}
