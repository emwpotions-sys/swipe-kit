/**
 * swipe-kit: the public surface.
 *
 *   SwipeApp      full screen, ready to use with any DeckConfig
 *   SwipeStack    just the gesture-driven card stack
 *   SwipeCard     a single draggable card
 *   useSwipeDeck  state (queue, filters, undo, saved, learning) without UI
 *   engine        pure functions behind it all
 */
export { SwipeApp } from './SwipeApp'
export { SwipeStack } from './SwipeStack'
export { SwipeCard, type SwipeCardHandle } from './SwipeCard'
export { useSwipeDeck, type SwipeDeckApi } from './useSwipeDeck'
export { arraySource, jsonSource, mergeSources } from './sources'
export * as engine from './engine'
export * from './icons'
export type * from './types'
