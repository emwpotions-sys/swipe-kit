/**
 * Pure, framework-agnostic deck logic. No React, no DOM.
 * Everything here is a plain function of (state, items, filters) so it is easy
 * to test and to port to another UI (React Native, a CLI, a server).
 */
import type { DeckConfig, Decision, Direction, Filters, SwipeItem } from './types'

export interface DeckState {
  /** Every item id, in the order cards will be shown. */
  order: string[]
  /** id -> the swipe it received. */
  decisions: Record<string, Decision>
  /** Decided ids, oldest first. Drives undo. */
  history: string[]
}

/** Turns a swipe direction into a learning signal (+ pulls similar items forward). */
export type Weigh = (direction: Direction) => number

export function createState(
  ids: string[],
  saved?: Pick<DeckState, 'decisions' | 'history'> | null,
): DeckState {
  const known = new Set(ids)
  const history = (saved?.history ?? []).filter((id) => known.has(id) && saved?.decisions[id])
  const decisions: Record<string, Decision> = {}
  for (const id of history) decisions[id] = saved!.decisions[id]
  return { order: [...ids], decisions, history }
}

export function matches(item: SwipeItem, filters: Filters): boolean {
  for (const [key, values] of Object.entries(filters)) {
    if (!values || values.length === 0) continue
    const value = item.facets?.[key]
    if (value === undefined || !values.includes(value)) return false
  }
  return true
}

/** Undecided items that pass the filters, in display order. */
export function getQueue<T extends SwipeItem>(
  state: DeckState,
  byId: Map<string, T>,
  filters: Filters,
): T[] {
  const out: T[] = []
  for (const id of state.order) {
    if (state.decisions[id]) continue
    const item = byId.get(id)
    if (item && matches(item, filters)) out.push(item)
  }
  return out
}

export function decide(state: DeckState, id: string, direction: Direction, at = Date.now()): DeckState {
  if (state.decisions[id]) return state
  return {
    ...state,
    decisions: { ...state.decisions, [id]: { id, direction, at } },
    history: [...state.history, id],
  }
}

/** Change an existing decision in place (e.g. removing something from Saved). */
export function redecide(state: DeckState, id: string, direction: Direction): DeckState {
  const prev = state.decisions[id]
  if (!prev) return state
  return { ...state, decisions: { ...state.decisions, [id]: { ...prev, direction } } }
}

/** Reverts the latest decision and puts that card back on top. */
export function undo(state: DeckState): [DeckState, Decision | null] {
  const id = state.history.at(-1)
  if (!id) return [state, null]
  const { [id]: last, ...decisions } = state.decisions
  return [
    {
      order: [id, ...state.order.filter((x) => x !== id)],
      decisions,
      history: state.history.slice(0, -1),
    },
    last ?? null,
  ]
}

/* ---------------------------------------------------------------- ranking */

/** Features an item can be matched on: its tags plus "facet:value" pairs. */
export function features(item: SwipeItem): string[] {
  const out = [...(item.tags ?? [])]
  for (const [key, value] of Object.entries(item.facets ?? {})) out.push(`${key}:${value}`)
  return out
}

export function learnWeights<T extends SwipeItem>(
  state: DeckState,
  byId: Map<string, T>,
  weigh: Weigh,
): Map<string, number> {
  const weights = new Map<string, number>()
  for (const id of state.history) {
    const item = byId.get(id)
    const decision = state.decisions[id]
    if (!item || !decision) continue
    const delta = weigh(decision.direction)
    for (const f of features(item)) weights.set(f, (weights.get(f) ?? 0) + delta)
  }
  return weights
}

export function score(item: SwipeItem, weights: Map<string, number>, boost = 0): number {
  let s = boost
  for (const f of features(item)) s += weights.get(f) ?? 0
  return s
}

export interface RankOptions<T extends SwipeItem> {
  byId: Map<string, T>
  filters: Filters
  weigh: Weigh
  boost?: (item: T) => number
  /** How many cards at the top of the queue to leave in place (the visible ones). */
  pinned?: number
}

/**
 * Reorders the upcoming queue by learned affinity. Cards already on screen
 * (`pinned`) never move, so nothing shuffles under the user's finger.
 * Ties fall back to the source's original order.
 */
export function rerank<T extends SwipeItem>(state: DeckState, opts: RankOptions<T>): DeckState {
  const { byId, filters, weigh, boost, pinned = 0 } = opts
  const queue = getQueue(state, byId, filters).map((item) => item.id)
  const head = queue.slice(0, pinned)
  const weights = learnWeights(state, byId, weigh)
  const sourceIndex = new Map<string, number>()
  let i = 0
  for (const id of byId.keys()) sourceIndex.set(id, i++)

  const tail = queue
    .slice(pinned)
    .map((id) => {
      const item = byId.get(id)!
      return { id, s: score(item, weights, boost?.(item) ?? 0) }
    })
    .sort((a, b) => b.s - a.s || sourceIndex.get(a.id)! - sourceIndex.get(b.id)!)
    .map((x) => x.id)

  const inQueue = new Set(queue)
  const rest = state.order.filter((id) => !inQueue.has(id))
  return { ...state, order: [...head, ...tail, ...rest] }
}

/** Default learning signal derived from a deck's actions. */
export function weigher<T extends SwipeItem>(actions: DeckConfig<T>['actions']): Weigh {
  return (direction) => {
    const action = actions[direction]
    if (!action) return 0
    return action.weight ?? (action.sentiment === 'positive' ? 1 : -0.5)
  }
}

/** Every value a facet takes across the items, in first-seen order. */
export function facetOptions(items: SwipeItem[], key: string): string[] {
  const seen = new Set<string>()
  for (const item of items) {
    const v = item.facets?.[key]
    if (v !== undefined) seen.add(v)
  }
  return [...seen]
}
