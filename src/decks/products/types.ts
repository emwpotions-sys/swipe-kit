import type { SwipeItem } from '../../swipe'

/** One row of public/seed/items.json. */
export interface ProductRecord {
  id: string
  title: string
  brand?: string
  /** Omit when unknown; the card just hides the price. */
  price?: number
  currency?: string
  /** File name in seed/images/, or a full https:// URL. Omit to show a typographic card. */
  image?: string
  category: string
  condition: 'Pre-owned' | 'Vintage' | 'New'
  source: string
  details?: string
  href?: string
  tags?: string[]
}

export interface Product extends SwipeItem, ProductRecord {}

/** "$180", "$267.99", or "" when there is no price. */
export const formatPrice = (p: Pick<Product, 'price' | 'currency'>) =>
  p.price === undefined
    ? ''
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: p.currency ?? 'USD',
        minimumFractionDigits: Number.isInteger(p.price) ? 0 : 2,
        maximumFractionDigits: 2,
      }).format(p.price)
