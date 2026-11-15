import { useState } from 'react'
import { useRoomStore } from '../../store/roomStore'
import { roomWalls } from '../../store/roomShape'
import { MIN_OPENING_SIZE, OPENING_EDGE, openingLabel, openingsOf } from '../../store/openings'
import { useUiStore } from '../../store/uiStore'
import { editGesture } from '../../store/historyStore'
import NumberField from '../ui/NumberField'
import Button from '../ui/Button'

// One size of the selected opening. Applied once final, like a wall length,
// since a value in between may not fit; a value that does not fit (its wall's
// ends, another opening, the room height) is refused and the field shows the
// size again.
function OpeningField({ opening, field, label, min, max }) {
  const [typed, setTyped] = useState(null)
  const [refusals, setRefusals] = useState(0)

  function commit(value) {
    setTyped(null)
    if (Math.abs(value - opening[field]) < 1e-9) return
    if (!useRoomStore.getState().updateOpening(opening.id, { [field]: value })) setRefusals((count) => count + 1)
  }

  return (
    <NumberField
      key={refusals}
      label={label}
      value={typed ?? opening[field]}
      onChange={setTyped}
      onCommit={commit}
      {...editGesture}
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
        max={wall.length - OPENING_EDGE - opening.offset}
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
