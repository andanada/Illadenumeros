/**
 * All state-changing operations run one after another, so two quick taps (or a sticker granted
 * while an answer is being saved) can never read stale state and overwrite each other. Switching
 * player goes through the same queue, so it always waits for the previous player's writes.
 */
let writeChain: Promise<unknown> = Promise.resolve()

export function serialised<T>(task: () => Promise<T>): Promise<T> {
  const run = writeChain.then(task, task)
  writeChain = run.catch(() => undefined)
  return run
}

export class PlayerSwitchedError extends Error {
  constructor() {
    super('El jugador ha canviat abans de desar aquesta resposta')
    this.name = 'PlayerSwitchedError'
  }
}

/**
 * Like `serialised`, for writes that belong to one player: the player active when the call was
 * made. If another player became active before the task runs (a switch was queued in between),
 * `onStale` runs instead, so player A's answer can never land in player B's database or state.
 */
export function serialisedFor<T>(
  playerAtCall: string | undefined,
  activeNow: () => string | undefined,
  task: () => Promise<T>,
  onStale: () => T,
): Promise<T> {
  return serialised(async () => (playerAtCall !== undefined && activeNow() === playerAtCall ? task() : onStale()))
}
