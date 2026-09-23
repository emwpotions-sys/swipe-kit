import { describe, expect, it } from 'vitest'
import {
  createState,
  decide,
  facetOptions,
  getQueue,
  matches,
  redecide,
  rerank,
  undo,
  type Weigh,
} from './engine'
import type { SwipeItem } from './types'

const items: SwipeItem[] = [
  { id: 'a', tags: ['leather'], facets: { category: 'Shoes', condition: 'New' } },
  { id: 'b', tags: ['silk'], facets: { category: 'Accessories', condition: 'Vintage' } },
  { id: 'c', tags: ['cotton'], facets: { category: 'Knitwear', condition: 'Pre-owned' } },
  { id: 'd', tags: ['silk'], facets: { category: 'Accessories', condition: 'Pre-owned' } },
  { id: 'e', tags: ['leather'], facets: { category: 'Bags', condition: 'Pre-owned' } },
  { id: 'f', tags: ['leather'], facets: { category: 'Shoes', condition: 'Vintage' } },
]
const byId = new Map(items.map((i) => [i.id, i]))
const ids = items.map((i) => i.id)
const weigh: Weigh = (d) => (d === 'left' ? -0.5 : d === 'up' ? 1.5 : 1)
const q = (s: ReturnType<typeof createState>, filters = {}) =>
  getQueue(s, byId, filters).map((i) => i.id)

describe('filters', () => {
  it('treats empty selections as "any"', () => {
    expect(matches(items[0], {})).toBe(true)
    expect(matches(items[0], { category: [] })).toBe(true)
  })

  it('ORs values within a facet and ANDs across facets', () => {
    const f = { category: ['Shoes', 'Bags'], condition: ['Pre-owned', 'Vintage'] }
    expect(getQueue(createState(ids), byId, f).map((i) => i.id)).toEqual(['e', 'f'])
  })

  it('derives facet options in first-seen order', () => {
    expect(facetOptions(items, 'category')).toEqual(['Shoes', 'Accessories', 'Knitwear', 'Bags'])
  })
})

describe('decisions', () => {
  it('removes decided items from the queue and records history', () => {
    const s = decide(decide(createState(ids), 'a', 'right'), 'b', 'left')
    expect(q(s)).toEqual(['c', 'd', 'e', 'f'])
    expect(s.history).toEqual(['a', 'b'])
  })

  it('ignores a second decision on the same item', () => {
    const s1 = decide(createState(ids), 'a', 'right')
    expect(decide(s1, 'a', 'left')).toBe(s1)
  })

  it('undo puts the last card back on top', () => {
    const s = decide(decide(createState(ids), 'a', 'right'), 'c', 'left')
    const [after, restored] = undo(s)
    expect(restored?.id).toBe('c')
    expect(q(after)[0]).toBe('c')
    expect(after.history).toEqual(['a'])
  })

  it('redecide flips a decision without touching history order', () => {
    const s = redecide(decide(createState(ids), 'a', 'right'), 'a', 'left')
    expect(s.decisions.a.direction).toBe('left')
    expect(s.history).toEqual(['a'])
  })

  it('drops persisted decisions for items that no longer exist', () => {
    const s = createState(ids, {
      history: ['a', 'zz'],
      decisions: { a: { id: 'a', direction: 'right', at: 1 }, zz: { id: 'zz', direction: 'left', at: 2 } },
    })
    expect(s.history).toEqual(['a'])
    expect(Object.keys(s.decisions)).toEqual(['a'])
  })
})

describe('ranking', () => {
  it('pulls similar items forward after a positive swipe', () => {
    const s = decide(createState(ids), 'a', 'right') // liked leather shoes
    const ranked = rerank(s, { byId, filters: {}, weigh })
    expect(q(ranked).slice(0, 2)).toEqual(['f', 'e'])
  })

  it('never moves pinned (on-screen) cards', () => {
    const s = decide(createState(ids), 'a', 'right')
    const ranked = rerank(s, { byId, filters: {}, weigh, pinned: 2 })
    expect(q(ranked).slice(0, 2)).toEqual(['b', 'c'])
    expect(q(ranked)[2]).toBe('f')
  })

  it('pushes items like a passed one back', () => {
    const s = decide(createState(ids), 'b', 'left') // passed silk
    const ranked = rerank(s, { byId, filters: {}, weigh })
    expect(q(ranked).at(-1)).toBe('d')
  })

  it('applies a constant boost', () => {
    const boost = (i: SwipeItem) => (i.facets?.condition === 'New' ? -1 : 0)
    const ranked = rerank(createState(ids), { byId, filters: {}, weigh, boost })
    expect(q(ranked).at(-1)).toBe('a')
  })

  it('keeps source order when nothing has been learned', () => {
    expect(q(rerank(createState(ids), { byId, filters: {}, weigh }))).toEqual(ids)
  })
})
