import { motion, type HTMLMotionProps } from 'motion/react'
import { sfx, unlockAudio } from '../core/audio/sfx'

type Variant = 'primary' | 'soft' | 'ghost' | 'ok' | 'almost' | 'punk'

const VARIANTS: Record<Variant, string> = {
  primary: 'sticker bg-brand text-white',
  soft: 'sticker bg-white text-brand-dark',
  ghost: 'bg-transparent text-brand-dark',
  ok: 'sticker bg-ok text-white',
  almost: 'sticker bg-almost text-white',
  punk: 'sticker bg-punk text-white',
}

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant
  big?: boolean
  /** Sticker tilt in degrees; gives each button its hand-placed look. */
  tilt?: number
  children: React.ReactNode
}

/** Touch-first sticker button: at least 64 px tall, soft tap sound, presses flat like a sticker. */
export function Button({ variant = 'primary', big = false, tilt = 0, className = '', children, onClick, style, ...rest }: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.94, rotate: 0 }}
      whileHover={{ scale: 1.04 }}
      type="button"
      onClick={(event) => {
        unlockAudio()
        sfx.tap()
        onClick?.(event)
      }}
      style={{ rotate: tilt, ...style }}
      className={`min-h-16 rounded-[1.6rem] px-7 font-bold tracking-tight ${big ? 'text-3xl' : 'text-2xl'} disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  )
}
