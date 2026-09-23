import type { SwipeItem } from '../../swipe'

/** One row of public/seed/items.json. */
export interface ProductRecord {
  id: string
  title: string
  price: number
  currency?: string
  image: string
  category: string
  condition: 'Pre-owned' | 'Vintage' | 'New'
  source: string
  details?: string
  href?: string
  tags?: string[]
}

export interface Product extends SwipeItem, ProductRecord {}

export const formatPrice = (p: Pick<Product, 'price' | 'currency'>) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: p.currency ?? 'USD',
    maximumFractionDigits: 0,
  }).format(p.price)
