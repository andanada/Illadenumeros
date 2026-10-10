import { useEffect, useRef } from 'react'
import { useItems } from '../../../sandbox/ItemsContext'
import { useStage } from '../../../sandbox/StageContext'
import { worldSfx } from '../../../scene/worldSfx'
import { useCast } from '../../../sandbox/CastContext'
import { SCALE_AT, ROOM, TILL_AT } from './rooms'
import { arrivals, gramsLabel, scaleReading, tillScan, totalLabel } from './shopLogic'

function Screen({ at, text, name, tone, shown }: { at: { x: number; y: number }; text: string; name: string; tone: string; shown: boolean }) {
  const { h } = useStage()
  return (
    <div
      role="status"
      aria-label={name}
      data-readout={name}
      className="pointer-events-none absolute grid place-items-center rounded-lg px-2 font-display text-base font-bold tabular-nums shadow-[var(--world-shadow-soft)] sm:text-xl"
      style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%`, transform: 'translate(-50%, -150%)', minWidth: 64, minHeight: Math.max(26, h * 0.045), background: tone, color: '#1f3a2e', zIndex: 3000, opacity: shown ? 1 : 0 }}
    >
      {text}
    </div>
  )
}

/**
 * What the counter tells: the scale shows grams, the till beeps and shows the total of what lies on it.
 * Everything is read from where the objects lie, so putting things down is all the child has to do.
 */
export function Readouts() {
  const { items } = useItems()
  const cast = useCast()
  const scale = scaleReading(items, ROOM.floor, SCALE_AT)
  const till = tillScan(items, ROOM.floor, TILL_AT)
  const seenScale = useRef<readonly string[]>([])
  const seenTill = useRef<readonly string[]>([])
  const key = till.uids.join(',')
  const scaleKey = `${scale.count}:${scale.grams}`

  useEffect(() => {
    const fresh = arrivals(seenTill.current, till.uids)
    seenTill.current = till.uids
    if (fresh.length === 0) return
    worldSfx.beep()
    cast.announce(`Bip! La caixa marca ${totalLabel(till.cents)}.`)
    // The announcement only depends on what lies on the till.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    const uids = Array.from({ length: scale.count }, (_, i) => `${i}`)
    const fresh = arrivals(seenScale.current, uids)
    seenScale.current = uids
    if (fresh.length === 0) return
    worldSfx.coin()
    cast.announce(`La bàscula marca ${gramsLabel(scale.grams)}.`)
    // Only when the weight changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scaleKey])

  return (
    <>
      <Screen at={{ x: TILL_AT.x, y: TILL_AT.y - 0.07 }} name={`Caixa: ${totalLabel(till.cents)}`} text={totalLabel(till.cents)} tone="#d9f7b8" shown={till.uids.length > 0} />
      <Screen at={{ x: SCALE_AT.x, y: SCALE_AT.y - 0.02 }} name={`Bàscula: ${gramsLabel(scale.grams)}`} text={gramsLabel(scale.grams)} tone="#fff1c2" shown={scale.count > 0} />
    </>
  )
}
