import {
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react'
import type { Direction } from './types'

export interface SwipeCardHandle {
  /** Programmatic swipe (buttons, keyboard). */
  swipe: (direction: Direction) => void
}

interface Props {
  ref?: Ref<SwipeCardHandle>
  /** 0 = top (interactive), 1 = next, 2 = waiting in the wings. */
  depth: number
  directions: Direction[]
  labels: Partial<Record<Direction, string>>
  /** When set, the card animates in from this side (used by undo). */
  enterFrom?: Direction | null
  /** 0..1 progress toward committing, plus whether a finger/mouse is down. */
  onPull?: (amount: number, dragging: boolean) => void
  /** Swipe committed: fired on release, before the fly-out animation. */
  onCommit?: (direction: Direction) => void
  /** Card has left the screen. */
  onSwiped: (direction: Direction) => void
  ariaLabel?: string
  children: ReactNode
}

const FLICK = 0.5 // px per ms
const MIN_FLICK_DISTANCE = 32
const MAX_ROTATION = 16 // degrees at one card-width of travel

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const reducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export function SwipeCard({
  ref,
  depth,
  directions,
  labels,
  enterFrom,
  onPull,
  onCommit,
  onSwiped,
  ariaLabel,
  children,
}: Props) {
  const node = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: 0, y: 0 })
  const drag = useRef<{
    id: number
    x0: number
    y0: number
    lastX: number
    lastY: number
    lastT: number
    vx: number
    vy: number
    flip: number
  } | null>(null)
  const frame = useRef(0)
  const leaving = useRef(false)
  const active = depth === 0
  const canUp = directions.includes('up')

  const threshold = () => Math.min(140, (node.current?.offsetWidth ?? 360) * 0.3)

  const setStamps = (left: number, right: number, up: number) => {
    const s = node.current?.style
    if (!s) return
    s.setProperty('--sk-left', String(left))
    s.setProperty('--sk-right', String(right))
    s.setProperty('--sk-up', String(up))
  }

  const paint = (x: number, y: number, flip: number) => {
    const el = node.current
    if (!el) return
    const w = el.offsetWidth || 360
    el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${(x / w) * MAX_ROTATION * flip}deg)`

    const t = threshold()
    const upward = canUp && -y > Math.abs(x)
    const h = upward ? 0 : clamp01(Math.abs(x) / t)
    const u = upward ? clamp01(-y / t) : 0
    setStamps(x < 0 ? h : 0, x > 0 ? h : 0, u)
    onPull?.(Math.max(h, u), true)
  }

  const fly = (direction: Direction, vy = 0) => {
    const el = node.current
    if (!el || leaving.current) return
    leaving.current = true
    const w = el.offsetWidth
    const h = el.offsetHeight
    const { x, y } = pos.current
    let tx = x
    let ty = y
    let rot = (x / w) * MAX_ROTATION
    if (direction === 'up') {
      ty = -(window.innerHeight + h)
    } else {
      const sign = direction === 'right' ? 1 : -1
      tx = sign * (window.innerWidth / 2 + w * 1.25)
      ty = y + vy * 140
      rot = sign * 22
    }

    setStamps(direction === 'left' ? 1 : 0, direction === 'right' ? 1 : 0, direction === 'up' ? 1 : 0)
    el.classList.remove('is-dragging')
    el.classList.add('is-leaving')
    onPull?.(1, false)
    onCommit?.(direction)

    const ms = reducedMotion() ? 160 : 380
    el.style.setProperty('--sk-fly', `${ms}ms`)
    requestAnimationFrame(() => {
      el.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotate(${rot}deg)`
    })
    window.setTimeout(() => onSwiped(direction), ms)
  }

  const settle = () => {
    const el = node.current
    if (!el) return
    el.classList.remove('is-dragging')
    el.style.transform = ''
    pos.current = { x: 0, y: 0 }
    setStamps(0, 0, 0)
    onPull?.(0, false)
  }

  useImperativeHandle(ref, () => ({ swipe: (d) => directions.includes(d) && fly(d) }))

  // Undo: start off-screen on the side the card left from, then glide back in.
  useLayoutEffect(() => {
    const el = node.current
    if (!el || !enterFrom) return
    const w = el.offsetWidth
    const from =
      enterFrom === 'up'
        ? `translate3d(0, ${-(window.innerHeight * 0.9)}px, 0)`
        : `translate3d(${(enterFrom === 'right' ? 1 : -1) * (window.innerWidth / 2 + w)}px, 0, 0) rotate(${enterFrom === 'right' ? 18 : -18}deg)`
    el.classList.add('is-dragging')
    el.style.transform = from
    void el.offsetWidth // commit the start frame
    el.classList.remove('is-dragging')
    el.style.transform = ''
  }, [enterFrom])

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!active || leaving.current) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const rect = el.getBoundingClientRect()
    drag.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastT: e.timeStamp,
      vx: 0,
      vy: 0,
      // Grabbing the lower half tilts the other way, like a real card.
      flip: e.clientY > rect.top + rect.height * 0.6 ? -1 : 1,
    }
    el.classList.add('is-dragging')
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    const dt = Math.max(1, e.timeStamp - d.lastT)
    d.vx = 0.7 * ((e.clientX - d.lastX) / dt) + 0.3 * d.vx
    d.vy = 0.7 * ((e.clientY - d.lastY) / dt) + 0.3 * d.vy
    d.lastX = e.clientX
    d.lastY = e.clientY
    d.lastT = e.timeStamp
    pos.current = { x: e.clientX - d.x0, y: e.clientY - d.y0 }
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => paint(pos.current.x, pos.current.y, d.flip))
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    drag.current = null
    cancelAnimationFrame(frame.current)

    // A pause before letting go cancels the flick.
    const stale = e.timeStamp - d.lastT > 90
    const vx = stale ? 0 : d.vx
    const vy = stale ? 0 : d.vy
    const { x, y } = pos.current
    const t = threshold()

    let dir: Direction | null = null
    if (canUp && -y > Math.abs(x) && (-y > t || (-vy > FLICK && -y > MIN_FLICK_DISTANCE))) dir = 'up'
    else if (x > t || (vx > FLICK && x > MIN_FLICK_DISTANCE)) dir = 'right'
    else if (x < -t || (vx < -FLICK && x < -MIN_FLICK_DISTANCE)) dir = 'left'

    if (dir && directions.includes(dir)) fly(dir, vy)
    else settle()
  }

  return (
    <div
      ref={node}
      className="sk-card"
      data-depth={depth}
      style={{ ['--depth' as string]: depth, zIndex: 10 - depth }}
      role="group"
      aria-roledescription="card"
      aria-label={ariaLabel}
      aria-hidden={!active}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        drag.current = null
        settle()
      }}
      onDragStart={(e) => e.preventDefault()}
    >
      {children}
      {labels.right && <span className="sk-stamp sk-stamp--right">{labels.right}</span>}
      {labels.left && <span className="sk-stamp sk-stamp--left">{labels.left}</span>}
      {labels.up && <span className="sk-stamp sk-stamp--up">{labels.up}</span>}
    </div>
  )
}
