import { useRef, useState } from 'react'
import { useRoomStore } from '../../store/roomStore'
import { roomWalls } from '../../store/roomShape'
import { MIN_OPENING_SIZE, OPENING_EDGE, freeSpan, openingLabel, openingsOf, widenedOpening } from '../../store/openings'
import { useUiStore } from '../../store/uiStore'
import { beginGesture, endGesture } from '../../store/historyStore'
import NumberField from '../ui/NumberField'
import Button from '../ui/Button'

// One size of the selected opening. While typing, stepping or dragging the
// field, each value that fits is applied at once, so the view follows
// (J.9.1.1); one that does not fit (its wall's ends, another opening, the
// room height) waits in the field. Once final, a value that still does not
// fit is refused: the opening goes back to its size from before the edit,
// and the field shows it. The whole edit is one undo step.
//
// `change(value, start)` (optional) gives what a value changes, worked out
// from `start`, the opening when the edit began; by default only `field`.
function OpeningField({ opening, field, label, min, max, change: changeFor = (value) => ({ [field]: value }) }) {
  const [typed, setTyped] = useState(null)
  const [refusals, setRefusals] = useState(0)
  // The opening when the edit began, to work from and go back to after a refusal.
  const startRef = useRef(opening)

  const apply = (value) => useRoomStore.getState().updateOpening(opening.id, changeFor(value, startRef.current))

  function change(value) {
    setTyped(value)
    if (Math.abs(value - opening[field]) < 1e-9) return
    apply(value)
  }

  function commit(value) {
    setTyped(null)
    if (Math.abs(value - opening[field]) < 1e-9) return
    if (apply(value)) return
    const { offset, width, height, sill } = startRef.current
    useRoomStore.getState().updateOpening(opening.id, { offset, width, height, sill })
    setRefusals((count) => count + 1)
  }

  return (
    <NumberField
      key={refusals}
      label={label}
      value={typed ?? opening[field]}
      onChange={change}
      onCommit={commit}
      onEditStart={() => {
        startRef.current = opening
        beginGesture()
      }}
      onEditEnd={endGesture}
      min={min}
      max={Math.max(min, max)}
      step={0.05}
      unit="m"
    />
  )
}

function removeOpening(id) {
  useRoomStore.getState().removeOpening(id)
  useUiStore.getState().selectOpening(null)
}

// Door or window `id`'s details, in Build (J.8) and Plan (J.9.1): which wall
// it is on, where along it, its size, and Delete (the Delete key too).
// Nothing when it is gone.
export default function OpeningDetails({ id }) {
  const room = useRoomStore((state) => state.room)
  const opening = openingsOf(room).find((item) => item.id === id)
  const wall = opening && roomWalls(room.corners)[opening.wallIndex]
  if (!wall) return null
  const isWindow = opening.type === 'window'
  const span = freeSpan(room, opening)
  return (
    <div className="field-stack">
      <p className="panel-notice">
        {openingLabel(room, opening)}, on wall {opening.wallIndex + 1}
      </p>
      <OpeningField
        opening={opening}
        field="offset"
        label="From wall start"
        min={OPENING_EDGE}
        max={wall.length - OPENING_EDGE - opening.width}
      />
      <OpeningField
        opening={opening}
        field="width"
        label="Width"
        min={MIN_OPENING_SIZE}
        max={span.to - span.from}
        // Against its wall's end or another opening, it grows the other way.
        change={(value, start) => widenedOpening(useRoomStore.getState().room, start, value)}
      />
      <OpeningField
        opening={opening}
        field="height"
        label="Height"
        min={MIN_OPENING_SIZE}
        max={room.height - opening.sill}
      />
      {/* A door always stands on the floor. */}
      {isWindow && (
        <OpeningField opening={opening} field="sill" label="Sill" min={0} max={room.height - opening.height} />
      )}
      <Button onClick={() => removeOpening(opening.id)}>Delete</Button>
    </div>
  )
}
