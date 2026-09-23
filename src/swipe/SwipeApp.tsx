import { useEffect, useRef, useState, type ReactNode } from 'react'
import { FilterBar, RefineSheet } from './Filters'
import { ArrowUpIcon, HeartIcon, StackGlyph, UndoIcon, XIcon } from './icons'
import { SavedSheet } from './SavedSheet'
import type { SwipeCardHandle } from './SwipeCard'
import { SwipeStack } from './SwipeStack'
import type { DeckConfig, Direction, SwipeItem } from './types'
import { useSwipeDeck } from './useSwipeDeck'

interface Props<T extends SwipeItem> {
  deck: DeckConfig<T>
  /** Replaces the default wordmark in the header. */
  brand?: ReactNode
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * A complete, opinionated swipe screen: header, filters, stack, actions,
 * Saved and Refine sheets, keyboard shortcuts. Feed it any DeckConfig.
 */
export function SwipeApp<T extends SwipeItem>({ deck, brand }: Props<T>) {
  const d = useSwipeDeck(deck)
  const stack = useRef<SwipeCardHandle>(null)
  const [sheet, setSheet] = useState<'saved' | 'refine' | null>(null)

  const { left, right, up } = deck.actions
  const directions: Direction[] = up ? ['left', 'right', 'up'] : ['left', 'right']
  const labels = { left: left.label, right: right.label, up: up?.label }
  const facets = deck.facets ?? []
  const empty = d.status === 'ready' && d.queue.length === 0
  const swipe = (dir: Direction) => stack.current?.swipe(dir)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t?.closest?.('input, textarea, select, [contenteditable="true"]')) return
      if (sheet) {
        if (e.key === 'Escape') setSheet(null)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        d.undo()
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const map: Record<string, Direction | 'undo'> = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowUp: 'up',
        Backspace: 'undo',
        z: 'undo',
      }
      const action = map[e.key]
      if (!action) return
      e.preventDefault()
      if (action === 'undo') d.undo()
      else swipe(action)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const current = Math.min(d.stats.seen + 1, d.stats.total)
  const progress = d.stats.total ? d.stats.seen / d.stats.total : 0

  return (
    <div className="sk-app">
      <header className="sk-header">
        <div className="sk-brand">
          {brand ?? (
            <>
              <StackGlyph size={20} /> swipe-kit
            </>
          )}
        </div>
        <button className="sk-pill" onClick={() => setSheet('saved')}>
          Saved
          <span className="sk-count" data-empty={d.stats.saved === 0}>
            {d.stats.saved}
          </span>
        </button>
      </header>

      <FilterBar
        facets={facets}
        items={d.items}
        filters={d.filters}
        onChange={d.setFilter}
        onRefine={() => setSheet('refine')}
      />

      <main className="sk-main">
        <div className="sk-meta">
          <span>{deck.name}</span>
          <span className="sk-meta__track" aria-hidden="true">
            <span style={{ transform: `scaleX(${progress})` }} />
          </span>
          <span className="sk-meta__count" aria-label={`${d.stats.seen} of ${d.stats.total} seen`}>
            {pad(d.stats.total ? current : 0)} / {pad(d.stats.total)}
          </span>
        </div>

        <div className="sk-stage">
          {d.status === 'loading' && <div className="sk-skeleton" aria-label="Loading" />}
          {d.status === 'error' && (
            <div className="sk-empty">
              <p className="sk-eyebrow">Couldn’t load this deck</p>
              <p className="sk-note">{d.error}</p>
            </div>
          )}
          {d.status === 'ready' && !empty && (
            <SwipeStack
              ref={stack}
              items={d.queue}
              directions={directions}
              labels={labels}
              restored={d.restored}
              renderCard={deck.renderCard}
              describe={(item) => deck.summarize(item).title}
              onCommit={d.commit}
              onSwiped={d.decide}
            />
          )}
          {empty && (
            <div className="sk-empty">
              <p className="sk-eyebrow">{d.activeFilters ? 'Nothing left in this filter' : 'All caught up'}</p>
              <h2>
                {d.stats.savedHere} saved
                <span> of {d.stats.total}</span>
              </h2>
              <div className="sk-empty__actions">
                {d.stats.saved > 0 && (
                  <button className="sk-btn sk-btn--solid" onClick={() => setSheet('saved')}>
                    View saved
                  </button>
                )}
                {d.activeFilters ? (
                  <button className="sk-btn" onClick={d.clearFilters}>
                    Clear filters
                  </button>
                ) : (
                  <button className="sk-btn" onClick={d.reset}>
                    Start over
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="sk-actions">
          <button
            className="sk-action sk-action--sm"
            onClick={d.undo}
            disabled={!d.canUndo}
            aria-label="Undo"
            title="Undo (Z)"
          >
            <UndoIcon size={20} />
          </button>
          <button
            className="sk-action"
            onClick={() => swipe('left')}
            disabled={empty}
            aria-label={left.label}
            title={`${left.label} (←)`}
          >
            {left.icon ?? <XIcon size={26} />}
          </button>
          <button
            className="sk-action sk-action--solid"
            onClick={() => swipe('right')}
            disabled={empty}
            aria-label={right.label}
            title={`${right.label} (→)`}
          >
            {right.icon ?? <HeartIcon size={26} />}
          </button>
          {up ? (
            <button
              className="sk-action sk-action--sm"
              onClick={() => swipe('up')}
              disabled={empty}
              aria-label={up.label}
              title={`${up.label} (↑)`}
            >
              {up.icon ?? <ArrowUpIcon size={20} />}
            </button>
          ) : (
            <span className="sk-action sk-action--sm sk-action--ghost" aria-hidden="true" />
          )}
        </div>

        <p className="sk-hint">
          <kbd>←</kbd> {left.label}
          <kbd>→</kbd> {right.label}
          {up && (
            <>
              <kbd>↑</kbd> {up.label}
            </>
          )}
          <kbd>Z</kbd> Undo
        </p>
      </main>

      <SavedSheet
        open={sheet === 'saved'}
        onClose={() => setSheet(null)}
        items={d.saved}
        summarize={deck.summarize}
        onRemove={d.unsave}
        onReset={() => {
          d.reset()
          setSheet(null)
        }}
      />
      {facets.length > 0 && (
        <RefineSheet
          open={sheet === 'refine'}
          onClose={() => setSheet(null)}
          facets={facets}
          items={d.items}
          filters={d.filters}
          matching={d.queue.length}
          onChange={d.setFilter}
          onClear={d.clearFilters}
        />
      )}
    </div>
  )
}
