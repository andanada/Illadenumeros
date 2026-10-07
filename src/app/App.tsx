import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { initSpeech } from '../core/audio/speech'
import { useProgress } from '../core/progress/store'
import { requestPersistentStorage } from '../core/storage/db'
import { onPlayersChanged } from '../core/storage/playersChannel'
import { ErrorBoundary } from './ErrorBoundary'
import { PageLoader } from './PageLoader'
import { RequireProfile } from './RequireProfile'
import { resolveHome } from './resolveHome'
import { StorageWarning } from './StorageWarning'
import { UpdatePrompt } from './UpdatePrompt'

const StartPage = lazy(() => import('../features/onboarding/StartPage'))
const OnboardingPage = lazy(() => import('../features/onboarding/OnboardingPage'))
const DiagnosticPage = lazy(() => import('../features/diagnostic/DiagnosticPage'))
const MapPage = lazy(() => import('../features/world-map/MapPage'))
const MissionPage = lazy(() => import('../features/daily-mission/MissionPage'))
const AlbumPage = lazy(() => import('../features/stickers/AlbumPage'))
const GamePage = lazy(() => import('../features/play/GamePage'))
const FamilyPage = lazy(() => import('../features/family/FamilyPage'))
const PlayerPickerPage = lazy(() => import('../features/players/PlayerPickerPage'))

function Home() {
  const profile = useProgress((s) => s.profile)
  const activePlayerId = useProgress((s) => s.activePlayerId)
  const playerCount = useProgress((s) => s.players.length)
  return <Navigate to={resolveHome({ playerCount, activePlayerId, profile })} replace />
}

export default function App() {
  const loaded = useProgress((s) => s.loaded)
  const color = useProgress((s) => s.profile?.color)

  useEffect(() => {
    initSpeech()
    void useProgress.getState().init()
    void requestPersistentStorage()
    return onPlayersChanged(() => void useProgress.getState().syncPlayers())
  }, [])

  // The active player's colour; the picker (nobody active) uses the default theme.
  useEffect(() => {
    if (color) document.documentElement.dataset.theme = color
    else delete document.documentElement.dataset.theme
  }, [color])

  if (!loaded) return <PageLoader />

  return (
    <ErrorBoundary>
      <HashRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/start" element={<StartPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/qui-juga" element={<PlayerPickerPage />} />
            <Route
              path="/diagnostic"
              element={
                <RequireProfile>
                  <DiagnosticPage />
                </RequireProfile>
              }
            />
            <Route
              path="/map"
              element={
                <RequireProfile>
                  <MapPage />
                </RequireProfile>
              }
            />
            <Route
              path="/mission"
              element={
                <RequireProfile>
                  <MissionPage />
                </RequireProfile>
              }
            />
            <Route
              path="/album"
              element={
                <RequireProfile>
                  <AlbumPage />
                </RequireProfile>
              }
            />
            <Route
              path="/play/:gameId"
              element={
                <RequireProfile>
                  <GamePage />
                </RequireProfile>
              }
            />
            <Route
              path="/familia"
              element={
                <RequireProfile>
                  <FamilyPage />
                </RequireProfile>
              }
            />
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
        <UpdatePrompt />
        <StorageWarning />
      </HashRouter>
    </ErrorBoundary>
  )
}
