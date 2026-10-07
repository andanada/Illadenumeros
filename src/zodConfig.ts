import { z } from 'zod'

// Strict CSP (no 'unsafe-eval'): skip zod's code-generating fast path instead of letting it fail noisily.
// This module must be the FIRST import of the entry file, before any schema is created.
z.config({ jitless: true })
