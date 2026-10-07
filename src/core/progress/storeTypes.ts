import type { StoreApi } from 'zustand'
import type { Placement } from '../engine/diagnostic'
import type { Profile } from '../storage/db'
import type { PlayerSummary } from '../storage/registry'
import type { AnswerInput, AnswerOutcome } from './applyAnswer'
import type { PlayerData } from './playerData'

export type NewProfile = Pick<Profile, 'name' | 'character' | 'color'>
export type PlayerPatch = Partial<NewProfile>
export type RecordInput = Omit<AnswerInput, 'sessionId' | 'now' | 'skill'> & { skillId: string }
export type { PlayerSummary }

export interface ProgressStore extends PlayerData {
  loaded: boolean
  /** True when the browser could not read or write local storage; progress then lives in memory only. */
  storageError: boolean
  /** Players of this device, oldest first. */
  players: PlayerSummary[]
  /** Player whose data fills the fields below; undefined on the "Qui juga?" screen. */
  activePlayerId: string | undefined
  sessionId: string
  sessionResults: boolean[]

  /** App start: loads (or adopts/rebuilds) the players and selects the only one, if there is just one. */
  init: () => Promise<void>
  /** Reloads the list of players from the registry. */
  loadRegistry: () => Promise<void>
  /** Reloads the active player's data from their database. */
  load: () => Promise<void>
  selectPlayer: (id: string) => Promise<boolean>
  createPlayer: (input: NewProfile) => Promise<string>
  renamePlayer: (id: string, patch: PlayerPatch) => Promise<boolean>
  /** Deletes the player's whole database on this device. Resolves false (and changes nothing) if it fails. */
  deletePlayer: (id: string) => Promise<boolean>
  clearActivePlayer: () => Promise<void>
  /** Another tab changed the players: reload them, and stop playing as a player deleted there. */
  syncPlayers: () => Promise<void>

  saveProfile: (profile: NewProfile) => Promise<void>
  finishDiagnostic: (placement: Record<string, Placement>) => Promise<void>
  record: (input: RecordInput) => Promise<AnswerOutcome>
  grantSticker: () => Promise<string | undefined>
  completeMission: () => Promise<void>
  /** Erases the active player's progress (keeps name, character and colour). Resolves false if the write fails. */
  resetAll: () => Promise<boolean>
}

export type SetState = StoreApi<ProgressStore>['setState']
export type GetState = StoreApi<ProgressStore>['getState']
