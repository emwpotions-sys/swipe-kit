import type { DeckState } from './engine'

type Saved = Pick<DeckState, 'decisions' | 'history'>

const key = (deckId: string) => `swipe-kit:${deckId}`

/** Progress lives in localStorage so a refresh doesn't lose your place. */
export function loadProgress(deckId: string): Saved | null {
  try {
    const raw = localStorage.getItem(key(deckId))
    return raw ? (JSON.parse(raw) as Saved) : null
  } catch {
    return null
  }
}

export function saveProgress(deckId: string, state: DeckState): void {
  try {
    const { decisions, history } = state
    localStorage.setItem(key(deckId), JSON.stringify({ decisions, history }))
  } catch {
    /* private mode, quota, etc. Progress just won't persist. */
  }
}

export function clearProgress(deckId: string): void {
  try {
    localStorage.removeItem(key(deckId))
  } catch {
    /* ignore */
  }
}
