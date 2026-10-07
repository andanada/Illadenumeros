import type { z } from 'zod'

/** Error with an HTTP status and a stable machine-readable code. Messages never contain user content. */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly issues?: readonly Issue[],
    readonly headers?: Readonly<Record<string, string>>,
  ) {
    super(code)
  }
}

export interface Issue {
  readonly path: string
  readonly code: string
}

export const MAX_REPORTED_ISSUES = 5

/** Reduces zod issues to path + code. zod messages can echo the received value, so they are dropped. */
export function toIssues(error: z.ZodError): Issue[] {
  return error.issues.slice(0, MAX_REPORTED_ISSUES).map((i) => ({ path: i.path.join('.'), code: i.code }))
}

/** Parses untrusted input with zod or throws a 422 listing the first few issues (no content echoed). */
export function parseInput<S extends z.ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) throw new HttpError(422, 'validation_failed', toIssues(parsed.error))
  return parsed.data as z.infer<S>
}

export const notFound = (): HttpError => new HttpError(404, 'not_found')
