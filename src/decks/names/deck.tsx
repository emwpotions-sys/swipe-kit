import { arraySource, type DeckConfig, type SwipeItem } from '../../swipe'
import './names.css'

/**
 * The smallest useful deck: no images, no JSON, no filters.
 * Swipe through name ideas and keep the ones that stick.
 * Open with ?deck=names
 */
interface Name extends SwipeItem {
  word: string
  note: string
  dark: boolean
}

const words: [string, string][] = [
  ['Atlas', 'Carries everything'],
  ['Second', 'For the secondhand-first'],
  ['Parcel', 'Small, well wrapped'],
  ['Common', 'Shared, not ordinary'],
  ['Relay', 'Passed hand to hand'],
  ['North', 'A direction, not a destination'],
  ['Field', 'Room to roam'],
  ['Loop', 'Nothing wasted'],
]

export const namesDeck: DeckConfig<Name> = {
  id: 'names',
  name: 'Name ideas',
  source: arraySource(
    words.map(([word, note], i) => ({ id: word.toLowerCase(), word, note, dark: i % 2 === 1 })),
  ),
  actions: {
    left: { label: 'Nope', sentiment: 'negative' },
    right: { label: 'Keep', sentiment: 'positive' },
  },
  learn: false,
  renderCard: (n) => (
    <div className="nc" data-tone={n.dark ? 'dark' : 'light'}>
      <span className="nc__eyebrow">Name</span>
      <h2 className="nc__word">{n.word}</h2>
      <p className="nc__note">{n.note}</p>
    </div>
  ),
  summarize: (n) => ({ title: n.word, subtitle: n.note }),
}
