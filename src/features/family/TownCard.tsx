import { useEffect, useState } from 'react'
import { useProgress } from '../../core/progress/store'
import { DAILY_MINUTES_OPTIONS, DEFAULT_DAILY_MINUTES, readDailyMinutes, setDailyMinutes, type DailyMinutes } from '../../core/storage/meta'
import { getDb } from '../../core/storage/playerDbs'
import { Card, type Message } from './Card'

/** «Poble»: how much maths the town asks for each day (per player, saved on this device). */
export function TownCard({ childName, onMessage }: { childName: string | undefined; onMessage: (message: Message) => void }) {
  const playerId = useProgress((s) => s.activePlayerId)
  const [minutes, setMinutes] = useState<DailyMinutes>(DEFAULT_DAILY_MINUTES)

  useEffect(() => {
    let active = true
    Promise.resolve()
      .then(() => readDailyMinutes(getDb()))
      .then((value) => active && setMinutes(value))
      .catch(() => active && setMinutes(DEFAULT_DAILY_MINUTES))
    return () => {
      active = false
    }
  }, [playerId])

  const choose = (value: DailyMinutes): void => {
    const previous = minutes
    setMinutes(value)
    Promise.resolve()
      .then(() => setDailyMinutes(getDb(), value))
      .then(() => onMessage({ kind: 'ok', text: `Fet! Des de demà, el poble demanarà uns ${value} minuts de matemàtiques al dia.` }))
      .catch(() => {
        setMinutes(previous)
        onMessage({ kind: 'error', text: 'No s’ha pogut desar el canvi en aquest dispositiu. Torna-ho a provar.' })
      })
  }

  return (
    <Card title="Poble" tilt={-0.3}>
      <p className="text-lg leading-snug text-ink">
        Quantes matemàtiques demana el poble cada dia{childName ? ` a ${childName}` : ''}? Pots pujar-ho o baixar-ho quan vulguis. El canvi val per als dies nous; avui el poble manté el que ja
        havia preparat.
      </p>
      <div role="radiogroup" aria-label="Minuts de matemàtiques al dia" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {DAILY_MINUTES_OPTIONS.map((value) => {
          const checked = value === minutes
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => choose(value)}
              className={`min-h-14 rounded-2xl px-3 py-3 text-xl font-bold ${checked ? 'bg-brand text-white shadow-md' : 'bg-brand/10 text-brand-dark'}`}
            >
              {value} min
            </button>
          )
        })}
      </div>
      <p className="text-base text-ink/70">Per defecte són {DEFAULT_DAILY_MINUTES} minuts. Cada jugador té el seu valor, desat en aquest aparell.</p>
    </Card>
  )
}
