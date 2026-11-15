import { useState } from 'react'
import { useRoomStore } from '../../store/roomStore'
import { MIN_CUT_WALL, roomWalls } from '../../store/roomShape'
import {
  MIN_OPENING_SIZE,
  OPENING_EDGE,
  OPENING_TYPES,
  openingLabel,
  openingsOf,
} from '../../store/openings'
import { useUiStore } from '../../store/uiStore'
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

// What to do while a tool is on.
const TOOL_NOTICES = {
  cut: `Click on a wall where it should be split in two (walls of ${MIN_CUT_WALL} m or more). Esc cancels.`,
  door: 'Click near a wall to place the door. Esc cancels.',
  window: 'Click on a wall where the window starts, then where it ends. Esc cancels.',
}

// Build's Wall tools section (J.8, J.7.1, J.8.1, J.8.2). Cut, Door and
// Window turn a tool on, for any wall: a click splits it in two, places a
// door, or sets where a window starts and then ends. Esc or a second press
// turns it off. The list selects one, whose details follow.
export default function OpeningsSection() {
  const room = useRoomStore((state) => state.room)
  const tool = useUiStore((state) => state.tool)
  const selectedId = useUiStore((state) => state.selectedOpening)
  const openings = openingsOf(room)
  const selected = openings.find((opening) => opening.id === selectedId)

  function toggle(name) {
    useUiStore.getState().setBuildNotice(null)
    useUiStore.getState().setTool(tool === name ? null : name)
  }

  return (
    <div className="field-stack">
      <div className="object-details-actions">
        <Button onClick={() => toggle('cut')} pressed={tool === 'cut'}>
          {SCISSORS_ICON}
          Cut
        </Button>
        <Button onClick={() => toggle('door')} pressed={tool === 'door'}>
          {OPENING_TYPES.door.label}
        </Button>
        <Button onClick={() => toggle('window')} pressed={tool === 'window'}>
          {OPENING_TYPES.window.label}
        </Button>
      </div>
      {tool && <p className="panel-notice">{TOOL_NOTICES[tool]}</p>}
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
