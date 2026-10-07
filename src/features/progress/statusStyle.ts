import type { SkillStatus } from '../../core/engine/mastery'

interface StatusStyle {
  label: string
  symbol: string
  className: string
}

export const STATUS_STYLE: Record<SkillStatus, StatusStyle> = {
  nova: { label: 'Nova', symbol: '○', className: 'bg-white text-ink border-dashed' },
  aprenent: { label: 'Aprenent', symbol: '◔', className: 'bg-cel/60 text-ink' },
  consolidant: { label: 'Consolidant', symbol: '◑', className: 'bg-sol text-ink' },
  dominada: { label: 'Dominada', symbol: '★', className: 'bg-ok text-white' },
  bloquejada: { label: 'Bloquejada', symbol: '🔒', className: 'bg-ink/10 text-ink/70 border-dotted' },
}
