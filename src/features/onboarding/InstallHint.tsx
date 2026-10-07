import { useState } from 'react'

function isInstalled(): boolean {
  if (typeof window === 'undefined') return true
  const standaloneNav = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return standaloneNav || window.matchMedia?.('(display-mode: standalone)').matches === true
}

/** Small, secondary hint; hidden once the app runs installed. */
export function InstallHint() {
  const [open, setOpen] = useState(false)
  if (isInstalled()) return null
  return (
    <div className="max-w-sm text-base text-ink/70">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="min-h-12 rounded-full px-4 font-semibold underline decoration-dotted underline-offset-4"
      >
        Com instal·lar l’app
      </button>
      {open && (
        <p className="mt-1 rounded-2xl bg-white/80 p-3 text-left">
          A l’iPad: toca <strong>Comparteix</strong> (el quadrat amb la fletxa) i després{' '}
          <strong>Afegeix a la pantalla d’inici</strong>. A l’ordinador: busca la icona d’instal·lar a la barra del navegador.
        </p>
      )}
    </div>
  )
}
