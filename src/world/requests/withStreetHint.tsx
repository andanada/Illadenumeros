import type { ComponentType } from 'react'
import type { SceneId } from '../model/types'
import { PropArt } from '../scene/art'
import { Hint } from './StreetHints'

type Facade = string | ComponentType<{ open: boolean }>

const byName = new Map<string, ComponentType<{ open: boolean }>>()
const byComponent = new WeakMap<object, Map<SceneId, ComponentType<{ open: boolean }>>>()

/**
 * The same façade with a request bubble over its roof when someone there waits. Cached by place and
 * façade so the component identity is stable between renders (the street never remounts it).
 */
export function withStreetHint(place: SceneId, facade: Facade | undefined): Facade | undefined {
  if (facade === undefined) return undefined
  const known = typeof facade === 'string' ? byName.get(`${place}:${facade}`) : byComponent.get(facade)?.get(place)
  if (known) return known
  const Wrapped: ComponentType<{ open: boolean }> = ({ open }) => {
    const Own = typeof facade === 'string' ? undefined : facade
    return (
      <>
        {Own ? <Own open={open} /> : <PropArt id={facade as string} size={undefined} title="" shadow={false} className="block h-full w-auto" />}
        <Hint place={place} />
      </>
    )
  }
  if (typeof facade === 'string') byName.set(`${place}:${facade}`, Wrapped)
  else byComponent.set(facade, (byComponent.get(facade) ?? new Map()).set(place, Wrapped))
  return Wrapped
}
