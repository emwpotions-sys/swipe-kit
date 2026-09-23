import { useState } from 'react'
import { formatPrice, type Product } from './types'

export function ProductCard({ product: p }: { product: Product }) {
  const price = formatPrice(p)
  // Remote images can 404 or block hotlinking; fall back to the typographic card.
  const [broken, setBroken] = useState(false)
  const showImage = Boolean(p.image) && !broken

  return (
    <article className="pc">
      <div className="pc__media">
        {showImage ? (
          <img
            src={p.image}
            alt={[p.brand, p.title].filter(Boolean).join(' ')}
            draggable={false}
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="pc__placeholder" aria-hidden="true">
            {p.brand ?? p.title}
          </div>
        )}
        <span className="pc__tag">{p.condition}</span>
      </div>
      <div className="pc__info">
        {p.brand && <span className="pc__brand">{p.brand}</span>}
        <div className="pc__row">
          <h3 className="pc__title">{p.title}</h3>
          {price && <span className="pc__price">{price}</span>}
        </div>
        <div className="pc__row pc__sub">
          <span>{p.details}</span>
          <span>{p.source}</span>
        </div>
      </div>
    </article>
  )
}
