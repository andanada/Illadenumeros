import { useDraggable, useDroppable } from '@dnd-kit/core'

const COLOR = { 'build-first': 'bg-chicle', 'build-second': 'bg-cel' } as const

export const BOARD_DROP_ID = 'board'

function TrayCounter({ id, color, onTap }: { id: string; color: string; onTap: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id })
  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-label="Fitxa. Arrossega-la al marc o toca-la"
      onClick={onTap}
      {...attributes}
      {...listeners}
      className={`sticker size-[4.5rem] touch-none rounded-full ${color} ${isDragging ? 'opacity-30' : 'cursor-grab'}`}
    />
  )
}

/** Source tray: the counters to place for the current step. Tap = place directly (keyboard / fallback). */
export function CounterTray({ count, step, onPlace }: { count: number; step: 'build-first' | 'build-second'; onPlace: () => void }) {
  return (
    <div
      role="group"
      aria-label={`Safata amb ${count} fitxes`}
      className="flex min-h-24 flex-wrap items-center justify-center gap-2 rounded-3xl border-4 border-dashed border-brand/40 bg-white/60 p-3"
    >
      {Array.from({ length: count }, (_, i) => (
        <TrayCounter key={`${step}-${i}`} id={`${step}-${i}`} color={COLOR[step]} onTap={onPlace} />
      ))}
    </div>
  )
}

/** Wraps the frames; counters dropped anywhere on the board snap into the next free cell. */
export function BoardDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: BOARD_DROP_ID })
  return (
    <div ref={setNodeRef} className={`flex flex-wrap items-center justify-center gap-4 rounded-[2rem] p-3 transition-colors ${isOver ? 'bg-sol/25' : ''}`}>
      {children}
    </div>
  )
}
