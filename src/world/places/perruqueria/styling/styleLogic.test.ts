import { describe, expect, it } from 'vitest'
import { NEIGHBOURS_BY_ID } from '../../../characters'
import { HAIR_CHAIN, inProgress, mirrorTarget, restyle, stageOf, toolOn, type Progress, type Tool } from './styleLogic'

const base = NEIGHBOURS_BY_ID['la-fatima']!.spec
const ALL: readonly Tool[] = ['dutxa', 'pinta', 'tisores', 'esprai', 'assecador', 'pinces']

const run = (tools: readonly Tool[]): Progress => tools.reduce<Progress>((p, t) => toolOn(p, 'c', t).progress, {})

describe('hair chain', () => {
  it('goes wash, comb, cut, colour, dry, clip in order', () => {
    expect(stageOf(run(ALL), 'c')).toBe(HAIR_CHAIN.stages.length - 1)
  })
  it('a tool out of order says what comes first and changes nothing', () => {
    const r = toolOn({}, 'c', 'tisores')
    expect(r.outcome.kind).toBe('wait')
    expect(r.progress).toEqual({})
    expect(r.outcome.say).toMatch(/rentar|pentinar/)
  })
  it('after the last step the customer is done', () => {
    expect(toolOn(run(ALL), 'c', 'dutxa').outcome.kind).toBe('done')
  })
  it('does not mutate the progress it is given', () => {
    const p: Progress = Object.freeze({})
    toolOn(p, 'c', 'dutxa')
    expect(p).toEqual({})
  })
  it('lists who is in the middle of it', () => {
    expect(inProgress(run(['dutxa']))).toEqual(['c'])
    expect(inProgress(run(ALL))).toEqual([])
  })
})

describe('restyle', () => {
  it('changes the cut at stage 3, the colour at 4 and pins a clip at 6; earlier stages change nothing', () => {
    expect(restyle(base, 2, 0)).toEqual(base)
    expect(restyle(base, 3, 0).hair.style).not.toBe(base.hair.style)
    expect(restyle(base, 4, 0).hair.color).not.toBe(base.hair.color)
    expect(restyle(base, 6, 0).accessory?.item).toBeDefined()
  })
  it('differs by customer and never mutates the base', () => {
    const copy = JSON.stringify(base)
    expect(restyle(base, 4, 1).hair.color).not.toBe(restyle(base, 4, 2).hair.color)
    expect(JSON.stringify(base)).toBe(copy)
  })
})

describe('mirror', () => {
  it('shows the first chair, else the last one touched', () => {
    expect(mirrorTarget([undefined, 'b'], 'z')).toBe('b')
    expect(mirrorTarget([undefined, undefined], 'z')).toBe('z')
  })
})
