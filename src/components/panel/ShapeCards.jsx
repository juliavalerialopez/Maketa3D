import ShapeCard from '../ui/ShapeCard'

const icon = (children) => (
  <svg className="room-shape-icon" viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
)

// The three cards of Room configuration (K.1.6, K.1.16): Standard and
// L-shape are shapes; Custom is not one but a tool: it turns the Cut tool on
// and off, and shows pressed only while the tool is on, never as the room's
// shape (a room with cut walls has no card chosen).
const CARDS = [
  { value: 'standard', label: 'Standard', title: 'Standard: a rectangle', icon: icon(<rect x="3" y="6" width="18" height="12" rx="1" />) },
  { value: 'l', label: 'L-shape', title: 'L-shape: a rectangle with a corner cut out', icon: icon(<path d="M4 4h16v9h-7v7H4z" />) },
  {
    value: 'custom',
    label: 'Custom',
    title: 'Custom: cut a wall, then drag the pieces',
    // A free outline with a dot on each corner.
    icon: icon(
      <>
        <path d="M5 8l6-4 8 3 1 8-9 4-6-3z" />
        {[[5, 8], [11, 4], [19, 7], [20, 15], [11, 19], [5, 16]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="currentColor" stroke="none" />
        ))}
      </>,
    ),
  },
]

// `shape` is the room's shape ('standard', 'l' or 'custom'); `cutting` is
// whether the Cut tool is on; `cutDisabled` greys Custom out (Walk); `onChoose`
// gets 'standard', 'l' or 'custom' (the panel turns it into the Cut tool).
export default function ShapeCards({ shape, cutting, cutDisabled, onChoose }) {
  return (
    <div className="shape-cards" role="group" aria-label="Room shape">
      {CARDS.map(({ value, ...card }) => (
        <ShapeCard
          key={value}
          {...card}
          pressed={value === 'custom' ? cutting : shape === value}
          disabled={value === 'custom' && cutDisabled}
          onClick={() => onChoose(value)}
        />
      ))}
    </div>
  )
}
