import { describe, expect, it } from 'vitest'
import { CLAW_MESSAGE, COLUMNS, dropClaw, grabToy, initialClaw, liftDone, moveClaw, refill, SLIP_EVERY, type ClawState } from './clawLogic'

const play = (s: ClawState = initialClaw()): ClawState => liftDone(grabToy(dropClaw(s)))

describe('claw machine', () => {
  it('slides inside the machine and only while it is not dropping', () => {
    let s = initialClaw()
    for (let i = 0; i < 9; i++) s = moveClaw(s, 1)
    expect(s.column).toBe(COLUMNS - 1)
    for (let i = 0; i < 9; i++) s = moveClaw(s, -1)
    expect(s.column).toBe(0)
    const dropping = dropClaw(s)
    expect(moveClaw(dropping, 1)).toBe(dropping)
    expect(dropClaw(dropping)).toBe(dropping)
  })

  it('grabs the toy under it', () => {
    const s = play()
    expect(s).toMatchObject({ phase: 'done', result: 'won', tries: 1 })
    expect(s.won).toHaveLength(1)
    expect(s.toys[2]).toBeUndefined()
  })

  it('every 4th try slips with a kind message, and the toy stays', () => {
    let s = play()
    s = play(moveClaw(s, 1))
    s = play(moveClaw(s, 1))
    s = moveClaw(moveClaw(moveClaw(s, -1), -1), -1)
    s = play(s)
    expect(s.tries).toBe(SLIP_EVERY)
    expect(s.result).toBe('slipped')
    expect(s.toys[1]).toBeDefined()
    expect(CLAW_MESSAGE.slipped).toMatch(/Gairebé/)
  })

  it('an empty column says so, and an emptied machine refills', () => {
    const again = play(play())
    expect(again.result).toBe('empty')
    const bare: ClawState = { ...initialClaw(), toys: [undefined, undefined, undefined, undefined, undefined] }
    expect(refill(bare).toys.every((t) => t !== undefined)).toBe(true)
    expect(refill(initialClaw())).toEqual(initialClaw())
  })

  it('grab and lift only follow a drop', () => {
    const idle = initialClaw()
    expect(grabToy(idle)).toBe(idle)
    expect(liftDone(idle)).toBe(idle)
  })
})
