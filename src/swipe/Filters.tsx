import { facetOptions } from './engine'
import { SlidersIcon } from './icons'
import { Sheet } from './Sheet'
import type { Facet, Filters, SwipeItem } from './types'

const optionsFor = (facet: Facet, items: SwipeItem[]) => facet.options ?? facetOptions(items, facet.key)

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

interface ChipsProps {
  facet: Facet
  items: SwipeItem[]
  selected: string[]
  onChange: (values: string[]) => void
  withAll?: boolean
}

export function Chips({ facet, items, selected, onChange, withAll }: ChipsProps) {
  return (
    <>
      {withAll && (
        <button className="sk-chip" aria-pressed={selected.length === 0} onClick={() => onChange([])}>
          All
        </button>
      )}
      {optionsFor(facet, items).map((option) => (
        <button
          key={option}
          className="sk-chip"
          aria-pressed={selected.includes(option)}
          onClick={() => onChange(toggle(selected, option))}
        >
          {option}
        </button>
      ))}
    </>
  )
}

interface BarProps {
  facets: Facet[]
  items: SwipeItem[]
  filters: Filters
  onChange: (key: string, values: string[]) => void
  onRefine: () => void
}

/** The first facet is always one tap away; the rest live in the Refine sheet. */
export function FilterBar({ facets, items, filters, onChange, onRefine }: BarProps) {
  const [primary, ...rest] = facets
  if (!primary) return null
  const secondary = rest.reduce((n, f) => n + (filters[f.key]?.length ?? 0), 0)

  return (
    <nav className="sk-filters" aria-label="Filters">
      <div className="sk-chips" role="group" aria-label={primary.label}>
        <Chips
          facet={primary}
          items={items}
          selected={filters[primary.key] ?? []}
          onChange={(v) => onChange(primary.key, v)}
          withAll
        />
      </div>
      {rest.length > 0 && (
        <button className="sk-refine" onClick={onRefine} aria-label="Refine filters">
          <SlidersIcon size={18} />
          {secondary > 0 && <span className="sk-count">{secondary}</span>}
        </button>
      )}
    </nav>
  )
}

interface SheetProps {
  open: boolean
  onClose: () => void
  facets: Facet[]
  items: SwipeItem[]
  filters: Filters
  matching: number
  onChange: (key: string, values: string[]) => void
  onClear: () => void
}

export function RefineSheet({ open, onClose, facets, items, filters, matching, onChange, onClear }: SheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Refine"
      footer={
        <>
          <button className="sk-btn" onClick={onClear}>
            Clear
          </button>
          <button className="sk-btn sk-btn--solid" onClick={onClose}>
            Show {matching}
          </button>
        </>
      }
    >
      {facets.map((facet) => (
        <fieldset key={facet.key} className="sk-facet">
          <legend>{facet.label}</legend>
          <div className="sk-chips sk-chips--wrap">
            <Chips
              facet={facet}
              items={items}
              selected={filters[facet.key] ?? []}
              onChange={(v) => onChange(facet.key, v)}
            />
          </div>
        </fieldset>
      ))}
    </Sheet>
  )
}
