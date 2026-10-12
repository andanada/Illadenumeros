import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jarMessage } from './jarMessage'
import { StarJar } from './StarJar'

const speak = vi.hoisted(() => vi.fn())
vi.mock('../../core/audio/speech', () => ({ speak, isMuted: () => true, setMuted: vi.fn() }))
vi.mock('../scene/worldSfx', () => ({ worldSfx: { squish: vi.fn() } }))
vi.mock('../../core/audio/sfx', () => ({ unlockAudio: vi.fn() }))

afterEach(() => {
  cleanup()
  speak.mockClear()
})

describe('StarJar speaks', () => {
  const jar = { level: 0.5, minutesLeft: 6, done: false }

  it('reads its note aloud when opened, exactly the sentence shown (so it has a clip), and not when closed', async () => {
    render(<StarJar jar={jar} />)
    await userEvent.click(screen.getByRole('button', { name: /Tarro d’estrelles/ }))
    expect(speak).toHaveBeenCalledExactlyOnceWith(jarMessage(jar))
    expect(screen.getByRole('status')).toHaveTextContent(jarMessage(jar))
    await userEvent.click(screen.getByRole('button', { name: /Tarro d’estrelles/ }))
    expect(speak).toHaveBeenCalledTimes(1)
  })
})
