export type TypedMatch = { kind: 'pick'; value: string } | { kind: 'wait'; value?: string } | { kind: 'none' }

/** Matches typed digits against the on-screen answers (1-2 digits). */
export function matchTyped(buffer: string, values: readonly string[]): TypedMatch {
  if (buffer === '') return { kind: 'none' }
  const exact = values.find((v) => v === buffer)
  const longer = values.some((v) => v.length > buffer.length && v.startsWith(buffer))
  if (exact !== undefined) return longer ? { kind: 'wait', value: exact } : { kind: 'pick', value: exact }
  return longer ? { kind: 'wait' } : { kind: 'none' }
}

export const digitFromKey = (key: string): string | undefined => (/^[0-9]$/.test(key) ? key : undefined)
