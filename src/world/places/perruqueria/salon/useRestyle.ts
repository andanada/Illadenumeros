import { useEffect, useRef } from 'react'
import { useCast } from '../../../sandbox/CastContext'
import { useItems } from '../../../sandbox/ItemsContext'
import { emoteSound } from '../../../sandbox/fx'
import { worldSfx } from '../../../scene/worldSfx'
import { TOOLS, toolOn, type Progress, type Tool } from '../styling/styleLogic'
import { ROOM, STATIONS } from './layout'

const NEAR = 0.05
const isTool = (def: string): def is Tool => (TOOLS as readonly string[]).includes(def)

/**
 * A tool put down on a chair is used on whoever sits there. Read from where the tools lie (so dropping it
 * is all the child does), once per arrival: pick it up and put it down again to use it again.
 */
export function useRestyle(progress: Progress, setProgress: (next: Progress) => void): void {
  const { items } = useItems()
  const cast = useCast()
  const seen = useRef<ReadonlySet<string>>(new Set())
  const live = useRef(progress)
  useEffect(() => {
    live.current = progress
  })

  useEffect(() => {
    const now = new Set<string>()
    for (const station of STATIONS) {
      const here = Object.values(items)
        .filter((i) => i.loc.t === 'floor' && i.loc.room === ROOM && isTool(i.def) && Math.abs(i.loc.at.x - station.at.x) <= NEAR && Math.abs(i.loc.at.y - station.at.y) <= NEAR)
        .sort((a, b) => a.uid.localeCompare(b.uid))
      for (const tool of here) {
        now.add(tool.uid)
        if (seen.current.has(tool.uid)) continue
        const sitter = Object.entries(cast.state.actors).find(([, a]) => a.seat === station.seat)?.[0]
        if (!sitter) {
          cast.announce(`No hi ha ningú ${station.label.startsWith('el ') ? 'al' : 'a'} ${station.label.replace(/^(el|la) /, '')}.`)
          continue
        }
        const name = cast.seeds[sitter]?.name ?? 'algú'
        const result = toolOn(live.current, sitter, tool.def as Tool)
        live.current = result.progress
        setProgress(result.progress)
        cast.announce(`${name}: ${result.outcome.say}`)
        if (result.outcome.kind === 'ok') {
          const kind = result.outcome.done ? 'uau' : 'riure'
          cast.emote(sitter, kind)
          emoteSound(kind)
          if (result.outcome.done) worldSfx.happy()
        }
      }
    }
    seen.current = now
    // Only the objects' places matter; the callbacks are stable enough for this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])
}
