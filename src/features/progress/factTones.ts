import type { HeatMode } from './analytics/factHeat'

/** Tailwind classes per tone (literal strings so the compiler sees them). */
export const TONE_CLASS: Record<string, string> = {
  buit: 'bg-white/50 border-ink/15 text-transparent',
  alta: 'bg-ok text-white border-white',
  mitjana: 'bg-sol text-ink border-white',
  baixa: 'bg-chicle/70 text-ink border-white',
  'caixa-0': 'bg-cel/15 text-ink border-white',
  'caixa-1': 'bg-cel/30 text-ink border-white',
  'caixa-2': 'bg-cel/45 text-ink border-white',
  'caixa-3': 'bg-cel/60 text-ink border-white',
  'caixa-4': 'bg-cel/80 text-ink border-white',
  'caixa-5': 'bg-brand text-white border-white',
  fluent: 'bg-ok text-white border-white',
  'no-fluent': 'bg-sol/70 text-ink border-white',
}

export interface LegendItem {
  tone: string
  symbol: string
  label: string
}

export const MODE_LEGEND: Record<HeatMode, LegendItem[]> = {
  precisio: [
    { tone: 'alta', symbol: '●', label: '80 % o més d’encerts' },
    { tone: 'mitjana', symbol: '◐', label: '50–79 %' },
    { tone: 'baixa', symbol: '○', label: 'Menys del 50 %' },
    { tone: 'buit', symbol: '', label: 'Encara no practicat' },
  ],
  caixa: [
    { tone: 'caixa-0', symbol: '0', label: 'Caixa 0 (nou)' },
    { tone: 'caixa-2', symbol: '2', label: 'Caixes 1 a 4: cada cop més segur' },
    { tone: 'caixa-5', symbol: '5', label: 'Caixa 5 (ben après)' },
    { tone: 'buit', symbol: '', label: 'Encara no practicat' },
  ],
  fluidesa: [
    { tone: 'fluent', symbol: '★', label: 'Fluid: ràpid i segur' },
    { tone: 'no-fluent', symbol: '…', label: 'Encara necessita temps' },
    { tone: 'buit', symbol: '', label: 'Encara no practicat' },
  ],
}
