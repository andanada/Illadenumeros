import { motion } from 'motion/react'
import { sfx, unlockAudio } from '../../core/audio/sfx'
import { Button } from '../../ui/Button'
import { canJump, jumpLabel, JUMPS, type Jump } from './jumpLogic'

const STYLE: Record<Jump, string> = {
  10: 'bg-chicle text-white',
  1: 'bg-cel text-ink',
  [-10]: 'bg-sol text-ink',
  [-1]: 'bg-menta text-ink',
}

const NAME: Record<Jump, string> = {
  10: 'Salta 10 endavant',
  1: 'Salta 1 endavant',
  [-10]: 'Salta 10 enrere',
  [-1]: 'Salta 1 enrere',
}

export interface JumpControlsProps {
  position: number
  disabled: boolean
  canUndo: boolean
  canConfirm: boolean
  onJump: (jump: Jump) => void
  onUndo: () => void
  onConfirm: () => void
}

/** Four big jump stickers (+10, +1, −10, −1), plus undo and "Ja hi sóc". */
export function JumpControls({ position, disabled, canUndo, canConfirm, onJump, onUndo, onConfirm }: JumpControlsProps) {
  return (
    <div className="flex flex-col items-center gap-3 p-2">
      <div className="flex flex-wrap items-center justify-center gap-4" role="group" aria-label="Salts">
        {JUMPS.map((jump, i) => (
          <motion.button
            key={jump}
            type="button"
            aria-label={NAME[jump]}
            disabled={disabled || !canJump(position, jump)}
            whileTap={{ scale: 0.88, rotate: 0 }}
            whileHover={{ scale: 1.06 }}
            onClick={() => {
              unlockAudio()
              sfx.tap()
              onJump(jump)
            }}
            style={{ rotate: (i % 2 === 0 ? -2 : 2) }}
            className={`sticker min-h-[4.5rem] min-w-[6.5rem] rounded-[1.6rem] px-5 text-4xl font-bold disabled:opacity-35 ${STYLE[jump]}`}
          >
            {jumpLabel(jump)}
          </motion.button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button variant="soft" disabled={disabled || !canUndo} onClick={onUndo}>
          ↶ Torna enrere
        </Button>
        {canConfirm && (
          <Button variant="primary" disabled={disabled} onClick={onConfirm}>
            Ja hi sóc
          </Button>
        )}
      </div>
    </div>
  )
}
