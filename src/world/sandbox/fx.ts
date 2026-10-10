import { unlockAudio } from '../../core/audio/sfx'
import { worldSfx } from '../scene/worldSfx'
import type { EmoteKind } from './logic/actorMachine'

/** Every sandbox sound goes through here (and through worldSfx's single audio context and mute switch). */
export const fx = {
  unlock: unlockAudio,
  pick: () => worldSfx.lift(),
  put: () => worldSfx.plop(),
  squish: () => worldSfx.squish(),
  no: () => worldSfx.boing(),
  open: () => worldSfx.doorOpen(),
  close: () => worldSfx.doorClose(),
  step: () => worldSfx.coin(),
  done: () => worldSfx.happy(),
  whoosh: () => worldSfx.whoosh(),
  footstep: () => worldSfx.step(),
  door: () => worldSfx.doorbell(),
}

const EMOTE_SOUND: Readonly<Record<EmoteKind, () => void>> = {
  cor: () => worldSfx.coin(),
  riure: () => worldSfx.squish(),
  uau: () => worldSfx.kaching(),
  son: () => worldSfx.purr(),
  salut: () => worldSfx.whoosh(),
  abraca: () => worldSfx.purr(),
  xoca: () => worldSfx.beep(),
}

export const emoteSound = (kind: EmoteKind): void => EMOTE_SOUND[kind]()

export const EMOTE_NAME: Readonly<Record<EmoteKind, string>> = {
  cor: 'Cor',
  riure: 'Riure',
  uau: 'Uau',
  son: 'Son',
  salut: 'Saluda',
  abraca: 'Abraça',
  xoca: 'Xoca els cinc',
}
