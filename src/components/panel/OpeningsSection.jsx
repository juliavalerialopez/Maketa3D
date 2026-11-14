import { useState } from 'react'
import { useRoomStore } from '../../store/roomStore'
import { MIN_CUT_WALL, findWall, roomWalls } from '../../store/roomShape'
import {
  MIN_OPENING_SIZE,
  OPENING_EDGE,
  OPENING_TYPES,
  openingLabel,
  openingsOf,
} from '../../store/openings'
import { BUILD_NOTICES, useUiStore } from '../../store/uiStore'
import { editGesture } from '../../store/historyStore'
import NumberField from '../ui/NumberField'
import Button from '../ui/Button'
import ListItem from '../ui/ListItem'

const SCISSORS_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M8.1 8.1L20 20M8.1 15.9L20 4" />
  </svg>
)

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

// The selected door or window: which wall it is on, where along it, its
// size, and Delete (Delete key too).
function OpeningDetails({ room, opening }) {
  const wall = roomWalls(room.corners)[opening.wallIndex]
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

function removeOpening(id) {
  useRoomStore.getState().removeOpening(id)
  useUiStore.getState().selectOpening(null)
}

// Build's Wall tools section (J.8, J.7.1). Cut waits for a click on any wall,
// where it is split in two; Esc or a second press cancels it. Door and Window
// add one, centred on the selected wall (or the longest one); the list
// selects one, whose details follow.
export default function OpeningsSection() {
  const room = useRoomStore((state) => state.room)
  const cutting = useUiStore((state) => state.cutting)
  const selectedId = useUiStore((state) => state.selectedOpening)
  const selectedWall = useUiStore((state) => state.selectedWall)
  const openings = openingsOf(room)
  const selected = openings.find((opening) => opening.id === selectedId)

  function add(type) {
    const wallIndex = selectedWall ? findWall(room.corners, selectedWall.a, selectedWall.b) : -1
    const result = useRoomStore.getState().addOpening(type, wallIndex)
    const ui = useUiStore.getState()
    if (result.problem) ui.setBuildNotice(BUILD_NOTICES[result.problem])
    else {
      ui.setBuildNotice(null)
      ui.selectOpening(result.id)
    }
  }

  return (
    <div className="field-stack">
      <div className="object-details-actions">
        <Button onClick={() => useUiStore.getState().setCutting(!cutting)} pressed={cutting}>
          {SCISSORS_ICON}
          Cut
        </Button>
        {Object.entries(OPENING_TYPES).map(([type, { label }]) => (
          <Button key={type} onClick={() => add(type)}>
            {label}
          </Button>
        ))}
      </div>
      {cutting && (
        <p className="panel-notice">
          Click on a wall where it should be split in two (walls of {MIN_CUT_WALL} m or more). Esc cancels.
        </p>
      )}
      {openings.length > 0 && (
        <ul className="ui-list">
          {openings.map((opening) => (
            <ListItem
              key={opening.id}
              label={openingLabel(room, opening)}
              selected={opening.id === selectedId}
              onClick={() => useUiStore.getState().selectOpening(opening.id === selectedId ? null : opening.id)}
            />
          ))}
        </ul>
      )}
      {selected && <OpeningDetails key={selected.id} room={room} opening={selected} />}
    </div>
  )
}
