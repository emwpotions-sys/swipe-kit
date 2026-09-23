import { formatPrice, type Product } from './types'

export function ProductCard({ product: p }: { product: Product }) {
  return (
    <article className="pc">
      <div className="pc__media">
        <img src={p.image} alt={p.title} draggable={false} />
        <span className="pc__tag">{p.condition}</span>
      </div>
      <div className="pc__info">
        <div className="pc__row">
          <h3 className="pc__title">{p.title}</h3>
          <span className="pc__price">{formatPrice(p)}</span>
        </div>
        <div className="pc__row pc__sub">
          <span>{p.details}</span>
          <span>{p.source}</span>
        </div>
      </div>
    </article>
  )
}
