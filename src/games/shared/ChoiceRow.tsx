import { motion } from 'motion/react'
import type { Choice } from '../../core/ambit/types'
import { sfx, unlockAudio } from '../../core/audio/sfx'

const COLORS = ['bg-chicle', 'bg-cel', 'bg-menta', 'bg-sol'] as const

/** Big round number stickers for answering. Already-tried wrong values fade out (never red). */
export function ChoiceRow({
  choices,
  wrongValues,
  disabled,
  onPick,
}: {
  choices: readonly Choice[]
  wrongValues: readonly string[]
  disabled?: boolean
  onPick: (choice: Choice) => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 p-2" role="group" aria-label="Respostes">
      {choices.map((choice, i) => {
        const tried = wrongValues.includes(choice.value)
        return (
          <motion.button
            key={choice.value}
            type="button"
            aria-label={`Resposta ${choice.value}`}
            disabled={disabled || tried}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.06 }}
            onClick={() => {
              unlockAudio()
              sfx.tap()
              onPick(choice)
            }}
            style={{ rotate: (i % 2 === 0 ? -1 : 1) * 3 }}
            className={`sticker grid size-[5.5rem] place-items-center rounded-full text-5xl font-bold text-ink disabled:opacity-35 ${COLORS[i % COLORS.length]}`}
          >
            {choice.value}
          </motion.button>
        )
      })}
    </div>
  )
}
