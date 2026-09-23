import type { ReactNode } from 'react'

export type Direction = 'left' | 'right' | 'up'

/**
 * The only shape the framework needs. Add whatever other fields your deck uses.
 */
export interface SwipeItem {
  id: string
  /** Free-form features used to learn "more like this". */
  tags?: string[]
  /** Filterable attributes, e.g. { category: 'Shoes', condition: 'Pre-owned' }. */
  facets?: Record<string, string>
}

export interface SwipeAction<T> {
  /** Shown on the drag stamp and used as the button's accessible label. */
  label: string
  /** Positive swipes land in the Saved list and pull similar cards forward. */
  sentiment: 'positive' | 'negative'
  /** How strongly this swipe teaches the ranker. Defaults: positive 1, negative -0.5. */
  weight?: number
  /** Side effect fired the moment the swipe commits (e.g. open a link). */
  onSwipe?: (item: T) => void
  /** Button icon. Falls back to a sensible default per direction. */
  icon?: ReactNode
}

export interface Facet {
  key: string
  label: string
  /** Fixed option order. Omit to derive options from the items. */
  options?: string[]
}

/** facet key -> selected values. Empty or missing means "any". */
export type Filters = Record<string, string[]>

export interface Decision {
  id: string
  direction: Direction
  at: number
}

/** A compact description of an item, used by the Saved list and screen readers. */
export interface ItemSummary {
  title: string
  subtitle?: string
  image?: string
  href?: string
  /** Right-aligned detail, e.g. a price. */
  aside?: string
}

/** Where cards come from: a JSON file, an API, a scraper, a hard-coded array. */
export interface Source<T extends SwipeItem> {
  load: () => Promise<T[]>
}

export interface DeckConfig<T extends SwipeItem> {
  /** Stable id. Used to namespace saved progress. */
  id: string
  /** Shown above the stack. */
  name: string
  source: Source<T>
  actions: {
    left: SwipeAction<T>
    right: SwipeAction<T>
    up?: SwipeAction<T>
  }
  facets?: Facet[]
  /** Re-rank upcoming cards toward what gets saved. Default true. */
  learn?: boolean
  /** Constant nudge added to an item's rank score (e.g. favor secondhand). */
  boost?: (item: T) => number
  /** The card face. Gestures, stamps and stacking are handled for you. */
  renderCard: (item: T) => ReactNode
  summarize: (item: T) => ItemSummary
}
