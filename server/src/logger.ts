import { pino, type Logger } from 'pino'

/**
 * Structured logger. Request bodies, headers, cookies and IPs are never logged:
 * the redact list is a second line of defence in case someone logs an object by mistake.
 */
export function createLogger(level: string): Logger {
  return pino({
    level,
    redact: {
      paths: ['password', 'current', 'new', 'inviteCode', 'email', 'req.headers', 'headers', 'body', 'token'],
      censor: '[redacted]',
    },
  })
}
