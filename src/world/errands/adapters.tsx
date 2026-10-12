import { createElement } from 'react'
import type { Choice, Item } from '../../core/ambit/types'
import { fallbackRequest } from './requestText'
import type { AnyErrandAdapter, BuiltTask, ErrandAdapter } from './types'

/** Erases the task type, keeping toTask and the component together so they can never be mismatched. */
export function erase<T>(adapter: ErrandAdapter<T>): AnyErrandAdapter {
  return {
    id: adapter.id,
    canAdapt: adapter.canAdapt,
    build: (item): BuiltTask => {
      const task = adapter.toTask(item)
      return {
        adapterId: adapter.id,
        request: adapter.request(task, item),
        render: (props) => createElement(adapter.Component, { ...props, task }),
      }
    },
  }
}

/** The first adapter that takes the item, or undefined (→ fallback tokens). Pure. */
export const pickAdapter = (adapters: readonly AnyErrandAdapter[], item: Item): AnyErrandAdapter | undefined => adapters.find((a) => a.canAdapt(item))

/**
 * What the neighbour says for an item, and the task if an adapter took it (otherwise the choices are played as tokens
 * and the engine's own text is read). The ONE place where the spoken request is decided: `useErrand` speaks
 * `request.speech`, and the voice collector (`scripts/voice`) enumerates the same sentences through this function.
 */
export function requestFor(adapters: readonly AnyErrandAdapter[], item: Item): { task: BuiltTask | undefined; request: { text: string; speech: string } } {
  const task = pickAdapter(adapters, item)?.build(item)
  return { task, request: task?.request ?? fallbackRequest(item) }
}

/**
 * Choice sent to the engine for an in-world result (a count, an amount). The right value gives the item's
 * own answer; a wrong one reuses the matching choice (so its misconception is logged), else the plain value,
 * never equal to the answer.
 */
export function choiceForValue(value: string, item: Item, same: (a: string, b: string) => boolean = (a, b) => a === b): Choice {
  if (same(value, item.answer)) return { value: item.answer }
  const match = item.choices.find((c) => c.value !== item.answer && same(c.value, value))
  if (match) return match
  return { value: value === item.answer ? `${value} ` : value }
}

export const isInteger = (text: string): boolean => /^-?\d+$/.test(text.trim())
