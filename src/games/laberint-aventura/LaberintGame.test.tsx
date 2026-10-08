import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress } from '../../core/progress/store'
import { emptyRewards } from '../../core/storage/db'
import type { AnswerResult } from '../../features/play/useQuestionFlow'
import { makeTestFlow, makeTestItem } from '../shared/testUtils'
import { LaberintGame } from './LaberintGame'

const flow = makeTestFlow(makeTestItem('A4'))
const useQuestionFlow = vi.fn((_options: unknown) => flow)

vi.mock('../../features/play/useQuestionFlow', () => ({ useQuestionFlow: (options: unknown) => useQuestionFlow(options) }))
vi.mock('../../core/audio/speech', () => ({ speak: vi.fn(), isMuted: () => true, setMuted: vi.fn(), stopSpeaking: vi.fn() }))
vi.mock('../../core/audio/sfx', () => ({ sfx: { correct: vi.fn(), almost: vi.fn(), tap: vi.fn(), star: vi.fn(), pop: vi.fn(), fanfare: vi.fn() }, unlockAudio: vi.fn() }))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('../../ui/QuestionCard', () => ({
  QuestionCard: ({ onResult, onContinue }: { onResult: (r: AnswerResult) => void; onContinue: () => void }) => (
    <div>
      <button onClick={() => onResult({ correct: true, itemDone: true })}>Encerta</button>
      <button onClick={() => onResult({ correct: false, itemDone: false })}>Falla</button>
      <button onClick={onContinue}>Avança</button>
    </div>
  ),
}))

const grantSticker = vi.fn(async () => 'maduixa' as string | undefined)

beforeEach(() => {
  vi.mocked(flow.next).mockClear()
  useQuestionFlow.mockClear()
  grantSticker.mockClear()
  useProgress.setState({
    loaded: true,
    profile: { id: 'me', name: 'Laia', character: 'nyx', color: 'rosa', diagnosticDone: true, createdAt: 1 },
    rewards: emptyRewards(),
    grantSticker,
  })
})

async function passJunction(mistakes = 0): Promise<void> {
  for (let i = 0; i < mistakes; i++) await userEvent.click(screen.getByRole('button', { name: 'Falla' }))
  await userEvent.click(screen.getByRole('button', { name: 'Encerta' }))
  await userEvent.click(screen.getByRole('button', { name: 'Avança' }))
}

describe('LaberintGame', () => {
  it('draws its questions from the skills it is given, with the normal flow', () => {
    render(<LaberintGame skillIds={['A4', 'A5', 'A6']} maxRounds={4} onExit={vi.fn()} onComplete={vi.fn()} />)
    expect(useQuestionFlow).toHaveBeenCalledWith({ gameId: 'laberint-aventura', skillIds: ['A4', 'A5', 'A6'] })
    expect(screen.getByRole('img', { name: /has passat 0 encreuaments de 4/ })).toBeInTheDocument()
  })

  it('walks one junction per finished question and opens the chest at the end', async () => {
    const onComplete = vi.fn()
    render(<LaberintGame skillIds={['A4']} maxRounds={4} onExit={vi.fn()} onComplete={onComplete} />)
    await passJunction()
    expect(screen.getByRole('img', { name: /has passat 1 encreuaments de 4/ })).toBeInTheDocument()
    await passJunction()
    await passJunction()
    expect(flow.next).toHaveBeenCalledTimes(3)
    await passJunction()
    expect(flow.next).toHaveBeenCalledTimes(3)

    expect(screen.getByRole('img', { name: /has arribat al cofre/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Obrir el cofre' }))
    expect(grantSticker).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('img', { name: 'Pegatina nova: Maduixa' })).toBeInTheDocument()
    expect(onComplete).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Continua' }))
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0]?.[0]).toMatchObject({ answered: 4, correct: 4 })
  })

  it('only counts questions solved at the first try as correct, and never blocks the path', async () => {
    const onComplete = vi.fn()
    render(<LaberintGame maxRounds={4} onExit={vi.fn()} onComplete={onComplete} />)
    await passJunction(1)
    await passJunction()
    await passJunction()
    await passJunction()
    await userEvent.click(screen.getByRole('button', { name: 'Obrir el cofre' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Continua' }))
    expect(onComplete.mock.calls[0]?.[0]).toMatchObject({ answered: 4, correct: 3 })
  })

  it('says so when the album is already complete', async () => {
    grantSticker.mockResolvedValueOnce(undefined)
    render(<LaberintGame maxRounds={4} onExit={vi.fn()} onComplete={vi.fn()} />)
    for (let i = 0; i < 4; i++) await passJunction()
    await userEvent.click(screen.getByRole('button', { name: 'Obrir el cofre' }))
    expect(await screen.findByText(/Ja tens totes les pegatines/)).toBeInTheDocument()
  })

  it('goes back through the shell button', async () => {
    const onExit = vi.fn()
    render(<LaberintGame maxRounds={4} onExit={onExit} onComplete={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Enrere' }))
    expect(onExit).toHaveBeenCalledTimes(1)
  })
})
