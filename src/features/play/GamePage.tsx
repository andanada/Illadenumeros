import { Suspense, useCallback, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageLoader } from '../../app/PageLoader'
import { useProgress } from '../../core/progress/store'
import { Screen } from '../../ui/Screen'
import { GAME_REGISTRY, isGameId } from './gameRegistry'
import { GameSummaryView } from './GameSummaryView'
import { GAME_TITLES, type GameSummary } from './gameTypes'

const MAX_URL_ROUNDS = 50

/** Free play: `/play/:gameId?skills=A4,A5`. No round limit; shows a summary if the game ends by itself. */
export default function GamePage() {
  const { gameId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const character = useProgress((s) => s.profile?.character) ?? 'melo'
  const [summary, setSummary] = useState<GameSummary>()
  const [round, setRound] = useState(0)

  const skillIds = useMemo(() => {
    const raw = params.get('skills')
    const ids = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : []
    return ids.length > 0 ? ids : undefined
  }, [params])

  /** Optional round limit (`?rounds=3`), so a short game can be played to its end screen. */
  const maxRounds = useMemo(() => {
    const value = Number(params.get('rounds'))
    return Number.isInteger(value) && value >= 1 && value <= MAX_URL_ROUNDS ? value : undefined
  }, [params])

  const toMap = useCallback(() => navigate('/poble'), [navigate])
  const replay = useCallback(() => {
    setSummary(undefined)
    setRound((r) => r + 1)
  }, [])

  if (!isGameId(gameId)) return <Navigate to="/poble" replace />
  const Game = GAME_REGISTRY[gameId]
  if (!Game) return <Navigate to="/poble" replace />

  if (summary) {
    return (
      <Screen title={GAME_TITLES[gameId]}>
        <GameSummaryView summary={summary} character={character} onReplay={replay} onMap={toMap} />
      </Screen>
    )
  }
  return (
    <Suspense fallback={<PageLoader />}>
      <Game key={round} {...(skillIds ? { skillIds } : {})} {...(maxRounds ? { maxRounds } : {})} onExit={toMap} onComplete={setSummary} />
    </Suspense>
  )
}
