import { createElement } from 'react'
import type { Choice, Item } from '../../core/ambit/types'
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
