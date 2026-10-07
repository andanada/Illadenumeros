import { useProgress } from '../core/progress/store'

/** Shown only when the browser cannot save progress; written for the adult, not the child. */
export function StorageWarning() {
  const failed = useProgress((s) => s.storageError)
  if (!failed) return null
  return (
    <div role="alert" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl bg-sol px-4 py-3 text-center text-lg font-bold text-punk shadow-lg">
      El progrés no es pot desar en aquest navegador. Pots seguir jugant, però no es guardarà. Prova de sortir del mode privat.
    </div>
  )
}
