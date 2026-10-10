import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import type { PetId } from '../../../characters'
import { PET_IDS } from '../../../characters'
import type { AvatarSpec } from '../../../model/types'
import { CastProvider, useCast } from '../../../sandbox/CastContext'
import { MEMBERS } from './family'

/** Everybody who lives here: the child, the family and the adopted pet (who follows the child, also up the stairs). */
export function houseSeeds(avatar: AvatarSpec, name: string, pet: PetId | undefined): readonly object[] {
  return [
    { id: 'jo', kind: 'avatar', name, at: { x: 0.3, y: 0.86 }, avatar },
    ...MEMBERS.map((m) => ({ id: m.id, kind: 'neighbour', name: m.name, at: m.at, neighbour: m.preset, facing: m.facing, loves: ['poma', 'plat', 'pilota'] })),
    ...(pet ? [{ id: 'mascota', kind: 'pet', name: 'la mascota', at: { x: 0.22, y: 0.9 }, pet, follow: 'jo' }] : []),
  ]
}

export const firstPet = (pets: readonly string[]): PetId | undefined => pets.find((p): p is PetId => (PET_IDS as readonly string[]).includes(p))

/** Puts each family member on their own floor at the start (the cast starts everyone on the ground floor). */
function Settle() {
  const cast = useCast()
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    for (const m of MEMBERS) if (m.floor !== 'baixa') cast.enterRoom(m.id, m.floor, m.at)
  })
  return null
}

export function HouseCast({ avatar, name, pet, children }: { avatar: AvatarSpec; name: string; pet: PetId | undefined; children: ReactNode }) {
  const seeds = useMemo(() => houseSeeds(avatar, name, pet), [avatar, name, pet])
  return (
    <CastProvider seeds={seeds} initialSelected="jo" defaultRoom="baixa">
      <Settle />
      {children}
    </CastProvider>
  )
}
