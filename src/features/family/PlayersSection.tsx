import { useProgress } from '../../core/progress/store'
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

  return (
    <Card title="Jugadors" tilt={-0.3}>
      <ul className="flex flex-col gap-3">
        {players.map((player) => (
          <PlayerRow
            key={player.id}
            player={player}
            active={player.id === activePlayerId}
            onRename={(name) => useProgress.getState().renamePlayer(player.id, { name })}
            onDelete={async () => {
              const wasActive = player.id === useProgress.getState().activePlayerId
              const ok = await useProgress.getState().deletePlayer(player.id)
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
