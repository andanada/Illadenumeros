import { z } from 'zod'
import { profileSchema } from '../../core/storage/db'

/** Name rules come straight from the stored profile schema (1-20 chars after trimming). */
const nameField = profileSchema.shape.name
export const nameFormSchema = z.object({ name: nameField })

export type NameCheck = { ok: true; name: string } | { ok: false; message: string }

export function validateName(raw: string): NameCheck {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return { ok: false, message: 'Escriu el teu nom' }
  const result = nameFormSchema.safeParse({ name: raw })
  if (!result.success) return { ok: false, message: 'El nom és massa llarg (màxim 20 lletres)' }
  return { ok: true, name: result.data.name }
}
