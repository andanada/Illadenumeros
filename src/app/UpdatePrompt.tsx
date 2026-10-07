import { useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { Button } from '../ui/Button'

/** Registers the service worker and politely offers an update; never interrupts a game. */
export function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const update = useRef<(reload?: boolean) => Promise<void>>(undefined)

  useEffect(() => {
    update.current = registerSW({ onNeedRefresh: () => setNeedRefresh(true) })
  }, [])

  if (!needRefresh) return null
  return (
    <div role="status" className="sticker fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-3xl bg-white p-3 pl-5">
      <p className="text-lg font-bold text-brand-dark">Hi ha coses noves!</p>
      <div className="flex gap-2">
        <Button variant="ghost" className="px-4 text-lg" onClick={() => setNeedRefresh(false)}>
          Més tard
        </Button>
        <Button className="px-5 text-lg" onClick={() => void update.current?.(true)}>
          Actualitzar
        </Button>
      </div>
    </div>
  )
}
