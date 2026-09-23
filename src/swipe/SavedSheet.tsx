import { useState } from 'react'
import { ArrowUpRightIcon } from './icons'
import { Sheet } from './Sheet'
import type { ItemSummary, SwipeItem } from './types'

interface Props<T extends SwipeItem> {
  open: boolean
  onClose: () => void
  items: T[]
  summarize: (item: T) => ItemSummary
  onRemove: (id: string) => void
  onReset: () => void
}

const isLink = (href?: string) => Boolean(href && href !== '#')

export function SavedSheet<T extends SwipeItem>({
  open,
  onClose,
  items,
  summarize,
  onRemove,
  onReset,
}: Props<T>) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    const text = items
      .map((item) => {
        const s = summarize(item)
        return [s.title, s.aside, isLink(s.href) ? s.href : null].filter(Boolean).join(' — ')
      })
      .join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Saved · ${items.length}`}
      footer={
        <>
          <button className="sk-btn" onClick={onReset}>
            Start over
          </button>
          <button className="sk-btn sk-btn--solid" onClick={copy} disabled={items.length === 0}>
            {copied ? 'Copied' : 'Copy list'}
          </button>
        </>
      }
    >
      {items.length === 0 ? (
        <p className="sk-note">Nothing saved yet. Swipe right on anything you like and it lands here.</p>
      ) : (
        <ul className="sk-saved">
          {items.map((item) => {
            const s = summarize(item)
            return (
              <li key={item.id} className="sk-saved__row">
                <div className="sk-saved__thumb">{s.image && <img src={s.image} alt="" />}</div>
                <div className="sk-saved__text">
                  <strong>{s.title}</strong>
                  {s.subtitle && <span>{s.subtitle}</span>}
                  <div className="sk-saved__links">
                    {isLink(s.href) && (
                      <a href={s.href} target="_blank" rel="noreferrer">
                        View <ArrowUpRightIcon size={13} />
                      </a>
                    )}
                    <button onClick={() => onRemove(item.id)}>Remove</button>
                  </div>
                </div>
                {s.aside && <span className="sk-saved__aside">{s.aside}</span>}
              </li>
            )
          })}
        </ul>
      )}
    </Sheet>
  )
}
