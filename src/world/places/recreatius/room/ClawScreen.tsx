import { ClawMachine } from '../machines/ClawMachine'

const pill = 'min-h-16 rounded-full bg-white px-6 text-xl font-bold text-[var(--world-ink,#2b2440)] shadow-[var(--world-shadow-lift)] active:translate-y-0.5'

/** The claw machine up close. A toy that drops into the chute is a real toy: take it from the tray in the room. */
export function ClawScreen({ lit, compact, onPrize, onClose }: { lit: boolean; compact: boolean; onPrize: () => void; onClose: () => void }) {
  return (
    <div role="dialog" aria-label="La màquina de la grua" data-testid="claw-screen" className="absolute inset-0 z-[3600] flex flex-col items-center gap-3 overflow-y-auto bg-[#2b2440]/60 p-3 pt-[88px]">
      <ClawMachine lit={lit} compact={compact} onPrize={onPrize} />
      <button type="button" onClick={onClose} className={pill}>
        Torna a la sala
      </button>
    </div>
  )
}
