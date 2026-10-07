export interface ShareSplit {
  groups: number
  perPlate: number
  leftover: number
}

/** Fair sharing of `total` between `groups` plates: items per plate and what is left over. */
export function shareSplit(total: number, groups: number): ShareSplit {
  const g = Math.max(1, Math.floor(groups))
  const t = Math.max(0, Math.floor(total))
  return { groups: g, perPlate: Math.floor(t / g), leftover: t % g }
}

/** Items per plate given how many were already dealt one by one (round-robin). */
export function dealtPerPlate(dealt: number, groups: number): number[] {
  const g = Math.max(1, Math.floor(groups))
  const d = Math.max(0, Math.floor(dealt))
  return Array.from({ length: g }, (_, i) => Math.floor(d / g) + (i < d % g ? 1 : 0))
}

/**
 * Partition of a collection for a fraction: `parts` equal groups, `selected` of them highlighted.
 * Returns the group size and how many items are highlighted.
 */
export function collectionGroups(collection: number, parts: number, selected: number): { groupSize: number; highlighted: number } {
  const p = Math.max(1, Math.floor(parts))
  const groupSize = Math.max(1, Math.floor(collection / p))
  return { groupSize, highlighted: Math.min(p, Math.max(0, Math.floor(selected))) * groupSize }
}

/** SVG path of a pie slice from angle a0 to a1 (radians, 0 = top, clockwise). */
export function slicePath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const pt = (a: number): string => `${(cx + r * Math.sin(a)).toFixed(2)} ${(cy - r * Math.cos(a)).toFixed(2)}`
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${pt(a0)} A ${r} ${r} 0 ${large} 1 ${pt(a1)} Z`
}
