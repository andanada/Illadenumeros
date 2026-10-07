import { useProgress } from '../../core/progress/store'
import { useAccount } from '../../core/sync/accountStore'
import { Card } from './Card'
import { PlayerRow } from './PlayerRow'

export interface PlayersSectionProps {
  /** Called after a delete, with whether it was the player who is playing now. */
  onDeleted: (wasActive: boolean, remaining: number) => void
}

/** Every child of this device: rename, or delete one child's progress (on this device only). */
export function PlayersSection({ onDeleted }: PlayersSectionProps) {
  const players = useProgress((s) => s.players)
  const activePlayerId = useProgress((s) => s.activePlayerId)
  const activeName = useProgress((s) => s.profile?.name)
  const cloud = useAccount((s) => s.status === 'loggedIn' || s.status === 'offline')

  return (
    <Card title="Jugadors" tilt={-0.3}>
      <ul className="flex flex-col gap-3">
        {players.map((player) => (
          <PlayerRow
            key={player.id}
            player={player}
            active={player.id === activePlayerId}
            cloud={cloud}
            onRename={(name) => useProgress.getState().renamePlayer(player.id, { name })}
            onDelete={async () => {
              const wasActive = player.id === useProgress.getState().activePlayerId
              const ok = await useProgress.getState().deletePlayer(player.id)
              // Logged in: also delete it from the family account (best effort; remembered if offline).
              if (ok) void useAccount.getState().forgetPlayer(player.id)
              if (ok) onDeleted(wasActive, useProgress.getState().players.length)
              return ok
            }}
          />
        ))}
      </ul>
      {activeName && (
        <p className="text-base text-ink/70">
          La còpia de seguretat, la recuperació i «Començar de zero» d’aquí sota s’apliquen només a {activeName}, que és qui juga ara.
        </p>
      )}
    </Card>
  )
}
