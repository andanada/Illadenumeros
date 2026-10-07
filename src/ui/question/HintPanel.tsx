import { motion } from 'motion/react'
import type { Item } from '../../core/ambit/types'
import type { CharacterId } from '../../core/storage/db'
import type { HintLevel } from '../../features/play/useQuestionFlow'
import { Button } from '../Button'
import { Mascot } from '../mascot/Mascot'
import { VisualModelView } from '../visual/VisualModelView'

/** Friendly speech bubble from the child's character. Never red, never a "wrong" message. */
export function HintPanel({
  item,
  level,
  character,
  onContinue,
}: {
  item: Item
  level: Exclude<HintLevel, 0>
  character: CharacterId
  onContinue: () => void
}) {
  const text = item.hints[level - 1]
  return (
    <motion.section
      aria-live="polite"
      aria-label="Ajuda"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3"
    >
      <p className="rounded-full bg-almost/15 px-4 py-1 text-lg font-bold text-almost">Gairebé! Mirem-ho junts</p>
      {item.hintVisual.kind !== 'none' && (
        <div className="rounded-3xl bg-white/80 p-3">
          <VisualModelView model={item.hintVisual} size="sm" animate={level === 1} />
        </div>
      )}
      <div className="flex items-end gap-3">
        <Mascot character={character} mood={level === 3 ? 'anims' : 'pensa'} size={84} />
        <p className="sticker relative max-w-md rounded-3xl bg-white px-5 py-3 text-xl font-semibold leading-snug text-ink">{text}</p>
      </div>
      {level === 3 && (
        <Button big variant="primary" tilt={-1} onClick={onContinue}>
          Continua
        </Button>
      )}
    </motion.section>
  )
}
