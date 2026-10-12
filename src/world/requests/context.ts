import { MATES_SKILLS } from '../../ambits/mates/skills'
import { useProgress } from '../../core/progress/store'
import { daySeed, skillGroups, type BoardPlace } from '../board/boardPlan'
import type { GovernorContext } from './governor'

/** The open places the governor deals with; set by the town shell (one at a time). */
let openPlaces: readonly BoardPlace[] = []

export function setOpenPlaces(places: readonly BoardPlace[]): void {
  openPlaces = places
}

/** Seconds of maths the parents ask for per day; set when the day opens. */
let targetSeconds: number | undefined

export function setDailyMinutes(minutes: number): void {
  targetSeconds = minutes * 60
}

/** Governor context for `day` at `now`, from the child's current skill states (same weighting as the daily mission). */
export function governorContext(day: string, now: number, places: readonly BoardPlace[] = openPlaces): GovernorContext {
  const { skillStates, factStates } = useProgress.getState()
  const seed = daySeed(day)
  const { core, review } = skillGroups({ day, places, skills: MATES_SKILLS, states: skillStates, factStates }, seed)
  return { now, seed, places, core, review, ...(targetSeconds === undefined ? {} : { targetSeconds }) }
}
