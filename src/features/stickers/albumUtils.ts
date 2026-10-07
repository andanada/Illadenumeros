/** Same id always gives the same tilt (degrees, -7..7, never exactly 0), so the album looks hand-placed but stable. */
export function stableTilt(id: string): number {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  const tilt = (hash % 15) - 7
  return tilt === 0 ? 3 : tilt
}
