import { useImperativeHandle, useLayoutEffect, useRef, type ReactNode, type Ref } from 'react'
import { SwipeCard, type SwipeCardHandle } from './SwipeCard'
import type { Restored } from './useSwipeDeck'
import { STACK_SIZE } from './useSwipeDeck'
import type { Direction, SwipeItem } from './types'

interface Props<T extends SwipeItem> {
  ref?: Ref<SwipeCardHandle>
  items: T[]
  directions: Direction[]
  labels: Partial<Record<Direction, string>>
  restored: Restored | null
  renderCard: (item: T) => ReactNode
  describe: (item: T) => string
  onCommit: (direction: Direction, item: T) => void
  onSwiped: (direction: Direction, item: T) => void
}

/**
 * Renders the top few cards of a queue as a physical stack. The card
 * underneath rises as you drag the top one, so the next item is always ready.
 */
export function SwipeStack<T extends SwipeItem>({
  ref,
  items,
  directions,
  labels,
  restored,
  renderCard,
  describe,
  onCommit,
  onSwiped,
}: Props<T>) {
  const stack = useRef<HTMLDivElement>(null)
  const top = useRef<SwipeCardHandle>(null)
  const visible = items.slice(0, STACK_SIZE)
  const topId = visible[0]?.id

  useImperativeHandle(ref, () => ({ swipe: (d) => top.current?.swipe(d) }), [])

  // New top card: the one beneath is now at rest, so reset the pull.
  useLayoutEffect(() => {
    stack.current?.style.setProperty('--sk-pull', '0')
  }, [topId])

  const onPull = (amount: number, dragging: boolean) => {
    const el = stack.current
    if (!el) return
    el.style.setProperty('--sk-pull', String(amount))
    el.toggleAttribute('data-dragging', dragging)
  }

  return (
    <div className="sk-stack" ref={stack}>
      {visible.map((item, i) => (
        <SwipeCard
          key={item.id}
          ref={i === 0 ? top : undefined}
          depth={i}
          directions={directions}
          labels={labels}
          enterFrom={restored?.id === item.id ? restored.direction : null}
          ariaLabel={describe(item)}
          onPull={i === 0 ? onPull : undefined}
          onCommit={(d) => onCommit(d, item)}
          onSwiped={(d) => onSwiped(d, item)}
        >
          {renderCard(item)}
        </SwipeCard>
      ))}
    </div>
  )
}
