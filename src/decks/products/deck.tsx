import { ArrowUpRightIcon, jsonSource, type DeckConfig } from '../../swipe'
import { ProductCard } from './ProductCard'
import { formatPrice, type Product, type ProductRecord } from './types'
import './products.css'

const SEED = `${import.meta.env.BASE_URL}seed/`

const hasLink = (p: Product) => Boolean(p.href && p.href !== '#')

export const productsDeck: DeckConfig<Product> = {
  id: 'products',
  name: 'Secondhand first',

  source: jsonSource<ProductRecord, Product>(`${SEED}items.json`, (r) => ({
    ...r,
    // Relative image paths resolve against /seed/images/.
    image:
      !r.image || /^(https?:)?\/\//.test(r.image) || r.image.startsWith('/') ? r.image : `${SEED}images/${r.image}`,
    facets: { category: r.category, condition: r.condition },
    tags: r.tags ?? [],
  })),

  actions: {
    left: { label: 'Pass', sentiment: 'negative' },
    right: { label: 'Save', sentiment: 'positive' },
    up: {
      label: 'Open',
      sentiment: 'positive',
      weight: 1.5,
      icon: <ArrowUpRightIcon size={20} />,
      onSwipe: (p) => {
        if (hasLink(p)) window.open(p.href, '_blank', 'noopener,noreferrer')
      },
    },
  },

  facets: [
    { key: 'category', label: 'Category', options: ['Dresses', 'Shoes', 'Bags', 'Accessories', 'Knitwear', 'Beauty'] },
    { key: 'condition', label: 'Condition', options: ['Pre-owned', 'Vintage', 'New'] },
  ],

  // Favor secondhand: pre-owned and vintage pieces get a small head start.
  boost: (p) => (p.condition === 'New' ? 0 : 0.25),

  renderCard: (p) => <ProductCard product={p} />,

  summarize: (p) => ({
    title: p.title,
    subtitle: [p.brand, p.condition, p.source].filter(Boolean).join(' · '),
    image: p.image,
    href: p.href,
    aside: formatPrice(p) || undefined,
  }),
}
