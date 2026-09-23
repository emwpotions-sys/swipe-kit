import type { Source, SwipeItem } from './types'

/** Items you already have in memory. */
export function arraySource<T extends SwipeItem>(items: T[]): Source<T> {
  return { load: async () => items }
}

/**
 * Items from a JSON file or endpoint. Pass `map` to turn raw records into
 * swipe items (derive facets, tags, resolve image paths, ...).
 */
export function jsonSource<Raw, T extends SwipeItem>(
  url: string,
  map: (raw: Raw, index: number) => T,
): Source<T> {
  return {
    load: async () => {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`)
      const data = (await res.json()) as Raw[] | { items: Raw[] }
      const rows = Array.isArray(data) ? data : data.items
      return rows.map(map)
    },
  }
}

/** Several sources merged into one deck, e.g. multiple resale sites. */
export function mergeSources<T extends SwipeItem>(...sources: Source<T>[]): Source<T> {
  return {
    load: async () => {
      const results = await Promise.allSettled(sources.map((s) => s.load()))
      const seen = new Set<string>()
      const out: T[] = []
      for (const r of results) {
        if (r.status !== 'fulfilled') continue
        for (const item of r.value) {
          if (seen.has(item.id)) continue
          seen.add(item.id)
          out.push(item)
        }
      }
      return out
    },
  }
}
