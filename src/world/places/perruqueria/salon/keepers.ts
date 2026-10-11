/** Who sits where and what anybody carries: all the salon's life needs to know. */
export interface Seen {
  readonly seat?: string | undefined
  readonly carrying?: unknown
}

/**
 * Customers the clock must not send home: while any tool is on its way (somebody carries one), whoever sits in a
 * chair stays, so a tool never ends up on an empty chair because the customer left halfway through the walk.
 */
export function seatedKeepers(actors: Readonly<Record<string, Seen>>, customers: readonly string[], chairs: readonly string[]): string[] {
  const toolOnItsWay = Object.values(actors).some((a) => a.carrying)
  if (!toolOnItsWay) return []
  return customers.filter((id) => {
    const seat = actors[id]?.seat
    return seat !== undefined && chairs.includes(seat)
  })
}
