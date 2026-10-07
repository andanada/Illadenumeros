/**
 * Tells the other tabs of the app that the list of players changed (created, renamed, deleted),
 * so a tab never keeps playing as a player that was deleted elsewhere.
 */
const CHANNEL = 'mates-magiques-players'

const open = (): BroadcastChannel | undefined => (typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : undefined)

export function notifyPlayersChanged(): void {
  try {
    const channel = open()
    channel?.postMessage('changed')
    channel?.close()
  } catch {
    // Best effort: without BroadcastChannel the other tab notices on its next start.
  }
}

/** Calls `listener` when another tab changes the players. Returns the unsubscribe function. */
export function onPlayersChanged(listener: () => void): () => void {
  const channel = open()
  if (!channel) return () => undefined
  channel.onmessage = () => listener()
  return () => channel.close()
}
