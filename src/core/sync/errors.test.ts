import { describe, expect, it } from 'vitest'
import { ApiError } from './api'
import { describeError } from './errors'

const err = (status: number, code: string, extra: Partial<Pick<ApiError, 'issues' | 'retryAfterMs'>> = {}) =>
  new ApiError(status, code, extra.issues, extra.retryAfterMs)

describe('describeError (Catalan, friendly)', () => {
  it.each([
    [err(403, 'invalid_invite'), /codi d’invitació/],
    [err(403, 'registration_closed'), /no es poden crear comptes/],
    [err(422, 'validation_failed', { issues: [{ path: 'password', code: 'custom' }] }), /contrasenya.*10 caràcters/],
    [err(422, 'validation_failed', { issues: [{ path: 'new', code: 'too_small' }] }), /contrasenya.*10 caràcters/],
    [err(422, 'validation_failed', { issues: [{ path: 'email', code: 'invalid_string' }] }), /correu/],
    [err(422, 'validation_failed'), /dades/],
    [err(401, 'invalid_credentials'), /correu o la contrasenya/],
    [err(403, 'invalid_credentials'), /contrasenya no és correcta/],
    [err(409, 'email_taken'), /ja té un compte/],
    [err(429, 'too_many_attempts', { retryAfterMs: 120_000 }), /2 minuts/],
    [err(429, 'rate_limited', { retryAfterMs: 30_000 }), /30 segons/],
    [err(429, 'rate_limited'), /Massa intents/],
    [err(0, 'network'), /Sense connexió/],
    [err(0, 'timeout'), /no respon/],
    [err(503, 'server_busy'), /no està disponible/],
    [err(500, 'internal_error'), /no està disponible/],
    [err(409, 'quota_exceeded'), /límit/],
    [err(409, 'profile_limit'), /màxim de jugadors/],
    [err(401, 'unauthorized'), /sessió/],
    [err(200, 'bad_response'), /resposta/],
    [err(403, 'csrf_rejected'), /No s’ha pogut/],
    [new Error('boom'), /No s’ha pogut/],
    ['whatever', /No s’ha pogut/],
  ])('%#', (input, expected) => {
    expect(describeError(input)).toMatch(expected)
  })
})
