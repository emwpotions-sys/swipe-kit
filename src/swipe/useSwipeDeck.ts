import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createState,
  decide as decideState,
  getQueue,
  matches,
  redecide,
  rerank,
  undo as undoState,
  weigher,
  type DeckState,
} from './engine'
import { clearProgress, loadProgress, saveProgress } from './storage'
import type { DeckConfig, Direction, Filters, SwipeItem } from './types'

/** Cards rendered at once. The top `PINNED` never get re-ranked out from under you. */
export const STACK_SIZE = 3
export const PINNED = 2

export interface Restored {
  id: string
  direction: Direction
}

export type DeckStatus = 'loading' | 'error' | 'ready'

export function useSwipeDeck<T extends SwipeItem>(deck: DeckConfig<T>) {
  const [items, setItems] = useState<T[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<DeckState>(() => createState([]))
  const [filters, setFilters] = useState<Filters>({})
  const [restored, setRestored] = useState<Restored | null>(null)

  const learn = deck.learn ?? true
  const weigh = useMemo(() => weigher(deck.actions), [deck.actions])
  const byId = useMemo(() => new Map((items ?? []).map((i) => [i.id, i])), [items])

  // Load the source once per deck. (To swap decks at runtime, remount with a new `key`.)
  useEffect(() => {
    let cancelled = false
    deck.source
      .load()
      .then((list) => {
        if (cancelled) return
        const map = new Map(list.map((i) => [i.id, i]))
        let next = createState(
          list.map((i) => i.id),
          loadProgress(deck.id),
        )
        if (learn) next = rerank(next, { byId: map, filters: {}, weigh, boost: deck.boost })
        setItems(list)
        setState(next)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [deck, learn, weigh])

  // Persist progress.
  useEffect(() => {
    if (items) saveProgress(deck.id, state)
  }, [state, items, deck.id])

  const queue = useMemo(() => getQueue(state, byId, filters), [state, byId, filters])
  const inFilter = useMemo(() => (items ?? []).filter((i) => matches(i, filters)), [items, filters])

  const isPositive = useCallback(
    (d: Direction) => deck.actions[d]?.sentiment === 'positive',
    [deck.actions],
  )

  /** Fires the action's side effect as soon as a swipe commits (before the animation ends). */
  const commit = useCallback(
    (direction: Direction, item: T) => deck.actions[direction]?.onSwipe?.(item),
    [deck.actions],
  )

  /** Records the swipe once the card has left the screen. */
  const decide = useCallback(
    (direction: Direction, item: T) => {
      setRestored(null)
      setState((s) => {
        const next = decideState(s, item.id, direction)
        return learn ? rerank(next, { byId, filters, weigh, boost: deck.boost, pinned: PINNED }) : next
      })
    },
    [byId, filters, weigh, learn, deck.boost],
  )

  const undo = useCallback(() => {
    const [next, last] = undoState(state)
    if (!last) return
    setState(next)
    setRestored({ id: last.id, direction: last.direction })
  }, [state])

  const setFilter = useCallback(
    (key: string, values: string[]) => {
      const nextFilters = { ...filters, [key]: values }
      setFilters(nextFilters)
      setRestored(null)
      if (learn) setState((s) => rerank(s, { byId, filters: nextFilters, weigh, boost: deck.boost }))
    },
    [filters, learn, byId, weigh, deck.boost],
  )

  const clearFilters = useCallback(() => {
    setFilters({})
    setRestored(null)
    if (learn) setState((s) => rerank(s, { byId, filters: {}, weigh, boost: deck.boost }))
  }, [learn, byId, weigh, deck.boost])

  const reset = useCallback(() => {
    clearProgress(deck.id)
    setRestored(null)
    const fresh = createState((items ?? []).map((i) => i.id))
    setState(learn ? rerank(fresh, { byId, filters, weigh, boost: deck.boost }) : fresh)
  }, [deck.id, deck.boost, items, learn, byId, filters, weigh])

  /** Moves a saved item to the negative pile. */
  const unsave = useCallback((id: string) => setState((s) => redecide(s, id, 'left')), [])

  const saved = useMemo(
    () =>
      [...state.history]
        .reverse()
        .filter((id) => {
          const d = state.decisions[id]
          return d ? isPositive(d.direction) : false
        })
        .map((id) => byId.get(id))
        .filter((i): i is T => Boolean(i)),
    [state, byId, isPositive],
  )

  const seen = inFilter.filter((i) => state.decisions[i.id]).length
  const savedHere = inFilter.filter((i) => {
    const d = state.decisions[i.id]
    return d ? isPositive(d.direction) : false
  }).length
  const activeFilters = Object.values(filters).reduce((n, v) => n + (v?.length ?? 0), 0)
  const status: DeckStatus = error ? 'error' : items ? 'ready' : 'loading'

  return {
    status,
    error,
    items: items ?? [],
    queue,
    filters,
    activeFilters,
    setFilter,
    clearFilters,
    commit,
    decide,
    undo,
    canUndo: state.history.length > 0,
    reset,
    saved,
    unsave,
    restored,
    /** `total`, `seen` and `savedHere` respect the active filters; `saved` is deck-wide. */
    stats: { total: inFilter.length, seen, savedHere, remaining: queue.length, saved: saved.length },
  }
}

export type SwipeDeckApi<T extends SwipeItem> = ReturnType<typeof useSwipeDeck<T>>
