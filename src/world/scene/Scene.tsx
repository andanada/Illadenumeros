import { Draggable, type DraggableProps } from './Draggable'
import { SceneProvider, useSceneApi, type SceneApi } from './SceneContext'

export const LAYERS = ['sky', 'back', 'mid', 'front'] as const
export type LayerName = (typeof LAYERS)[number]

const LAYER_Z: Record<LayerName, number> = { sky: 0, back: 10, mid: 20, front: 30 }

/** One depth of the scene; layers stack sky → back → mid → front. */
export function Layer({ name, children, className = '' }: { name: LayerName; children: React.ReactNode; className?: string }) {
  return (
    <div data-layer={name} style={{ zIndex: LAYER_Z[name] }} className={`pointer-events-none absolute inset-0 [&>*]:pointer-events-auto ${className}`}>
      {children}
    </div>
  )
}

export interface SceneProps {
  /** Accessible name of the place ("La botiga"). */
  label: string
  children: React.ReactNode
  className?: string
  /** Optional externally created api (tests, or a place that needs it outside the tree). */
  api?: SceneApi
}

/** Live region with what just happened, for screen readers (tap-to-place and keyboard path). */
function Announcer({ text }: { text: string }) {
  return (
    <p aria-live="polite" role="status" className="sr-only">
      {text}
    </p>
  )
}

function SceneBody({ label, children, className = '', api }: SceneProps & { api: SceneApi }) {
  return (
    <SceneProvider api={api}>
      <section aria-label={label} className={`relative isolate overflow-hidden ${className}`}>
        {children}
        <Announcer text={api.announcement} />
      </section>
    </SceneProvider>
  )
}

function OwnScene(props: SceneProps) {
  const api = useSceneApi()
  return <SceneBody {...props} api={api} />
}

/** A layered DOM + SVG scene with movable props and drop zones. */
export function Scene(props: SceneProps) {
  return props.api ? <SceneBody {...props} api={props.api} /> : <OwnScene {...props} />
}

/** A prop that only reacts to taps (fridge, cat, till): squish + its own sound. */
export function TapProp(props: Omit<DraggableProps, 'movable'>) {
  return <Draggable {...props} movable={false} />
}
