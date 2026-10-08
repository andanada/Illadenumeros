import type { ComponentType } from 'react'
import type { Choice, Item } from '../../core/ambit/types'
import type { HintLevel } from '../../features/play/useQuestionFlow'

/**
 * A place turns an engine Item into something the child does with her hands in the world
 * ("put 7 + 5 apples in the basket", "hand over the change"). One adapter per kind of in-world task.
 * Items no adapter takes are played with the fallback: the choices as in-world tokens (price tags).
 */
export interface ErrandAdapter<T> {
  id: string
  /** True when this item can be played as this task (pure, called for every item). */
  canAdapt: (item: Item) => boolean
  /** Task model (pure). Only called when canAdapt(item). */
  toTask: (item: Item) => T
  /** What the neighbour says / shows in the bubble for this task (Catalan). */
  request: (task: T, item: Item) => { text: string; speech: string }
  Component: ComponentType<ErrandTaskProps<T>>
}

export interface ErrandTaskProps<T> {
  task: T
  item: Item
  hintLevel: HintLevel
  /** Wrong values tried on this item (tokens grey out; nothing is ever crossed out). */
  wrongValues: readonly string[]
  /** True while an answer is being recorded or after the item is done. */
  locked: boolean
  /** True once the solution is shown (after the last try): the task displays it and waits. */
  solution: boolean
  /** Bumped after every wrong try: tasks bounce their pieces back gently. */
  tries: number
  submit: (choice: Choice) => void
}

/** Type-erased adapter, so a place can list adapters of different task types. */
export interface AnyErrandAdapter {
  id: string
  canAdapt: (item: Item) => boolean
  build: (item: Item) => BuiltTask
}

export interface BuiltTask {
  adapterId: string
  request: { text: string; speech: string }
  render: (props: Omit<ErrandTaskProps<unknown>, 'task'>) => React.ReactElement
}

export type ErrandPhase = 'arriving' | 'asking' | 'checking' | 'thanks' | 'shown' | 'leaving'
