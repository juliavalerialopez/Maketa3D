import ShapeCard from '../ui/ShapeCard'

const icon = (children) => (
  <svg className="room-shape-icon" viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
)

// The three shapes of Room configuration (K.1.6): Standard, L-shape and
// Custom. Custom is not chosen here: it opens Build, where the walls are
// shaped, and shows as chosen while the room is one.
const CARDS = [
  { value: 'standard', label: 'Standard', title: 'Standard: a rectangle', icon: icon(<rect x="3" y="6" width="18" height="12" rx="1" />) },
  { value: 'l', label: 'L-shape', title: 'L-shape: a rectangle with a corner cut out', icon: icon(<path d="M4 4h16v9h-7v7H4z" />) },
  {
    value: 'custom',
    label: 'Custom',
    title: 'Custom: shape the walls in Build',
    dashed: true,
    icon: icon(<path d="M4 6h7v4h9v8H4z" strokeDasharray="3 2.5" />),
  },
]

// `shape` is the room's shape ('standard', 'l' or 'custom'); `onChoose`
// gets 'standard', 'l' or 'custom' (which the panel turns into opening Build).
export default function ShapeCards({ shape, onChoose }) {
  return (
    <div className="shape-cards" role="group" aria-label="Room shape">
      {CARDS.map(({ value, ...card }) => (
        <ShapeCard key={value} {...card} pressed={shape === value} onClick={() => onChoose(value)} />
      ))}
    </div>
  )
}
