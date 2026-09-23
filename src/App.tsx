import type { ReactNode } from 'react'
import { SwipeApp } from './swipe'
import { namesDeck } from './decks/names/deck'
import { productsDeck } from './decks/products/deck'

/**
 * Register decks here. Pick one with ?deck=<id>; the first is the default.
 * A new use case is a new folder in src/decks. The framework doesn't change.
 */
const decks: Record<string, () => ReactNode> = {
  products: () => <SwipeApp deck={productsDeck} />,
  names: () => <SwipeApp deck={namesDeck} />,
}

const requested = new URLSearchParams(window.location.search).get('deck') ?? ''
const render = decks[requested] ?? decks.products

export default function App() {
  return render()
}
