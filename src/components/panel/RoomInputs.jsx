import { ROOM_LIMITS, roomSize, useRoomStore } from '../../store/roomStore'
import { useObjectsStore } from '../../store/objectsStore'
import { editGesture } from '../../store/historyStore'
import NumberField from '../ui/NumberField'

const FIELDS = [
  { key: 'width', label: 'Width' },
  { key: 'depth', label: 'Depth' },
  { key: 'height', label: 'Height' },
]

// Width and depth are the room's size seen from above (J.2: the room is
// corners; until the shape buttons, J.4, these keep it a rectangle).
export default function RoomInputs() {
  const room = useRoomStore((state) => state.room)
  const setRoomSize = useRoomStore((state) => state.setRoomSize)
  const fitToRoom = useObjectsStore((state) => state.fitToRoom)
  const values = { ...roomSize(room), height: room.height }

  // Objects move inside the walls only once a size is final (I.1), never
  // while typing. The store already has the committed size here.
  const fitObjects = () => fitToRoom(useRoomStore.getState().room)

  return (
    <div className="field-stack">
      {FIELDS.map((field) => (
        <NumberField
          key={field.key}
          label={field.label}
          value={values[field.key]}
          onChange={(value) => setRoomSize({ [field.key]: value })}
          onCommit={fitObjects}
          {...editGesture}
          min={ROOM_LIMITS[field.key][0]}
          max={ROOM_LIMITS[field.key][1]}
          unit="m"
        />
      ))}
    </div>
  )
}
