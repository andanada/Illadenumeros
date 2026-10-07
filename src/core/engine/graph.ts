import type { SkillNode } from '../ambit/types'

const UNLOCK_AT = 0.6

export function validateGraph(skills: readonly SkillNode[]): void {
  const ids = new Set(skills.map((s) => s.id))
  if (ids.size !== skills.length) throw new Error('Hi ha habilitats amb id repetit')
  for (const skill of skills) {
    for (const prereq of skill.prereqs) {
      if (!ids.has(prereq)) throw new Error(`${skill.id}: prerequisit inexistent ${prereq}`)
    }
  }
  const byId = new Map(skills.map((s) => [s.id, s]))
  const visiting = new Set<string>()
  const done = new Set<string>()
  const visit = (id: string): void => {
    if (done.has(id)) return
    if (visiting.has(id)) throw new Error(`Cicle al graf a ${id}`)
    visiting.add(id)
    for (const prereq of byId.get(id)?.prereqs ?? []) visit(prereq)
    visiting.delete(id)
    done.add(id)
  }
  for (const skill of skills) visit(skill.id)
}

/** All transitive prerequisites of a skill. */
export function ancestorsOf(skills: readonly SkillNode[], skillId: string): Set<string> {
  const byId = new Map(skills.map((s) => [s.id, s]))
  const result = new Set<string>()
  const stack = [...(byId.get(skillId)?.prereqs ?? [])]
  while (stack.length > 0) {
    const id = stack.pop() as string
    if (result.has(id)) continue
    result.add(id)
    stack.push(...(byId.get(id)?.prereqs ?? []))
  }
  return result
}

export function isUnlocked(skill: SkillNode, masteryOf: (skillId: string) => number): boolean {
  return skill.prereqs.every((prereq) => masteryOf(prereq) >= UNLOCK_AT)
}
