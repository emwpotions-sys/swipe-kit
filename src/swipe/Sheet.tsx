import { useEffect, useRef, type ReactNode } from 'react'
import { XIcon } from './icons'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

/** Bottom sheet on phones, side panel on wider screens. */
export function Sheet({ open, title, onClose, children, footer }: Props) {
  const closeBtn = useRef<HTMLButtonElement>(null)
  const returnTo = useRef<Element | null>(null)

  useEffect(() => {
    if (open) {
      returnTo.current = document.activeElement
      closeBtn.current?.focus({ preventScroll: true })
    } else if (returnTo.current instanceof HTMLElement) {
      returnTo.current.focus({ preventScroll: true })
      returnTo.current = null
    }
  }, [open])

  return (
    <div className={`sk-sheet${open ? ' is-open' : ''}`} inert={!open}>
      <div className="sk-sheet__scrim" onClick={onClose} />
      <section className="sk-sheet__panel" role="dialog" aria-modal="true" aria-label={title}>
        <header className="sk-sheet__head">
          <h2>{title}</h2>
          <button ref={closeBtn} className="sk-icon-btn" onClick={onClose} aria-label="Close">
            <XIcon size={20} />
          </button>
        </header>
        <div className="sk-sheet__body">{children}</div>
        {footer && <footer className="sk-sheet__foot">{footer}</footer>}
      </section>
    </div>
  )
}
